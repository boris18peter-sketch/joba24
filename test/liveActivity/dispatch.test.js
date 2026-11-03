import { describe, it, expect } from 'vitest';
import {
  planLiveActivityDispatch,
  snapshotContentKey,
  stateAfterPlan,
  nextRevision,
  shouldInvalidateToken,
  isRetryable,
  TERMINAL_TASK_STATUSES,
} from '../../base44/shared/liveActivityDispatch.ts';
import { buildBackendSnapshot } from '../../base44/shared/liveActivitySnapshot.ts';
import { normalizeConfig, DEFAULT_CONFIG, willContactApns, isPipelineEnabled } from '../../base44/shared/liveActivityConfig.ts';
import { CATEGORY_ROWS, CLIENT, WORKER, STRANGER, NOW, makeTask, openTask, scheduledTask } from './fixtures.js';
import { bannerPresentation, openCardPresentation } from './bannerOracle.js';
import { t } from './labels.js';

/**
 * The dispatch planner is the safety core: it decides whether a recipient's Lock
 * Screen is touched at all. Everything below is the contract Stage 2 will rely
 * on, proven without a single network call.
 */

const ON = normalizeConfig({ enabled: true, dry_run: true });
const OFF = normalizeConfig({ enabled: false });
const ARMED = normalizeConfig({ enabled: true, dry_run: false });

const TZ = 'Asia/Jerusalem';

function snap(task, role, userId, revision = 1) {
  return buildBackendSnapshot({ task, role, userId, categories: CATEGORY_ROWS, settings: {}, timeZone: TZ, revision, now: NOW });
}

describe('disabled means completely inert', () => {
  it('defaults to off, and a missing row is off too', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(false);
    expect(DEFAULT_CONFIG.dry_run).toBe(true);
    expect(isPipelineEnabled(normalizeConfig(null))).toBe(false);
    expect(isPipelineEnabled(normalizeConfig({}))).toBe(false);
  });

  it('requires a literal true — a truthy value does not arm it', () => {
    expect(normalizeConfig({ enabled: 'true' }).enabled).toBe(false);
    expect(normalizeConfig({ enabled: 1 }).enabled).toBe(false);
    expect(normalizeConfig({ enabled: true }).enabled).toBe(true);
  });

  it('never contacts APNs unless BOTH locks are lifted', () => {
    expect(willContactApns(OFF)).toBe(false);
    expect(willContactApns(ON)).toBe(false);
    expect(willContactApns(ARMED)).toBe(true);
  });

  it('plans nothing at all while disabled — not even for a terminal task', () => {
    const task = makeTask({ status: 'COMPLETED' });
    const plan = planLiveActivityDispatch({ task, role: 'worker', userId: WORKER, config: OFF });
    expect(plan.kind).toBe('none');
    expect(plan.decision).toBe('disabled');
    expect(plan.revision).toBeUndefined();
  });
});

describe('recipient authorization on every plan', () => {
  const task = makeTask({ status: 'TAKEN' });

  it('refuses a token bound to a task the user does not own', () => {
    const plan = planLiveActivityDispatch({
      task, role: 'worker', userId: STRANGER, config: ON, snapshot: snap(task, 'worker', STRANGER),
    });
    expect(plan).toMatchObject({ kind: 'none', decision: 'unauthorized' });
    expect(plan.reason).toBe('not_assigned');
  });

  it('refuses a role the task does not support', () => {
    const plan = planLiveActivityDispatch({
      task, role: 'worker', userId: CLIENT, config: ON, snapshot: null,
    });
    expect(plan.decision).toBe('unauthorized');
  });

  it('allows the publisher of an OPEN task', () => {
    const open = openTask(1);
    const plan = planLiveActivityDispatch({
      task: open, role: 'publisher', userId: CLIENT, config: ON, snapshot: snap(open, 'publisher', CLIENT),
    });
    expect(plan).toMatchObject({ kind: 'send', decision: 'send', revision: 1 });
  });
});

describe('ordering: latest state wins', () => {
  const task = makeTask({ status: 'TAKEN', worker_status: 'on_the_way' });
  const snapshot = snap(task, 'worker', WORKER);

  it('starts at revision 1 and increments server-side', () => {
    expect(nextRevision(null)).toBe(1);
    expect(nextRevision({ revision: 4 })).toBe(5);
    expect(nextRevision({ revision: 'x' })).toBe(1);
  });

  it('refuses an event that is not newer than the committed revision', () => {
    for (const eventRevision of [3, 4, 2]) {
      const plan = planLiveActivityDispatch({
        task, role: 'worker', userId: WORKER, config: ON, snapshot, eventRevision,
        state: { revision: 4, content_key: 'other', phase: 'arrived' },
      });
      expect(plan, `event ${eventRevision}`).toMatchObject({ kind: 'none', decision: 'stale_revision' });
    }
  });

  it('accepts a newer event', () => {
    const plan = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: ON, snapshot, eventRevision: 6,
      state: { revision: 5, content_key: 'other', phase: 'arrived' },
    });
    expect(plan.kind).toBe('send');
    expect(plan.revision).toBe(6);
  });

  it('refuses a non-numeric event revision rather than guessing', () => {
    const plan = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: ON, snapshot, eventRevision: 'abc',
      state: { revision: 2 },
    });
    expect(plan).toMatchObject({ kind: 'none', decision: 'stale_revision', reason: 'invalid_revision' });
  });
});

describe('coalescing: an unchanged picture costs nothing', () => {
  const task = makeTask({ status: 'TAKEN', worker_status: 'on_the_way' });

  it('ignores build metadata when comparing content', () => {
    const a = snap(task, 'worker', WORKER, 1);
    const b = buildBackendSnapshot({
      task: { ...task, updated_date: new Date(NOW + 60000).toISOString() },
      role: 'worker', userId: WORKER, categories: CATEGORY_ROWS, settings: {}, timeZone: TZ,
      revision: 9, now: NOW + 60000,
    });
    expect(snapshotContentKey(a)).toBe(snapshotContentKey(b));
  });

  it('skips a duplicate delivery for the same state', () => {
    const snapshot = snap(task, 'worker', WORKER);
    const plan = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: ON, snapshot,
      state: { revision: 3, content_key: snapshotContentKey(snapshot), phase: snapshot.phase },
    });
    expect(plan).toMatchObject({ kind: 'none', decision: 'duplicate' });
  });

  it('sends when the visible content actually changed', () => {
    const before = snap(task, 'worker', WORKER);
    const after = snap({ ...task, worker_status: 'arrived' }, 'worker', WORKER);
    const plan = planLiveActivityDispatch({
      task: { ...task, worker_status: 'arrived' },
      role: 'worker', userId: WORKER, config: ON, snapshot: after,
      state: { revision: 1, content_key: snapshotContentKey(before), phase: before.phase },
    });
    expect(plan.kind).toBe('send');
    expect(plan.revision).toBe(2);
  });

  it('skips when there is no snapshot to show', () => {
    const plan = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: ON, snapshot: null,
    });
    expect(plan).toMatchObject({ kind: 'none', decision: 'no_snapshot' });
  });
});

describe('terminal events come first and happen once', () => {
  it('covers exactly the three terminal statuses', () => {
    expect(TERMINAL_TASK_STATUSES).toEqual(['COMPLETED', 'CANCELLED', 'EXPIRED']);
  });

  for (const status of TERMINAL_TASK_STATUSES) {
    it(`${status} closes the activity, ahead of any pending content update`, () => {
      const task = makeTask({ status });
      const plan = planLiveActivityDispatch({
        task, role: 'worker', userId: WORKER, config: ON,
        snapshot: null,
        state: { revision: 7, content_key: 'previous', phase: 'on_the_way', terminal: false },
      });
      expect(plan.kind).toBe('end');
      expect(plan.decision).toBe('terminal');
      expect(plan.revision).toBe(8);
    });
  }

  it('never closes the same activity twice', () => {
    const task = makeTask({ status: 'COMPLETED' });
    const plan = planLiveActivityDispatch({
      task, role: 'worker', userId: WORKER, config: ON,
      state: { revision: 8, terminal: true },
    });
    expect(plan).toMatchObject({ kind: 'none', decision: 'terminal_already_sent' });
  });
});

describe('persisted state only advances on a real delivery', () => {
  const task = makeTask({ status: 'TAKEN', worker_status: 'arrived' });
  const snapshot = snap(task, 'worker', WORKER);
  const plan = {
    kind: 'send',
    decision: 'send',
    revision: 4,
    contentKey: snapshotContentKey(snapshot),
    snapshot,
  };

  it('writes nothing for a dry run', () => {
    expect(stateAfterPlan({ plan, task, committed: false })).toBeNull();
  });

  it('commits revision, phase and dedupe key after a sent update', () => {
    const fields = stateAfterPlan({ plan, task, committed: true, sent: true, now: NOW });
    expect(fields.revision).toBe(4);
    expect(fields.phase).toBe('arrived');
    expect(fields.content_key).toBe(plan.contentKey);
    expect(fields.terminal).toBe(false);
    expect(fields.last_pushed_at).toBe(new Date(NOW).toISOString());
  });

  it('marks a terminal activity as closed exactly once', () => {
    const terminalTask = makeTask({ status: 'CANCELLED' });
    const fields = stateAfterPlan({
      plan: { kind: 'end', decision: 'terminal', revision: 5 },
      task: terminalTask,
      committed: true,
      sent: true,
      now: NOW,
    });
    expect(fields).toMatchObject({ revision: 5, terminal: true, task_status: 'CANCELLED' });
  });

  it('does not mark a terminal activity closed when nothing was delivered', () => {
    expect(stateAfterPlan({
      plan: { kind: 'end', decision: 'terminal', revision: 5 },
      task: makeTask({ status: 'CANCELLED' }),
      committed: false,
    })).toBeNull();
  });
});

describe('APNs failures are described, never thrown into the app', () => {
  it('retires a rejected token and retries a transient failure', () => {
    expect(shouldInvalidateToken({ invalidateToken: true })).toBe(true);
    expect(shouldInvalidateToken({ category: 'invalid_token' })).toBe(false);
    expect(isRetryable({ retryable: true })).toBe(true);
    expect(isRetryable(undefined)).toBe(false);
  });
});

describe('the backend snapshot says exactly what the app says', () => {
  it('matches the OPEN publisher card, applicant by applicant', () => {
    for (const count of [0, 1, 5]) {
      const task = openTask(count);
      const built = snap(task, 'publisher', CLIENT);
      const oracle = openCardPresentation(task, { t, categoryLabel: 'תחזוקה' });
      expect(built.title, `count ${count}`).toBe(oracle.title);
      expect(built.subtitle).toBe(oracle.subtitle);
      expect(built.phase).toBe(oracle.phase);
    }
  });

  it('matches the active banner for a worker, step by step', () => {
    for (const workerStatus of [null, 'on_the_way', 'arrived', 'done']) {
      const task = makeTask({ status: 'TAKEN', worker_status: workerStatus });
      const built = snap(task, 'worker', WORKER);
      const oracle = bannerPresentation(task, {
        role: 'worker', catRows: CATEGORY_ROWS, now: NOW, t,
      });
      expect(built.title, String(workerStatus)).toBe(oracle.title);
      expect(built.subtitle, String(workerStatus)).toBe(oracle.subtitle);
      expect(built.phase).toBe(oracle.phase);
      expect(built.iconKey).toBe(oracle.iconKey);
      expect(built.colorKey).toBe(oracle.colorKey);
    }
  });

  it('matches the active banner for the publisher side too', () => {
    for (const workerStatus of [null, 'on_the_way', 'arrived', 'done']) {
      const task = makeTask({ status: 'TAKEN', worker_status: workerStatus });
      const built = snap(task, 'publisher', CLIENT);
      const oracle = bannerPresentation(task, {
        role: 'publisher', catRows: CATEGORY_ROWS, now: NOW, t,
      });
      expect(built.title, String(workerStatus)).toBe(oracle.title);
      expect(built.subtitle, String(workerStatus)).toBe(oracle.subtitle);
    }
  });

  it('carries the category label and the canonical progress from the catalogue', () => {
    const task = makeTask({ status: 'TAKEN', worker_status: 'arrived', category: 'dj_service' });
    const built = snap(task, 'worker', WORKER);
    expect(built.categoryLabel).toBe('די.ג׳י לאירוע');
    expect(built.progress.steps.map((s) => s.label)).toEqual(['בדרך לאירוע', 'הציוד מורכב', 'סיימתי את העבודה']);
    expect(built.progress.step).toBe(1);
    expect(built.contractVersion).toBe(1);
    expect(built.deepLink).toContain(task.id);
  });

  it('shows a scheduled task its time, and offers no step action', () => {
    const task = scheduledTask({ status: 'TAKEN' });
    const built = snap(task, 'worker', WORKER);
    expect(built.phase).toBe('scheduled');
    expect(built.title).toBe('מועד מתוכנן');
    expect(built.subtitle).toBe('הביצוע ייפתח סמוך ל-היום, 20:00');
    expect(built.colorKey).toBeNull();
  });

  it('returns null for a terminal task — closure is handled as an event, not content', () => {
    for (const status of TERMINAL_TASK_STATUSES) {
      expect(snap(makeTask({ status }), 'worker', WORKER)).toBeNull();
    }
  });

  it('is frozen, so a consumer cannot mutate a snapshot in place', () => {
    const built = snap(makeTask({ status: 'TAKEN' }), 'publisher', CLIENT);
    expect(Object.isFrozen(built)).toBe(true);
  });
});