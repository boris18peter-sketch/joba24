import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_CONFIG,
  MAX_TEST_USERS,
  normalizeConfig,
  isTestUser,
  testModeActive,
  isTrackedRecipient,
  mayContactApnsFor,
  sendGateFor,
} from '../../base44/shared/liveActivityConfig.ts';
import { dispatchRecipient } from '../../base44/shared/liveActivitySend.ts';
import { buildBackendSnapshot } from '../../base44/shared/liveActivitySnapshot.ts';
import { pickTrackedTask as sharedPickTrackedTask } from '../../base44/shared/taskActivitySnapshot.ts';
import { buildTaskActivitySnapshot, pickTrackedTask as clientPickTrackedTask } from '@/lib/liveActivityContract';
import {
  buildRealSnapshot,
  contentKeyOf,
  planActivityStep,
  selectTrackedTask,
  DEMO_ACTIVITY_TASK_ID,
  isTrackableTask,
  isLiveForRole,
} from '@/lib/realTaskActivity';
import { resolveStatusFlow } from '@/lib/taskStatusFlow';
import { isEngagement, primaryOccurrence, formatOccurrence, scheduleWindows } from '@/lib/scheduling';
import { CATEGORY_ROWS, CLIENT, WORKER, STRANGER, NOW, makeTask } from './fixtures.js';
import { t } from './labels.js';

/**
 * REAL-TASK LIVE ACTIVITY — the restricted rollout.
 *
 * Three things are proven here, in the order they matter:
 *  1. the ALLOWLIST is the only door, and it can arm real APNs for those users
 *     without arming anything for anybody else (the shared sender is executed
 *     against a stub, so this is behaviour and not a reading of the source);
 *  2. the DEVICE decision (start / update / end / nothing) is deterministic and
 *     loop-free, including orphans, restarts and the admin demo;
 *  3. the Lock Screen and the banner say the SAME thing, because the device
 *     snapshot is compared field by field with the server one.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

/** The sender reads its credentials from Deno.env at call time. */
beforeAll(() => {
  globalThis.Deno = { env: { get: () => '' } };
});

const plain = (value) => JSON.parse(JSON.stringify(value));
const TEST_USER = WORKER;

/* ══════════════════════════════════════════════════════════════════════════
   1. THE GATE
   ══════════════════════════════════════════════════════════════════════════ */
describe('the allowlist is the only way in', () => {
  it('ships inert: no ids, no APNs, nothing tracked', () => {
    expect(DEFAULT_CONFIG.test_user_ids).toEqual([]);
    expect(DEFAULT_CONFIG.test_apns).toBe(false);
    expect(testModeActive(normalizeConfig(null))).toBe(false);
    expect(isTrackedRecipient(normalizeConfig(null), WORKER)).toBe(false);
    expect(sendGateFor(normalizeConfig(null), WORKER)).toBe('disabled');
  });

  it('normalizes the list: trimmed, de-duplicated, bounded, literal-only', () => {
    const config = normalizeConfig({
      test_user_ids: [` ${WORKER} `, WORKER, '', null, 42, STRANGER],
      test_apns: 'true',
    });
    expect(config.test_user_ids).toEqual([WORKER, STRANGER]);
    // A string is not a boolean: only a literal `true` may arm real delivery.
    expect(config.test_apns).toBe(false);
    expect(normalizeConfig({ test_apns: 1 }).test_apns).toBe(false);

    const many = Array.from({ length: MAX_TEST_USERS + 5 }, (_, i) => `u_${i}`);
    expect(normalizeConfig({ test_user_ids: many }).test_user_ids).toHaveLength(MAX_TEST_USERS);
  });

  it('arms real APNs for an allowlisted user while the global flag stays off', () => {
    const config = normalizeConfig({ enabled: false, dry_run: true, test_user_ids: [WORKER], test_apns: true });

    expect(isTestUser(config, WORKER)).toBe(true);
    expect(isTrackedRecipient(config, WORKER)).toBe(true);
    expect(mayContactApnsFor(config, WORKER)).toBe(true);
    expect(sendGateFor(config, WORKER)).toBe('armed');

    // …and nobody else is affected in any way.
    expect(isTestUser(config, STRANGER)).toBe(false);
    expect(isTrackedRecipient(config, STRANGER)).toBe(false);
    expect(mayContactApnsFor(config, STRANGER)).toBe(false);
    expect(sendGateFor(config, STRANGER)).toBe('disabled');
  });

  it('keeps an allowlisted user on a dry run until test_apns is switched on', () => {
    const config = normalizeConfig({ test_user_ids: [WORKER], test_apns: false });
    expect(isTrackedRecipient(config, WORKER)).toBe(true);
    expect(mayContactApnsFor(config, WORKER)).toBe(false);
    expect(sendGateFor(config, WORKER)).toBe('dry_run');
  });

  it('leaves a non-allowlisted user exactly where Stage 3 left them', () => {
    const globalOn = normalizeConfig({ enabled: true, dry_run: false });
    expect(sendGateFor(globalOn, STRANGER)).toBe('armed');

    const globalDry = normalizeConfig({ enabled: true, dry_run: true });
    expect(sendGateFor(globalDry, STRANGER)).toBe('dry_run');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. THE SENDER, EXECUTED — per recipient
   ══════════════════════════════════════════════════════════════════════════ */
function stubBase44({ tokens = [], state = null } = {}) {
  const writes = [];
  const reads = [];
  const entities = {
    LiveActivityState: {
      filter: async (query) => { reads.push(['state', query]); return { items: state ? [state] : [] }; },
      create: async (data) => { writes.push(['state.create', data]); return { id: 'state_1' }; },
      update: async (id, data) => { writes.push(['state.update', data]); return { id }; },
    },
    LiveActivityToken: {
      filter: async () => ({ items: tokens }),
      update: async (id, data) => { writes.push(['token.update', data]); return { id }; },
    },
    JobaSettings: { list: async () => ({ items: [{}] }) },
    GlobalCategory: {
      filter: async (query) => ({ items: CATEGORY_ROWS.filter((r) => r.category_key === query?.category_key) }),
    },
    LiveActivityDispatch: {
      create: async (data) => { writes.push(['dispatch.create', data]); return { id: 'dispatch_1' }; },
    },
  };
  return { asServiceRole: { entities }, entities, writes, reads };
}

const TOKEN = {
  id: 'tok_1', user_id: WORKER, token: 'a'.repeat(64), environment: 'development',
  status: 'active', timezone: 'Asia/Jerusalem', bundle_id: 'com.joba24.app',
};

describe('the shared sender refuses recipients the configuration does not cover', () => {
  it('does no work at all for a user outside the allowlist', async () => {
    const base44 = stubBase44({ tokens: [TOKEN] });
    const config = normalizeConfig({ test_user_ids: [TEST_USER], test_apns: false });
    const task = makeTask();

    const result = await dispatchRecipient({
      base44, config, task, role: 'worker', recipientId: STRANGER, mode: 'dispatch',
    });

    expect(result.decision).toBe('disabled');
    expect(result.contactedApns).toBe(false);
    // Refused BEFORE any read: no state lookup, no dispatch row, no token touch.
    expect(base44.reads).toHaveLength(0);
    expect(base44.writes).toHaveLength(0);
  });

  it('plans for an allowlisted user with no device token, and never sends', async () => {
    const base44 = stubBase44({ tokens: [] });
    const config = normalizeConfig({ test_user_ids: [WORKER], test_apns: true });

    const result = await dispatchRecipient({
      base44, config, task: makeTask(), role: 'worker', recipientId: WORKER, mode: 'dispatch',
    });

    expect(result.decision).toBe('no_active_tokens');
    expect(result.contactedApns).toBe(false);
    expect(base44.writes).toHaveLength(0);
  });

  it('records a dry-run attempt for an allowlisted user while test_apns is off', async () => {
    const base44 = stubBase44({ tokens: [TOKEN] });
    const config = normalizeConfig({ test_user_ids: [WORKER], test_apns: false });

    const result = await dispatchRecipient({
      base44, config, task: makeTask(), role: 'worker', recipientId: WORKER, mode: 'dispatch',
    });

    expect(result.decision).toBe('send');
    expect(result.dryRun).toBe(true);
    expect(result.contactedApns).toBe(false);
    // One audit row, and NO committed revision: a dry run must not consume it.
    const kinds = base44.writes.map((w) => w[0]);
    expect(kinds).toEqual(['dispatch.create']);
    expect(base44.writes[0][1].status).toBe('dry_run');
  });

  it('closes a terminal task for an allowlisted recipient', async () => {
    const base44 = stubBase44({ tokens: [TOKEN] });
    const config = normalizeConfig({ test_user_ids: [WORKER], test_apns: false });

    const result = await dispatchRecipient({
      base44, config, task: makeTask({ status: 'COMPLETED' }), role: 'worker', recipientId: WORKER, mode: 'dispatch',
    });

    expect(result.kind).toBe('end');
    expect(result.decision).toBe('terminal');
    expect(base44.writes[0][1].event).toBe('end');
  });

  it('never contacts APNs from a plan, whatever the allowlist says', async () => {
    const base44 = stubBase44({ tokens: [TOKEN] });
    const config = normalizeConfig({ test_user_ids: [WORKER], test_apns: true });

    const result = await dispatchRecipient({
      base44, config, task: makeTask(), role: 'worker', recipientId: WORKER, mode: 'plan',
    });

    expect(result.contactedApns).toBe(false);
    expect(result.dryRun).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. THE DEVICE DECISION
   ══════════════════════════════════════════════════════════════════════════ */
const running = (task, role, activityState = 'active') => ([
  { activityId: `act_${task.id}_${role}`, taskId: task.id, role, activityState, phase: 'on_the_way', revision: 3 },
]);

describe('the device knows exactly what to do', () => {
  it('starts when nothing is showing', () => {
    const task = makeTask();
    const step = planActivityStep({ task, role: 'worker', activities: [], contentKey: 'k1' });
    expect(step).toMatchObject({ action: 'start', taskId: task.id, role: 'worker' });
  });

  it('updates a running card when the content changed', () => {
    const task = makeTask({ worker_status: 'arrived' });
    const step = planActivityStep({ task, role: 'worker', activities: running(task, 'worker'), contentKey: 'k2' });
    expect(step.action).toBe('update');
  });

  it('does nothing when the running card already shows this content', () => {
    const task = makeTask();
    const step = planActivityStep({
      task,
      role: 'worker',
      activities: running(task, 'worker'),
      contentKey: 'k1',
      applied: { taskId: task.id, role: 'worker', contentKey: 'k1' },
    });
    expect(step.action).toBe('none');
    expect(step.reason).toBe('unchanged');
  });

  it('starts again after iOS dismissed the card (restart, reboot, swipe)', () => {
    const task = makeTask();
    for (const activityState of ['ended', 'dismissed']) {
      const step = planActivityStep({ task, role: 'worker', activities: running(task, 'worker', activityState), contentKey: 'k1' });
      expect(step.action).toBe('start');
    }
  });

  it('ends a leftover card for a task that is no longer the tracked one', () => {
    const task = makeTask();
    const other = makeTask();
    const step = planActivityStep({
      task,
      role: 'worker',
      activities: [...running(task, 'worker'), ...running(other, 'worker')],
      contentKey: 'k1',
    });
    expect(step.action).toBe('end');
    expect(step.taskId).toBe(other.id);
  });

  it('ends the card when the task finished or was cancelled', () => {
    // The tracked task disappears from the active list, so the card is an orphan.
    const finished = makeTask({ status: 'COMPLETED' });
    const step = planActivityStep({
      task: null,
      role: null,
      activities: running(finished, 'worker'),
      contentKey: '',
    });
    expect(step.action).toBe('end');
    expect(step.taskId).toBe(finished.id);
  });

  it('never touches the admin demo activity', () => {
    const demo = { activityId: 'demo', taskId: DEMO_ACTIVITY_TASK_ID, role: 'publisher', activityState: 'active' };
    const step = planActivityStep({ task: null, role: null, activities: [demo], contentKey: '' });
    expect(step.action).toBe('none');
  });

  it('does nothing when there is no task and no card', () => {
    expect(planActivityStep({ task: null, role: null, activities: [], contentKey: '' }).action).toBe('none');
  });

  it('treats live statuses as trackable — the applicant stage included', () => {
    expect(isTrackableTask(makeTask({ status: 'TAKEN' }))).toBe(true);
    expect(isTrackableTask(makeTask({ status: 'ON_THE_WAY' }))).toBe(true);
    // OPEN is live work for its PUBLISHER: the applicant stage has a card of its
    // own. That it can never belong to a worker is enforced by ownership (an OPEN
    // task has no worker_id), and pinned in openLifecycle.test.js.
    expect(isTrackableTask(makeTask({ status: 'OPEN' }))).toBe(true);
    expect(isTrackableTask(makeTask({ status: 'COMPLETED' }))).toBe(false);
    expect(isTrackableTask(makeTask({ status: 'CANCELLED' }))).toBe(false);
  });

  /* ────────────────────────────────────────────────────────────────────────
     THE BUG THIS FIXES: "the card disappears when it updates".
     A pass ran while the active-task caches were being rebuilt, so `task` was
     null and the running card was read as an orphan and ended — the card did
     not move on, it vanished. Ending is now allowed only on evidence from the
     card's OWN task.
     ──────────────────────────────────────────────────────────────────────── */
  it('never closes a card whose own task is still live, even with nothing tracked', () => {
    const task = makeTask({ status: 'ON_THE_WAY' });
    const step = planActivityStep({
      task: null,
      role: null,
      activities: running(task, 'worker'),
      contentKey: '',
      verifiedLive: [{ taskId: task.id, role: 'worker' }],
    });
    expect(step.action).toBe('none');
    expect(step.reason).toBe('no_tracked_task');
  });

  it('still closes a card whose task is genuinely over', () => {
    const task = makeTask({ status: 'COMPLETED' });
    const step = planActivityStep({
      task: null,
      role: null,
      activities: running(task, 'worker'),
      contentKey: '',
      // The re-read found nothing live, which is the evidence to close.
      verifiedLive: [],
    });
    expect(step.action).toBe('end');
    expect(step.taskId).toBe(task.id);
  });

  it('keeps one card and closes only the one that is not verified', () => {
    const live = makeTask({ status: 'TAKEN' });
    const stale = makeTask({ status: 'CANCELLED' });
    const step = planActivityStep({
      task: null,
      role: null,
      activities: [...running(live, 'worker'), ...running(stale, 'worker')],
      contentKey: '',
      verifiedLive: [{ taskId: live.id, role: 'worker' }],
    });
    expect(step.action).toBe('end');
    expect(step.taskId).toBe(stale.id);
  });

  it('asks the task, not the cache, whether the work is still this user\'s', () => {
    const task = makeTask({ status: 'IN_PROGRESS' });
    expect(isLiveForRole(task, 'worker', WORKER)).toBe(true);
    expect(isLiveForRole(task, 'publisher', CLIENT)).toBe(true);
    // Same role, somebody else's task — not this device's card to keep.
    expect(isLiveForRole(task, 'worker', STRANGER)).toBe(false);
    expect(isLiveForRole(task, 'publisher', WORKER)).toBe(false);
    // Live record, but the work is over.
    expect(isLiveForRole(makeTask({ status: 'COMPLETED' }), 'worker', WORKER)).toBe(false);
    // The record could not be read at all.
    expect(isLiveForRole(null, 'worker', WORKER)).toBe(false);
  });
});

describe('a card is closed only on the task\'s own evidence', () => {
  it('re-reads the card\'s task before any close, and re-plans with it', () => {
    const bridge = read('src/components/RealTaskActivityBridge.jsx');
    // The verification runs on the END branch, before the step is acted on…
    const endBranch = bridge.indexOf("if (plan.action === 'end')");
    expect(endBranch).toBeGreaterThan(-1);
    expect(bridge.indexOf('verifyLiveCards(activities, me.id)')).toBeGreaterThan(endBranch);
    expect(bridge).toContain('verifiedLive,');
    // …and the decision itself is the shared one, not a second rule.
    expect(bridge).toContain('isLiveForRole(task, card.role, userId)');
    expect(bridge).toContain('base44.entities.Task.get(card.taskId)');
    // Nothing else about the lifecycle moved.
    expect(bridge).not.toContain('activity.update(');
    expect(bridge).not.toContain('Task.update(');
  });

  it('hands the Lock Screen a real https endpoint, not the webview\'s scheme', () => {
    // `window.location.origin` in the native app is `capacitor://localhost`,
    // which URLSession cannot request at all: every tap failed as a network
    // error before a packet left the phone.
    const native = read('src/lib/liveActivityNative.js');
    expect(native).not.toContain('`${window.location.origin}/functions/liveActivityAction`');
    // Only an https origin is accepted; the shell falls back to the public app.
    expect(native).toContain("if (/^https:\\/\\//.test(origin)) return `${origin}/functions/liveActivityAction`");
    expect(native).toContain("'https://joba24.com'");
    expect(native).toContain('endpoint: actionEndpoint(),');
  });
});

describe('which task the device tracks', () => {
  it('prefers the worker side, then the publisher side, and ignores the demo', () => {
    const asWorker = makeTask();
    const asClient = makeTask({ worker_id: STRANGER });
    const picked = selectTrackedTask({ workerTask: asWorker, clientTask: asClient, userId: WORKER });
    expect(picked).toMatchObject({ role: 'worker' });
    expect(picked.task.id).toBe(asWorker.id);

    const clientOnly = selectTrackedTask({ workerTask: null, clientTask: asClient, userId: CLIENT });
    expect(clientOnly).toMatchObject({ role: 'publisher' });

    const demo = { id: DEMO_ACTIVITY_TASK_ID, status: 'TAKEN', worker_id: WORKER, client_id: CLIENT };
    expect(selectTrackedTask({ workerTask: demo, clientTask: null, userId: WORKER })).toBeNull();
  });

  it('is the same rule the server uses', () => {
    const tasks = [
      makeTask(),
      makeTask({ worker_id: STRANGER }),
      makeTask({ status: 'COMPLETED' }),
      makeTask({ status: 'OPEN', worker_id: null, client_id: STRANGER }),
    ];
    for (const userId of [WORKER, CLIENT, STRANGER]) {
      const client = clientPickTrackedTask(tasks, userId);
      const server = sharedPickTrackedTask(tasks, userId);
      expect(client?.role).toBe(server?.role);
      expect(client?.task?.id).toBe(server?.task?.id);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. THE LOCK SCREEN SAYS WHAT THE BANNER SAYS
   ══════════════════════════════════════════════════════════════════════════ */
describe('a real task produces the same snapshot on both ends', () => {
  const WINDOWS = scheduleWindows({});

  const serverSnapshot = (task, role, userId, revision = 1) => buildBackendSnapshot({
    task, role, userId, categories: CATEGORY_ROWS, settings: {}, timeZone: 'Asia/Jerusalem', revision, now: NOW,
  });

  const clientSnapshot = (task, role, userId, revision = 1) => buildRealSnapshot({
    task, role, userId, t, catRows: CATEGORY_ROWS, settings: {}, revision, now: NOW,
  });

  const cases = [
    ['worker', 'TAKEN', null],
    ['worker', 'TAKEN', 'on_the_way'],
    ['worker', 'TAKEN', 'arrived'],
    ['worker', 'TAKEN', 'done'],
    ['publisher', 'TAKEN', null],
    ['publisher', 'TAKEN', 'on_the_way'],
    ['publisher', 'TAKEN', 'arrived'],
    ['publisher', 'TAKEN', 'done'],
  ];

  for (const [role, status, workerStatus] of cases) {
    it(`${role} / ${status} / ${workerStatus || 'none'} matches`, () => {
      const userId = role === 'worker' ? WORKER : CLIENT;
      const task = makeTask({ status, worker_status: workerStatus, category: 'events' });

      const a = plain(serverSnapshot(task, role, userId));
      const b = plain(clientSnapshot(task, role, userId));
      delete a.generatedAt;
      delete b.generatedAt;

      expect(b).toEqual(a);
      expect(contentKeyOf(b)).toBe(contentKeyOf(a));
    });
  }

  it('a scheduled engagement keeps its planned-time wording on the device', () => {
    const task = makeTask({
      category: 'events',
      scheduled_time: new Date(NOW + 30 * 3600 * 1000).toISOString(),
      schedule_agreed_at: new Date(NOW - 3600 * 1000).toISOString(),
    });
    const engagement = isEngagement(task, NOW, WINDOWS);
    const occurrence = engagement ? primaryOccurrence(task, NOW) : null;
    const client = plain(clientSnapshot(task, 'publisher', CLIENT));
    const server = plain(buildTaskActivitySnapshot({
      task, role: 'publisher', userId: CLIENT,
      flow: resolveStatusFlow(task.category, CATEGORY_ROWS),
      schedule: { isEngagement: engagement, occurrenceLabel: occurrence ? formatOccurrence(occurrence) : '' },
      t, categoryLabel: 'אירועים', now: NOW, revision: 1,
    }));
    delete client.generatedAt;
    delete server.generatedAt;
    expect(client).toEqual(server);
  });

  it('refuses to build a snapshot for a task that is not yours', () => {
    expect(clientSnapshot(makeTask(), 'worker', STRANGER)).toBeNull();
    expect(clientSnapshot(makeTask({ status: 'COMPLETED' }), 'worker', WORKER)).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. WIRING — the real lifecycle, without touching the business rules
   ══════════════════════════════════════════════════════════════════════════ */
describe('the real task lifecycle is wired, and nothing else moved', () => {
  it('mounts the bridge once, in the app shell', () => {
    const app = read('src/App.jsx');
    expect(app).toContain("import RealTaskActivityBridge from '@/components/RealTaskActivityBridge'");
    expect(app).toContain('<RealTaskActivityBridge />');
    expect(app.match(/<RealTaskActivityBridge \/>/g)).toHaveLength(1);
  });

  it('watches the same caches the banner renders', () => {
    const bridge = read('src/components/RealTaskActivityBridge.jsx');
    expect(bridge).toContain("['activeWorkerTask'");
    expect(bridge).toContain("['activeClientTask'");
    expect(bridge).toContain("action: 'access'");
  });

  it('leaves ActiveTaskBanner itself completely alone', () => {
    const banner = read('src/components/ActiveTaskBanner.jsx');
    expect(banner.toLowerCase()).not.toContain('liveactivity');
    // …and the shared completion/approval path is untouched by this feature.
    const completion = read('base44/shared/taskCompletion.ts');
    expect(completion.toLowerCase()).not.toContain('liveactivity');
  });

  it('dispatches from a Task entity event through the shared sender', () => {
    const workflow = read('base44/workflows/Live Activity Real Task Dispatch.jsonc');
    expect(workflow).toContain('"entity_name": "Task"');
    expect(workflow).toContain('"function_name": "liveActivityTaskEvent"');

    const fn = read('base44/functions/liveActivityTaskEvent/entry.ts');
    expect(fn).toContain('dispatchRecipient');
    expect(fn).toContain("mode: 'dispatch'");
    expect(fn).toContain('isTrackedRecipient');
    expect(fn).toContain('TERMINAL_TASK_STATUSES');
    // It may read a task; it may never change one.
    expect(fn).not.toMatch(/entities\.Task\.(update|create|deleteMany|updateMany)/);
  });

  it('refuses every device call from a user who is not allowlisted', () => {
    const fn = read('base44/functions/liveActivityRealTask/entry.ts');
    expect(fn).toContain('isTestUser(config, user.id)');
    expect(fn).toContain('not_allowlisted');
    expect(fn).toContain('base44.asServiceRole.entities.Task.get');
    expect(fn).not.toMatch(/entities\.Task\.(update|create|deleteMany|updateMany)/);
    // The identity is the session, never a body field.
    expect(fn).not.toMatch(/body\??\.user_id/);
  });

  it('keeps the admin demo separate and working', () => {
    const page = read('src/pages/LiveActivityTest.jsx');
    expect(page).toContain('<LiveActivityTestPanel />');
    expect(page).toContain('<RealTaskDiagnostics />');

    // Both listen for the push token; the bridge must not steal the demo's
    // listener (that was a single-subscriber regression waiting to happen).
    const native = read('src/lib/liveActivityNative.js');
    expect(native).toContain('tokenSubscribers');
    expect(native).not.toContain('tokenListenerAttached');
  });

  it('declares the two test fields and the device-event entity', () => {
    const config = read('base44/entities/LiveActivityConfig.jsonc');
    expect(config).toContain('"test_user_ids"');
    expect(config).toContain('"test_apns"');

    const device = read('base44/entities/LiveActivityDeviceEvent.jsonc');
    expect(device).toContain('"started"');
    expect(device).toContain('"ended"');
  });
});