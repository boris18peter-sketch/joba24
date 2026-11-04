import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

import { buildLiveActivityPush } from '../../base44/shared/liveActivityApns.ts';
import {
  planLiveActivityDispatch,
  stateAfterPlan,
} from '../../base44/shared/liveActivityDispatch.ts';
import {
  claimDispatchRevision,
  recordDispatchOutcome,
  CLAIM_TTL_MS,
} from '../../base44/shared/liveActivitySend.ts';
import { asListPayload } from '../../src/lib/listPayload.js';

/**
 * Resilience regressions for the three release blockers.
 *
 * Everything here is a pure decision or a source-level contract; nothing reaches
 * APNs, the database or an iPhone. The behaviours asserted are the ones the two
 * production symptoms depended on:
 *
 *   • a completed task's card must be DISMISSED immediately, not four hours later;
 *   • two dispatches for the same revision must not both push;
 *   • every dispatch outcome leaves an audit row, including the ones that never
 *     reached Apple (no token, skipped, duplicate, stale);
 *   • a read-only observer must never write a queryFn onto a shared query key.
 */

const NOW = 1_700_000_000_000;
const PUBLISHER = 'user_publisher';
const WORKER = 'user_worker';

const SNAPSHOT = {
  contractVersion: 1,
  id: 'task_1',
  role: 'publisher',
  phase: 'awaiting_start',
  title: 'העובד בדרך',
  subtitle: 'תתעדכן כאן',
  categoryLabel: 'הובלה',
  categoryKey: 'moving',
  iconKey: 'truck',
  colorKey: 'brand',
  revision: 1,
};

/** A publisher snapshot for one worker step — the visible fields the key uses. */
const progressSnapshot = (phase, step) => ({
  contractVersion: 1,
  id: 'task_1',
  role: 'publisher',
  phase,
  title: `title-${phase}`,
  subtitle: `sub-${phase}`,
  categoryLabel: 'הובלה',
  categoryKey: 'moving',
  iconKey: 'truck',
  colorKey: 'brand',
  progress: { step, total: 3, steps: [{ key: 'a', label: 'A', icon: 'i' }] },
  counters: { applicants: 0 },
});

const liveTask = (over = {}) => ({
  id: 'task_1',
  status: 'TAKEN',
  client_id: PUBLISHER,
  worker_id: WORKER,
  category: 'moving',
  ...over,
});

const doneTask = (over = {}) => liveTask({ status: 'COMPLETED', worker_status: 'done', ...over });

/* ══════════════════════════════════════════════════════════════════════════
   A fake entity surface with real compare-and-set semantics
   ══════════════════════════════════════════════════════════════════════════ */
function makeStateStore(initial = []) {
  let rows = initial.map((row) => ({ ...row }));
  let seq = 100;
  const matches = (row, query) => Object.entries(query || {}).every(([key, value]) => row[key] === value);

  return {
    rows: () => rows,
    async create(data) {
      const row = { id: `row_${seq++}`, ...data };
      rows.push(row);
      return row;
    },
    async updateMany(query, operation) {
      let updated = 0;
      for (const row of rows) {
        if (!matches(row, query)) continue;
        Object.assign(row, operation.$set);
        updated += 1;
      }
      return { updated };
    },
    async filter(query) {
      return { items: rows.filter((row) => matches(row, query)) };
    },
    async delete(id) {
      rows = rows.filter((row) => row.id !== id);
      return { ok: true };
    },
  };
}

const stateClient = (store) => ({ asServiceRole: { entities: { LiveActivityState: store } } });

/* ══════════════════════════════════════════════════════════════════════════
   1. IMMEDIATE DISMISSAL
   ══════════════════════════════════════════════════════════════════════════ */
describe('the end event dismisses the card immediately', () => {
  it('sends dismissal-date 0, not a time four hours away', () => {
    const push = buildLiveActivityPush({ snapshot: SNAPSHOT, event: 'end', now: NOW });
    expect(push.aps.event).toBe('end');
    // 0 = dismiss now. Any future timestamp leaves an ended card on the Lock
    // Screen for up to four hours, which is the reported symptom.
    expect(push.aps['dismissal-date']).toBe(0);
    expect(push.aps['dismissal-date']).toBeLessThan(Math.floor(NOW / 1000));
  });

  it('does not put a dismissal into a content update', () => {
    const push = buildLiveActivityPush({ snapshot: SNAPSHOT, event: 'update', now: NOW });
    expect(push.aps['dismissal-date']).toBeUndefined();
    expect(push.aps['stale-date']).toBe(Math.floor((NOW + 30 * 60000) / 1000));
  });

  it('ends BOTH sides of a completed task, exactly once each', () => {
    const task = doneTask();
    for (const [role, userId] of [['publisher', PUBLISHER], ['worker', WORKER]]) {
      const first = planLiveActivityDispatch({
        task,
        role,
        userId,
        config: { enabled: true },
        state: { revision: 4, terminal: false },
        snapshot: null,
        now: NOW,
      });
      expect(first.kind).toBe('end');
      expect(first.decision).toBe('terminal');
      expect(first.revision).toBe(5);

      // Once committed, a late or repeated event cannot send a second end.
      const again = planLiveActivityDispatch({
        task,
        role,
        userId,
        config: { enabled: true },
        state: { revision: 5, terminal: true },
        snapshot: null,
        now: NOW,
      });
      expect(again.kind).toBe('none');
      expect(again.decision).toBe('terminal_already_sent');
    }
  });

  it('cannot be replaced by a stale update after the end', () => {
    const plan = planLiveActivityDispatch({
      task: doneTask(),
      role: 'publisher',
      userId: PUBLISHER,
      config: { enabled: true },
      state: { revision: 5, terminal: true },
      snapshot: progressSnapshot('done', 2),
      eventRevision: 4,
      now: NOW,
    });
    expect(plan.kind).toBe('none');
  });

  it('writes nothing into the state when the end was not delivered', () => {
    const plan = planLiveActivityDispatch({
      task: doneTask(),
      role: 'publisher',
      userId: PUBLISHER,
      config: { enabled: true },
      state: { revision: 4, terminal: false },
      snapshot: null,
      now: NOW,
    });
    // A dry run / failed send must not consume the terminal slot, or the card
    // could never be closed once delivery was possible again.
    expect(stateAfterPlan({ plan, task: doneTask(), committed: false, sent: false, now: NOW })).toBeNull();
    const committed = stateAfterPlan({ plan, task: doneTask(), committed: true, sent: true, now: NOW });
    expect(committed.terminal).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. THE PUBLISHER SEES EVERY WORKER TRANSITION, IN ORDER
   ══════════════════════════════════════════════════════════════════════════ */
describe('publisher card keeps up with the worker', () => {
  it('sends a distinct push for every progress step and never goes backwards', () => {
    const steps = [
      ['awaiting_start', 0],
      ['on_the_way', 1],
      ['arrived', 2],
      ['done', 3],
    ];

    let state = { revision: 0, terminal: false, content_key: '', phase: '' };
    const sent = [];

    for (const [phase, step] of steps) {
      const snapshot = progressSnapshot(phase, step);
      const plan = planLiveActivityDispatch({
        task: liveTask(),
        role: 'publisher',
        userId: PUBLISHER,
        config: { enabled: true },
        state,
        snapshot,
        now: NOW,
      });
      expect(plan.kind).toBe('send');
      sent.push(plan);
      state = {
        revision: plan.revision,
        terminal: false,
        content_key: plan.contentKey,
        phase: snapshot.phase,
      };
    }

    // Every transition produced a push…
    expect(sent).toHaveLength(steps.length);
    // …each with a revision strictly greater than the previous one…
    const revisions = sent.map((plan) => plan.revision);
    expect(revisions).toEqual([...revisions].sort((a, b) => a - b));
    expect(new Set(revisions).size).toBe(steps.length);
    // …and every one of them was visibly different from the last.
    expect(new Set(sent.map((plan) => plan.contentKey)).size).toBe(steps.length);
  });

  it('refuses an event older than the committed revision', () => {
    const plan = planLiveActivityDispatch({
      task: liveTask(),
      role: 'publisher',
      userId: PUBLISHER,
      config: { enabled: true },
      state: { revision: 7, terminal: false, content_key: 'x', phase: 'arrived' },
      snapshot: progressSnapshot('on_the_way', 1),
      eventRevision: 6,
      now: NOW,
    });
    expect(plan.kind).toBe('none');
    expect(plan.decision).toBe('stale_revision');
  });

  it('still allows a re-worded snapshot at an equal revision', () => {
    const plan = planLiveActivityDispatch({
      task: liveTask(),
      role: 'publisher',
      userId: PUBLISHER,
      config: { enabled: true },
      state: { revision: 7, terminal: false, content_key: 'old-words', phase: 'arrived' },
      snapshot: progressSnapshot('arrived', 2),
      eventRevision: 7,
      now: NOW,
    });
    expect(plan.kind).toBe('send');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   3. ONE PUSH PER REVISION UNDER CONCURRENCY
   ══════════════════════════════════════════════════════════════════════════ */
describe('concurrent dispatches for the same revision', () => {
  it('lets exactly one run own the revision', async () => {
    const store = makeStateStore([{
      id: 'state_1', user_id: PUBLISHER, task_id: 'task_1', role: 'publisher',
      revision: 4, claim_id: '', terminal: false,
    }]);
    const base44 = stateClient(store);
    // Both runners read revision 4 before either committed — the real interleaving.
    const preRead = { id: 'state_1', revision: 4, claim_id: '' };
    const claim = () => claimDispatchRevision(base44, {
      state: preRead,
      recipientId: PUBLISHER,
      taskId: 'task_1',
      role: 'publisher',
      targetRevision: 5,
      now: NOW,
    });

    const [a, b] = await Promise.all([claim(), claim()]);

    expect([a.claimed, b.claimed].filter(Boolean)).toHaveLength(1);
    const loser = a.claimed ? b : a;
    expect(loser.reason).toBe('concurrent_dispatch');
    expect(store.rows()[0].revision).toBe(5);
  });

  it('lets a newer revision through immediately afterwards', async () => {
    const store = makeStateStore([{
      id: 'state_1', user_id: PUBLISHER, task_id: 'task_1', role: 'publisher',
      revision: 5, claim_id: '', terminal: false,
    }]);
    const base44 = stateClient(store);
    const next = await claimDispatchRevision(base44, {
      state: { id: 'state_1', revision: 5, claim_id: '' },
      recipientId: PUBLISHER,
      taskId: 'task_1',
      role: 'publisher',
      targetRevision: 6,
      now: NOW,
    });
    expect(next.claimed).toBe(true);
    expect(store.rows()[0].revision).toBe(6);
  });

  it('backs off while another run holds a fresh claim', async () => {
    const store = makeStateStore([{
      id: 'state_1', user_id: PUBLISHER, task_id: 'task_1', role: 'publisher',
      revision: 5, claim_id: 'other', claim_at: new Date(NOW - 1000).toISOString(), terminal: false,
    }]);
    const base44 = stateClient(store);
    const claim = await claimDispatchRevision(base44, {
      state: store.rows()[0],
      recipientId: PUBLISHER,
      taskId: 'task_1',
      role: 'publisher',
      targetRevision: 6,
      now: NOW,
    });
    expect(claim.claimed).toBe(false);
    expect(claim.reason).toBe('claim_in_flight');
  });

  it('takes over a claim from an interrupted run', async () => {
    const store = makeStateStore([{
      id: 'state_1', user_id: PUBLISHER, task_id: 'task_1', role: 'publisher',
      revision: 5, claim_id: 'crashed', claim_at: new Date(NOW - CLAIM_TTL_MS - 1000).toISOString(), terminal: false,
    }]);
    const base44 = stateClient(store);
    const claim = await claimDispatchRevision(base44, {
      state: store.rows()[0],
      recipientId: PUBLISHER,
      taskId: 'task_1',
      role: 'publisher',
      targetRevision: 6,
      now: NOW,
    });
    expect(claim.claimed).toBe(true);
  });

  it('keeps ONE state row when two runs both find none', async () => {
    const store = makeStateStore([]);
    const base44 = stateClient(store);
    const claim = () => claimDispatchRevision(base44, {
      state: null,
      recipientId: PUBLISHER,
      taskId: 'task_1',
      role: 'publisher',
      targetRevision: 1,
      now: NOW,
    });

    const [a, b] = await Promise.all([claim(), claim()]);
    expect([a.claimed, b.claimed].filter(Boolean)).toHaveLength(1);
    expect(store.rows()).toHaveLength(1);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. AUDIT — every outcome, no secrets
   ══════════════════════════════════════════════════════════════════════════ */
describe('dispatch audit rows', () => {
  const capture = async (input) => {
    const created = [];
    const base44 = {
      asServiceRole: {
        entities: {
          LiveActivityDispatch: {
            async create(row) { created.push(row); return row; },
          },
        },
      },
    };
    await recordDispatchOutcome(base44, input);
    return created[0];
  };

  it('records a no-token outcome with a timestamp and a reason', async () => {
    const row = await capture({
      recipientId: PUBLISHER,
      taskId: 'task_1',
      role: 'publisher',
      revision: 4,
      decision: 'no_active_tokens',
      status: 'skipped',
      reason: 'no_activity_token',
      environment: 'production',
    });
    expect(row.status).toBe('skipped');
    expect(row.decision).toBe('no_active_tokens');
    expect(row.reason).toBe('no_activity_token');
    expect(row.environment).toBe('production');
    expect(typeof row.dispatched_at).toBe('string');
    expect(Number.isNaN(Date.parse(row.dispatched_at))).toBe(false);
    // Only the row id may identify a token — never the hex value.
    expect(row.token).toBeUndefined();
    expect(row.token_id).toBeUndefined();
  });

  it('records a skipped recipient and a duplicate', async () => {
    const skipped = await capture({ recipientId: 'someone', taskId: 't', role: 'worker', decision: 'skipped', reason: 'recipient_not_tracked' });
    expect(skipped.reason).toBe('recipient_not_tracked');
    const duplicate = await capture({ recipientId: PUBLISHER, taskId: 't', role: 'publisher', decision: 'duplicate', reason: 'concurrent_dispatch' });
    expect(duplicate.reason).toBe('concurrent_dispatch');
  });

  it('never writes a row without an identity', async () => {
    expect(await capture({ taskId: 't', role: 'worker' })).toBeUndefined();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   5. LIST PAYLOADS — guaranteed shape, reported anomalies
   ══════════════════════════════════════════════════════════════════════════ */
describe('list payloads', () => {
  it('passes arrays through untouched', () => {
    const rows = [{ id: 'a' }];
    expect(asListPayload(rows, 'test')).toBe(rows);
  });

  it('accepts the documented paged envelope', () => {
    expect(asListPayload({ items: [{ id: 'a' }] }, 'test')).toEqual([{ id: 'a' }]);
  });

  it('treats missing data as an empty list, quietly', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(asListPayload(null, 'test')).toEqual([]);
    expect(asListPayload(undefined, 'test')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('REPORTS an unexpected shape instead of hiding it', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // This is the exact value that used to reach `T.find(...)` and crash the app.
    expect(asListPayload({ error: 'nope' }, 'myPublishedTasks')).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain('myPublishedTasks');
    expect(String(spy.mock.calls[0][0])).toContain('object{error}');
    spy.mockRestore();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   6. SOURCE CONTRACTS
   ══════════════════════════════════════════════════════════════════════════ */
const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');

describe('the Live Activity bridge cannot corrupt a shared query', () => {
  const bridge = read('../../src/components/RealTaskActivityBridge.jsx');

  it('registers no null-returning query function', () => {
    expect(bridge).not.toMatch(/queryFn:\s*\(\s*\)\s*=>\s*null/);
    expect(bridge).not.toMatch(/enabled:\s*false,\s*\n\s*staleTime/);
  });

  it('reads the cache instead', () => {
    expect(bridge).toContain('useCachedQueryValues([');
    expect(bridge).toContain("['activeWorkerTask', me?.id]");
    expect(bridge).toContain('myPublishedTasksQuery(me?.id).queryKey');
  });

  it('unsubscribes the cache listener', () => {
    const hook = read('../../src/hooks/useCachedQueryValues.js');
    expect(hook).toContain('getQueryCache().subscribe');
    expect(hook).toContain('return unsubscribe');
  });

  it('keeps every canonical list query normalised', () => {
    const queries = read('../../src/lib/queries.js');
    for (const select of ['asPublishedTasks', 'asWorkerTasks', 'asMyApplications', 'asPendingApplications', 'asOpenTasks']) {
      expect(queries).toContain(`select: ${select},`);
    }
  });
});

describe('server wiring', () => {
  it('reconciles a card as soon as its token is registered', () => {
    const entry = read('../../base44/functions/registerLiveActivityToken/entry.ts');
    expect(entry).toContain('reconcileAfterRegistration');
    expect(entry).toContain('dispatchRecipient');
    expect(entry).toContain("plan.record.kind === 'start'");
  });

  it('audits recipients the rollout gate excluded', () => {
    const entry = read('../../base44/functions/liveActivityTaskEvent/entry.ts');
    expect(entry).toContain('recordDispatchOutcome');
    expect(entry).toContain('recipient_not_tracked');
  });

  it('leaves the rollout disabled and the allowlist untouched', () => {
    const shared = read('../../base44/shared/liveActivityConfig.ts');
    // Defaults stay inert: nothing in this change can turn delivery on.
    expect(shared).toMatch(/enabled:\s*false/);
    expect(shared).toMatch(/dry_run:\s*true/);
    expect(shared).toMatch(/test_apns:\s*false/);
  });
});