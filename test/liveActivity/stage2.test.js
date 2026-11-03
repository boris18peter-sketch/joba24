import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  planObservation,
  observationRecipients,
  revisionFromTask,
  sendGate,
  retentionCutoffMs,
  recipientKey,
  OBSERVED_EVENTS,
} from '../../base44/shared/liveActivityObserve.ts';
import { normalizeConfig, DEFAULT_CONFIG } from '../../base44/shared/liveActivityConfig.ts';
import {
  CATEGORY_ROWS, CLIENT, WORKER, STRANGER, NOW,
  makeTask, openTask, scheduledTask,
} from './fixtures.js';

const HOUR = 3600 * 1000;
const at = (hoursAgo) => new Date(NOW - hoursAgo * HOUR).toISOString();

/**
 * The diagnostic config as Stage 2 ships it: observation ON, sending OFF.
 * `enabled: false` throughout the suite is the point — every "send" below is a
 * WOULD-SEND that the real configuration would still refuse.
 */
const BASE = normalizeConfig({ diagnostic_events: true });

function observe({ task, event = 'update', lastByRecipient = {}, config = BASE, tokens = [], hints = {} } = {}) {
  return planObservation({
    task,
    event,
    config,
    lastByRecipient,
    categories: CATEGORY_ROWS,
    settings: {},
    tokens,
    hints,
    now: NOW,
  }).rows;
}

/** Remember a row the way the entry function does: per user AND role. */
function remember(rows, memory = {}) {
  const next = { ...memory };
  for (const row of rows) next[recipientKey(row.user_id, row.role)] = row;
  return next;
}

/** Run a sequence of events, threading the recorded rows back as memory. */
function runSequence(steps, config = BASE) {
  let lastByRecipient = {};
  const out = [];
  for (const step of steps) {
    const rows = observe({ ...step, lastByRecipient, config });
    out.push(rows);
    lastByRecipient = remember(rows, lastByRecipient);
  }
  return out;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ══════════════════════════════════════════════════════════════════════════
   1. Publisher — OPEN
   ══════════════════════════════════════════════════════════════════════════ */
describe('publisher / OPEN sequence', () => {
  const published = (applicants, hoursAgo) => openTask(applicants, { updated_date: at(hoursAgo) });

  it('walks published → applications → withdrawals, recording each step', () => {
    const steps = runSequence([
      { task: published(0, 3), event: 'create' },
      { task: published(1, 2), event: 'update' },
      { task: published(2, 1.5), event: 'update' },
      { task: published(1, 1), event: 'update' },
    ]);

    // One recipient only: an OPEN task has no worker yet.
    for (const rows of steps) {
      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('publisher');
      expect(rows[0].user_id).toBe(CLIENT);
      expect(rows[0].phase).toBe('open');
      expect(rows[0].apns_contacted).toBe(false);
    }

    // Nobody applied yet — the card's own scanning line, not new copy.
    expect(steps[0][0].decision).toBe('send');
    expect(steps[0][0].title).toBe('מאותת לעובדים');
    expect(steps[0][0].subtitle).toBe('המשימה נחשפת לעובדים באזור');
    expect(steps[0][0].applicants).toBe(0);

    // Every real applicant-count change is a new picture.
    expect(steps[1][0].title).toBe('1 מועמדויות · לחץ לצפייה ואישור');
    expect(steps[1][0].applicants).toBe(1);
    expect(steps[1][0].decision).toBe('send');

    expect(steps[2][0].title).toBe('2 מועמדויות · לחץ לצפייה ואישור');
    expect(steps[2][0].applicants).toBe(2);
    expect(steps[2][0].decision).toBe('send');

    // A withdrawal moves the count back down and must be shown, not ignored.
    expect(steps[3][0].applicants).toBe(1);
    expect(steps[3][0].decision).toBe('send');
  });

  it('records a repeated event for an unchanged task as a duplicate, not a push', () => {
    const task = published(2, 1);
    const first = observe({ task, event: 'update' });
    const again = observe({ task, event: 'update', lastByRecipient: remember(first) });

    expect(first[0].decision).toBe('send');
    expect(again[0].decision).toBe('duplicate');
    expect(again[0].kind).toBe('none');
    expect(again[0].next_revision).toBeNull();
  });

  // FINDING, recorded rather than hidden: the Stage 0 content key includes the
  // view/click counters, so a view landing on an OPEN task plans as a would-send
  // even though the visible line is unchanged. Stage 2 records it (that is what
  // it is for); whether Stage 3 should suppress it is a decision for the lock
  // screen's content, not something to change quietly here.
  it('records a viewer/click count change as a content change in the shared contract', () => {
    const base = published(1, 1);
    const first = observe({ task: base, event: 'update' });
    const viewed = observe({
      task: { ...base, views_count: 41, clicks_count: 7 },
      lastByRecipient: remember(first),
    });
    expect(viewed[0].decision).toBe('send');
    expect(viewed[0].title).toBe(first[0].title);
    expect(viewed[0].content_key).not.toBe(first[0].content_key);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. Publisher — TAKEN
   ══════════════════════════════════════════════════════════════════════════ */
describe('publisher / TAKEN sequence', () => {
  const taken = (over) => makeTask({ worker_status: null, ...over });

  it('walks worker assigned → on the way → arrived → done → approved', () => {
    const steps = runSequence([
      { task: taken({ updated_date: at(5) }), event: 'update' },
      { task: taken({ worker_status: 'on_the_way', updated_date: at(4) }), event: 'update' },
      { task: taken({ worker_status: 'arrived', updated_date: at(3) }), event: 'update' },
      { task: taken({ worker_status: 'done', updated_date: at(2) }), event: 'update' },
      { task: taken({ status: 'COMPLETED', worker_status: 'done', updated_date: at(1) }), event: 'update' },
    ]);

    expect(steps[0].map((r) => r.role).sort()).toEqual(['publisher', 'worker']);
    const pub = steps.map((rows) => rows.find((r) => r.role === 'publisher'));

    expect(pub[0].phase).toBe('awaiting_start');
    expect(pub[0].title).toBe('ממתין לעדכון העובד');
    expect(pub[1].phase).toBe('on_the_way');
    // The category flow's own owner-facing label, exactly as the banner shows it.
    expect(pub[1].title).toBe('בדרך אליך');
    expect(pub[2].phase).toBe('arrived');
    expect(pub[2].subtitle).toBe('העבודה בעיצומה');
    expect(pub[3].phase).toBe('done');
    // The flow's owner-facing "done" step label, as the banner shows it.
    expect(pub[3].title).toBe('ממתין לאישורך');

    // Completion is a CLOSE, exactly once.
    expect(pub[4].kind).toBe('end');
    expect(pub[4].decision).toBe('terminal');
    expect(pub[4].phase).toBe('terminal');
    expect(pub[4].terminal).toBe(true);

    expect(pub.every((r) => r.decision !== 'duplicate')).toBe(true);
  });

  it('shows an agreed time instead of a step for a scheduled task', () => {
    const rows = observe({
      task: scheduledTask({ updated_date: at(1) }),
      event: 'update',
    });
    const pub = rows.find((r) => r.role === 'publisher');
    expect(pub.phase).toBe('scheduled');
    expect(pub.subtitle).not.toContain('{when}');
    expect(pub.subtitle).not.toBe('');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. Worker — TAKEN
   ══════════════════════════════════════════════════════════════════════════ */
describe('worker / TAKEN sequence', () => {
  it('walks assigned → on the way → arrived → done → completion', () => {
    const steps = runSequence([
      { task: makeTask({ worker_status: null, updated_date: at(5) }), event: 'update' },
      { task: makeTask({ worker_status: 'on_the_way', updated_date: at(4) }), event: 'update' },
      { task: makeTask({ worker_status: 'arrived', updated_date: at(3) }), event: 'update' },
      { task: makeTask({ worker_status: 'done', updated_date: at(2) }), event: 'update' },
      { task: makeTask({ status: 'CANCELLED', worker_status: 'done', updated_date: at(1) }), event: 'update' },
    ]);

    const w = steps.map((rows) => rows.find((r) => r.role === 'worker'));

    expect(w[0].user_id).toBe(WORKER);
    expect(w[0].phase).toBe('awaiting_start');
    expect(w[0].title).toBe('יצאת לדרך');
    expect(w[1].phase).toBe('on_the_way');
    expect(w[1].subtitle).toBe('לחץ/י "הגעתי" כשתגיע');
    expect(w[2].phase).toBe('arrived');
    expect(w[3].phase).toBe('done');
    expect(w[3].subtitle).toBe('המפרסם יאשר את הסיום');

    expect(w[4].kind).toBe('end');
    expect(w[4].reason).toBe('task_deleted'.replace('task_deleted', '') || '');
    expect(w[4].decision).toBe('terminal');
  });

  it('keeps the worker wording for a category that overrides its steps', () => {
    const rows = observe({
      task: makeTask({ category: 'dj_service', worker_status: 'arrived', updated_date: at(1) }),
      event: 'update',
    });
    expect(rows.find((r) => r.role === 'worker').title).toBe('הציוד מורכב');
    expect(rows.find((r) => r.role === 'publisher').title).toBe('הדי.ג׳י באירוע');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. Terminal events
   ══════════════════════════════════════════════════════════════════════════ */
describe('terminal events close once', () => {
  for (const status of ['COMPLETED', 'CANCELLED', 'EXPIRED']) {
    it(`${status} produces one close per recipient and never repeats it`, () => {
      const first = observe({ task: makeTask({ status, updated_date: at(2) }), event: 'update' });
      expect(first).toHaveLength(2);
      expect(first.every((r) => r.kind === 'end' && r.decision === 'terminal')).toBe(true);
      expect(first.every((r) => r.terminal === true)).toBe(true);

      const again = observe({ task: makeTask({ status, updated_date: at(1) }), event: 'update', lastByRecipient: remember(first) });
      expect(again.every((r) => r.decision === 'terminal_already_sent')).toBe(true);
      expect(again.every((r) => r.kind === 'none')).toBe(true);
    });
  }

  it('records a deleted task as a close, using the event payload only as a labelled hint', () => {
    const rows = observe({
      task: null,
      event: 'delete',
      hints: { task_id: 'task_gone', client_id: CLIENT, worker_id: WORKER, status: 'CANCELLED' },
    });

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.decision === 'terminal' && r.kind === 'end')).toBe(true);
    expect(rows.every((r) => r.source === 'trigger_hint')).toBe(true);
    expect(rows.every((r) => r.reason === 'task_deleted')).toBe(true);
    expect(rows.every((r) => r.apns_contacted === false)).toBe(true);
    expect(rows.find((r) => r.role === 'publisher').user_id).toBe(CLIENT);
    expect(rows.find((r) => r.role === 'worker').user_id).toBe(WORKER);

    const again = observe({
      task: null,
      event: 'delete',
      hints: { task_id: 'task_gone', client_id: CLIENT, worker_id: WORKER },
      lastByRecipient: remember(rows),
    });
    expect(again.every((r) => r.decision === 'terminal_already_sent')).toBe(true);
  });

  it('records nothing when a deleted task carries no recipients', () => {
    expect(observe({ task: null, event: 'delete', hints: { task_id: 'x' } })).toHaveLength(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. Security and role validation
   ══════════════════════════════════════════════════════════════════════════ */
describe('recipients are derived from the record, never from a claim', () => {
  it('only ever observes the publisher of an OPEN task', () => {
    const rows = observe({ task: openTask(3, { updated_date: at(1) }), event: 'update' });
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(CLIENT);
    expect(rows.some((r) => r.user_id === STRANGER)).toBe(false);
  });

  it('never observes a user who is not on the task', () => {
    const recipients = observationRecipients({
      task: makeTask({ updated_date: at(1) }),
      config: BASE,
      hints: { client_id: STRANGER, worker_id: STRANGER },
    });
    expect(recipients.map((r) => r.userId)).not.toContain(STRANGER);
    expect(recipients.map((r) => r.role)).toEqual(['publisher', 'worker']);
    expect(recipients.every((r) => r.source === 'entity_event')).toBe(true);
  });

  it('respects the tracking toggles, and closes both sides regardless of them', () => {
    const off = normalizeConfig({ diagnostic_events: true, track_taken_worker: false });
    const live = observe({ task: makeTask({ updated_date: at(1) }), config: off });
    expect(live.map((r) => r.role)).toEqual(['publisher']);

    const closed = observe({ task: makeTask({ status: 'COMPLETED', updated_date: at(1) }), config: off });
    expect(closed.map((r) => r.role).sort()).toEqual(['publisher', 'worker']);
  });

  it('records the real send gate, so a planned send is never mistaken for a sent one', () => {
    const rows = observe({ task: makeTask({ updated_date: at(1) }) });
    expect(rows.every((r) => r.send_gate === 'disabled')).toBe(true);
    expect(rows.every((r) => r.apns_contacted === false)).toBe(true);
    expect(rows.every((r) => r.decision === 'send')).toBe(true);

    expect(sendGate({ enabled: false, dry_run: false })).toBe('disabled');
    expect(sendGate({ enabled: true, dry_run: true })).toBe('dry_run');
    expect(sendGate({ enabled: true, dry_run: false })).toBe('armed');
  });

  it('reports zero registered devices while no native build exists', () => {
    const rows = observe({ task: makeTask({ updated_date: at(1) }) });
    expect(rows.every((r) => r.device_tokens === 0)).toBe(true);

    const withToken = observe({
      task: makeTask({ updated_date: at(1) }),
      tokens: [{ user_id: CLIENT, status: 'active', environment: 'development', timezone: 'Asia/Jerusalem' }],
    });
    expect(withToken.find((r) => r.role === 'publisher').device_tokens).toBe(1);
    expect(withToken.find((r) => r.role === 'worker').device_tokens).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   6. Ordering, duplication and rapid transitions
   ══════════════════════════════════════════════════════════════════════════ */
describe('the latest authoritative state wins', () => {
  it('refuses an observation derived from an older task version', () => {
    const newer = makeTask({ worker_status: 'arrived', updated_date: at(1) });
    const recorded = observe({ task: newer, event: 'update' });

    const stale = observe({
      task: makeTask({ worker_status: 'on_the_way', updated_date: at(9) }),
      event: 'update',
      lastByRecipient: remember(recorded),
    });

    expect(stale.every((r) => r.decision === 'stale_revision')).toBe(true);
    expect(stale.every((r) => r.kind === 'none')).toBe(true);
    expect(stale.every((r) => r.reason === 'record_older_than_last_observation')).toBe(true);
  });

  it('handles a rapid burst of transitions with strictly increasing revisions', () => {
    const steps = runSequence([
      { task: makeTask({ worker_status: 'on_the_way', updated_date: at(0.5) }) },
      { task: makeTask({ worker_status: 'arrived', updated_date: at(0.4) }) },
      { task: makeTask({ worker_status: 'done', updated_date: at(0.3) }) },
    ]);

    const revisions = steps.map((rows) => rows.find((r) => r.role === 'worker').revision);
    expect(revisions[0]).toBeLessThan(revisions[1]);
    expect(revisions[1]).toBeLessThan(revisions[2]);

    const nextRevisions = steps.map((rows) => rows.find((r) => r.role === 'worker').next_revision);
    expect(nextRevisions[0]).toBeLessThan(nextRevisions[1]);
    expect(nextRevisions[1]).toBeLessThan(nextRevisions[2]);

    expect(steps.every((rows) => rows.every((r) => r.decision === 'send'))).toBe(true);
  });

  it('derives revision from the record, monotonically and without storage', () => {
    const older = revisionFromTask({ updated_date: at(3) });
    const newer = revisionFromTask({ updated_date: at(1) });
    expect(older).toBeLessThan(newer);
    expect(revisionFromTask({ created_date: at(2) })).toBe(revisionFromTask({ created_date: at(2) }));
    expect(revisionFromTask(null)).toBe(1);
  });

  it('keeps a reassignment distinct from the state it replaces', () => {
    const first = observe({ task: makeTask({ updated_date: at(2) }) });
    const reassigned = observe({
      task: makeTask({ worker_id: 'user_worker_2', worker_name: 'דני', updated_date: at(1) }),
      event: 'update',
      lastByRecipient: remember(first),
    });

    const workerRow = reassigned.find((r) => r.role === 'worker');
    expect(workerRow.user_id).toBe('user_worker_2');
    expect(workerRow.decision).toBe('send');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   7. Stage 2 cannot contact Apple, and cannot touch notifications
   ══════════════════════════════════════════════════════════════════════════ */
describe('diagnostics are inert by construction', () => {
  it('never performs a network request, even across a full sequence', () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchSpy);

    runSequence([
      { task: openTask(0, { updated_date: at(3) }), event: 'create' },
      { task: openTask(2, { updated_date: at(2) }), event: 'update' },
      { task: makeTask({ status: 'TAKEN', updated_date: at(1.5) }), event: 'update' },
      { task: makeTask({ worker_status: 'on_the_way', updated_date: at(1) }), event: 'update' },
      { task: makeTask({ status: 'COMPLETED', updated_date: at(0.5) }), event: 'update' },
      { task: null, event: 'delete', hints: { client_id: CLIENT, worker_id: WORKER } },
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('imports no APNs, notification or HTTP path in either Stage 2 file', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const files = [
      resolve(here, '../../base44/shared/liveActivityObserve.ts'),
      resolve(here, '../../base44/functions/liveActivityObserve/entry.ts'),
    ];
    const forbidden = [
      'liveActivityApns',
      'sendLiveActivityPush',
      'buildLiveActivityPush',
      'SendPushNotification',
      'notificationManager',
      'notifyTask',
      'sendPushNotification',
      'fcm',
      'fetch(',
    ];

    // Comments are stripped first: both files EXPLAIN what they must never
    // import, and naming a forbidden thing in prose is not using it.
    const stripComments = (src) => src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|\s)\/\/[^\n]*/g, ' ');

    for (const file of files) {
      const source = stripComments(readFileSync(file, 'utf8')).toLowerCase();
      for (const needle of forbidden) {
        expect(source.includes(needle.toLowerCase()), `${file} must not reference ${needle}`).toBe(false);
      }
    }
  });

  it('never writes anything but a diagnostic row (no task, state or token mutation)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(here, '../../base44/functions/liveActivityObserve/entry.ts'), 'utf8');
    // Every entity call in the entry function is a read, except the diagnostic
    // create and the retention sweep — both on LiveActivityEvent only.
    expect(source).not.toMatch(/entities\.Task\.(update|delete|updateMany|deleteMany)/);
    expect(source).not.toMatch(/entities\.LiveActivityState/);
    expect(source).not.toMatch(/entities\.LiveActivityToken\.(create|update|delete)/);
    expect(source).toMatch(/entities\.LiveActivityEvent\s*\n?\s*\.create/);
  });

  it('ships the observer wired to Task events and to nothing else', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(resolve(here, '../../base44/workflows/Live Activity Diagnostic Observer.jsonc'), 'utf8');
    const wf = JSON.parse(raw);

    expect(wf.trigger.config.trigger_type).toBe('entity');
    expect(wf.trigger.config.entity_name).toBe('Task');
    expect(wf.trigger.config.events.sort()).toEqual(['create', 'delete', 'update']);

    const steps = wf.definition.do;
    expect(steps).toHaveLength(1);
    const step = steps[0].observe_task_event;
    expect(step.call).toBe('invoke_backend_function');
    expect(step.with.function_name).toBe('liveActivityObserve');
    expect(step.with.args.task_id).toBe('${ .trigger.entity_id }');
    expect(step.with.args.event_type).toBe('${ .trigger.event_type }');
    expect(step.then).toBe('end');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   8. Configuration switches and retention
   ══════════════════════════════════════════════════════════════════════════ */
describe('diagnostic switches', () => {
  it('defaults to observation off and sending off', () => {
    const config = normalizeConfig(null);
    expect(config.diagnostic_events).toBe(false);
    expect(config.enabled).toBe(false);
    expect(config.dry_run).toBe(true);
    expect(DEFAULT_CONFIG.diagnostic_retention_days).toBe(7);
  });

  it('only a literal true enables observation', () => {
    expect(normalizeConfig({ diagnostic_events: true }).diagnostic_events).toBe(true);
    expect(normalizeConfig({ diagnostic_events: 'true' }).diagnostic_events).toBe(false);
    expect(normalizeConfig({ diagnostic_events: 1 }).diagnostic_events).toBe(false);
  });

  it('caps retention so the table can never become an archive', () => {
    expect(normalizeConfig({ diagnostic_retention_days: 999 }).diagnostic_retention_days).toBe(30);
    expect(normalizeConfig({ diagnostic_retention_days: 0 }).diagnostic_retention_days).toBe(7);
    expect(normalizeConfig({ diagnostic_retention_days: 3 }).diagnostic_retention_days).toBe(3);
    expect(retentionCutoffMs({ diagnostic_retention_days: 7 }, NOW)).toBe(NOW - 7 * 86400000);
  });

  it('keeps observation and sending as two independent locks', () => {
    const observeOnly = normalizeConfig({ diagnostic_events: true, enabled: false, dry_run: true });
    expect(observeOnly.diagnostic_events).toBe(true);
    expect(sendGate(observeOnly)).toBe('disabled');

    const sendOnly = normalizeConfig({ diagnostic_events: false, enabled: true, dry_run: false });
    expect(sendOnly.diagnostic_events).toBe(false);
    expect(sendGate(sendOnly)).toBe('armed');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   9. Legacy statuses the app still reads
   ══════════════════════════════════════════════════════════════════════════ */
describe('legacy live statuses are observed too', () => {
  for (const status of ['APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS']) {
    it(`${status} is observed for both sides`, () => {
      const rows = observe({
        task: makeTask({ status, worker_status: 'on_the_way', updated_date: at(1) }),
        event: 'update',
      });
      expect(rows.map((r) => r.role).sort()).toEqual(['publisher', 'worker']);
      expect(rows.every((r) => r.kind === 'send')).toBe(true);
      expect(rows.every((r) => r.phase === 'on_the_way')).toBe(true);
    });
  }

  it('accepts every event name the workflow may send', () => {
    expect(OBSERVED_EVENTS).toEqual(['create', 'update', 'delete']);
    const rows = observe({ task: makeTask({ updated_date: at(1) }), event: 'weird' });
    expect(rows.every((r) => r.event_type === 'update')).toBe(true);
  });
});