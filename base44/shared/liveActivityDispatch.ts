/**
 * liveActivityDispatch — ordering, coalescing and duplicate protection.
 *
 * ── THE GUARANTEES ─────────────────────────────────────────────────────────
 *  1. Disabled means inert: with the flag off nothing is built, planned, written
 *     or sent. The first check in `planLiveActivityDispatch` is the flag.
 *  2. Latest state wins: revisions are server-owned and monotonic. A lower or
 *     equal revision is refused, so a late delivery can never overwrite newer
 *     state.
 *  3. Duplicates cost nothing: an identical presentational payload is skipped,
 *     so repeated triggers for an unchanged task produce no push.
 *  4. Terminal beats everything: COMPLETED / CANCELLED / EXPIRED produce exactly
 *     one `end` event, and it takes priority over any pending content update.
 *  5. Nothing here can throw into a caller's task mutation. Every consumer in
 *     Stage 2 wraps this in `waitUntil(...)` and a try/catch, and the planner is
 *     a pure function that returns decisions rather than rejecting.
 *
 * No business action is ever replayed: dispatch is one-way (task state → the
 * Lock Screen). A retry re-sends a snapshot; it never approves, completes,
 * pays, refunds or assigns anything.
 */
import { authorizeActivity } from './taskActivitySnapshot.ts';

/** Statuses after which a Live Activity must close. */
export const TERMINAL_TASK_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

const iso = (ms) => new Date(ms).toISOString();

/** The next server-owned revision for a recipient. */
export function nextRevision(state) {
  const current = Number(state?.revision);
  return (Number.isFinite(current) && current > 0 ? Math.floor(current) : 0) + 1;
}

/**
 * A canonical string of everything that is VISIBLE in a snapshot. Two snapshots
 * with the same key would render identically, which is what makes a push
 * redundant. Deliberately excludes `generatedAt`, `revision` and `updatedAt`:
 * those change on every build and are not content.
 */
export function snapshotContentKey(snapshot) {
  if (!snapshot) return '';
  return JSON.stringify({
    v: snapshot.contractVersion,
    phase: snapshot.phase,
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    categoryLabel: snapshot.categoryLabel,
    categoryKey: snapshot.categoryKey,
    iconKey: snapshot.iconKey,
    colorKey: snapshot.colorKey,
    endsAt: snapshot.endsAt,
    progress: {
      step: snapshot.progress?.step,
      total: snapshot.progress?.total,
      steps: (snapshot.progress?.steps || []).map((s) => [s.key, s.label, s.icon]),
    },
    counters: snapshot.counters || null,
  });
}

function skip(decision, extra: any = {}) {
  return { kind: 'none', decision, ...extra };
}

/**
 * Decide what (if anything) should be dispatched for one recipient.
 *
 * @param task         the STORED Task — the authority, never a client copy
 * @param role         'publisher' | 'worker'
 * @param userId       the authenticated recipient
 * @param config       normalized LiveActivityConfig
 * @param state        the stored LiveActivityState for (user, task, role), or null
 * @param snapshot     the built snapshot (null when not trackable)
 * @param eventRevision optional revision carried by an incoming event; an
 *                      out-of-order event is refused instead of applied
 */
export function planLiveActivityDispatch(input) {
  const {
    task,
    role,
    userId,
    config,
    state = null,
    snapshot = null,
    eventRevision = null,
    now = Date.now(),
  } = input || {};

  // 1. The flag, before anything else. Disabled = no work at all.
  if (config?.enabled !== true) return skip('disabled');

  if (!task || !task.id) return skip('task_missing');

  const base = { userId, taskId: task.id, role, at: iso(now) };

  // 2. A terminal event is the highest priority state a recipient can reach.
  //    `authorizeActivity` only authorizes LIVE tracking, so ownership is
  //    verified directly against the record here — a stranger can never close
  //    somebody else's activity.
  if (TERMINAL_TASK_STATUSES.includes(task.status)) {
    const owns = role === 'worker' ? task.worker_id === userId : task.client_id === userId;
    if (!owns) {
      return { ...base, ...skip('unauthorized', { reason: role === 'worker' ? 'not_assigned' : 'not_owner' }) };
    }
    if (state?.terminal) return { ...base, ...skip('terminal_already_sent') };
    return { ...base, kind: 'end', decision: 'terminal', revision: nextRevision(state) };
  }

  const auth = authorizeActivity(task, role, userId);
  if (!auth.ok) return { ...base, ...skip('unauthorized', { reason: auth.reason }) };

  // 3. Refuse an event that is not newer than what was already committed.
  if (eventRevision != null && state) {
    const incoming = Number(eventRevision);
    const committed = Number(state.revision) || 0;
    if (!Number.isFinite(incoming)) return { ...base, ...skip('stale_revision', { reason: 'invalid_revision' }) };
    if (incoming <= committed) return { ...base, ...skip('stale_revision') };
  }

  if (!snapshot) return { ...base, ...skip('no_snapshot') };

  // 4. Coalescing: an unchanged picture is not worth a push.
  const contentKey = snapshotContentKey(snapshot);
  if (state && state.content_key === contentKey && state.phase === snapshot.phase) {
    return { ...base, ...skip('duplicate') };
  }

  return {
    ...base,
    kind: 'send',
    decision: 'send',
    revision: nextRevision(state),
    contentKey,
    snapshot,
  };
}

/**
 * The state fields to persist after a decision.
 *
 * `committed` is false for a dry run on purpose: a dry run must not advance the
 * revision or the dedupe key, otherwise switching the flag on afterwards would
 * suppress the first real update with a "duplicate".
 */
export function stateAfterPlan(input) {
  const { plan, task, committed = false, sent = false, now = Date.now() } = input || {};
  if (!plan || plan.kind === 'none') return null;
  // Nothing is committed unless something was really delivered. A dry run or a
  // failed attempt must not consume the revision, or the first real push after
  // enabling would be suppressed as a duplicate.
  if (!committed) return null;
  const at = iso(now);

  if (plan.kind === 'end') {
    return {
      revision: plan.revision,
      terminal: true,
      terminal_at: at,
      task_status: task?.status || '',
      last_event_at: at,
      last_pushed_at: sent ? at : null,
      last_decision: sent ? 'sent' : (committed ? 'terminal' : 'dry_run'),
    };
  }

  if (!committed) return null;

  return {
    revision: plan.revision,
    phase: plan.snapshot.phase,
    content_key: plan.contentKey,
    task_status: task?.status || '',
    terminal: false,
    last_event_at: at,
    last_pushed_at: sent ? at : null,
    last_decision: sent ? 'sent' : 'dry_run',
  };
}

/** A rejected token is retired for good; task state is never touched by it. */
export function shouldInvalidateToken(apnsResult) {
  return apnsResult?.invalidateToken === true;
}

/** Is this failure worth another attempt later? */
export function isRetryable(apnsResult) {
  return apnsResult?.retryable === true;
}