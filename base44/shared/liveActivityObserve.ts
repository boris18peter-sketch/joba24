/**
 * liveActivityObserve — Stage 2: turn real Task events into DIAGNOSTIC plans.
 *
 * ── WHAT THIS MODULE IS, AND IS NOT ────────────────────────────────────────
 * It is the decision half of Stage 2: given one authoritative Task record and the
 * last observation already recorded for each role, it produces the rows a
 * diagnostic run should store — what phase the task is in, which revision the
 * task state carries, and what the dispatcher WOULD have decided.
 *
 * It is NOT a sender. This module deliberately imports no APNs module, no HTTP
 * client and no notification/FCM helper: there is no code path from here to
 * Apple, and `test/liveActivity/stage2.test.js` asserts that both as a behaviour
 * (an injected fetch is never called) and as a source-level invariant.
 *
 * ── WHY IT RE-PLANS WITH `enabled: true` ───────────────────────────────────
 * The Stage 1 planner short-circuits to `disabled` the moment the master flag is
 * off — correct for a sender, useless for a diagnostic whose whole job is to
 * report what WOULD happen. So the planner is called with a PLANNING config
 * (`enabled: true`) that exists only inside this function, and the real gate is
 * recorded separately in `send_gate` ('disabled' | 'dry_run' | 'armed') so the
 * operator can always see whether a real push would have been permitted.
 *
 * ── ORDERING IS STRUCTURAL, NOT GUESSED ────────────────────────────────────
 * Every observation starts by re-reading the stored Task (the entry function
 * does that), so a late or duplicated event can never resurrect old content: the
 * plan is computed from CURRENT truth. `revision` is derived from the record's
 * own `updated_date`, which makes it monotonic per task, and a row whose
 * revision is older than the last recorded one is labelled `stale_revision`
 * instead of being written as if it were news.
 */
import { buildBackendSnapshot } from './liveActivitySnapshot.ts';
import { planLiveActivityDispatch, snapshotContentKey, TERMINAL_TASK_STATUSES } from './liveActivityDispatch.ts';
import { isRoleTracked } from './liveActivityConfig.ts';
import { DEFAULT_TIMEZONE, isValidTimeZone } from './liveActivityFlow.ts';

/** The only events the observer understands. */
export const OBSERVED_EVENTS = ['create', 'update', 'delete'];

/** Who reported the recipient: the stored record, or the event payload. */
export const OBSERVATION_SOURCES = ['entity_event', 'trigger_hint'];

/**
 * The memory key for one recipient.
 *
 * Keyed by USER as well as role on purpose: a reassignment replaces the worker,
 * and the new worker's activity has never been shown to them, so comparing it
 * against the previous worker's picture would wrongly call it a duplicate.
 */
export function recipientKey(userId, role) {
  return `${userId || ''}|${role || ''}`;
}

/**
 * The task-state version, derived from the record itself.
 *
 * Epoch SECONDS (not ms) of the last update, so it is a compact monotonic
 * integer that only moves forward when the task really changes. It is derived,
 * never stored, which is what lets a diagnostic run stay read-only.
 */
export function revisionFromTask(task) {
  const ms = Date.parse(String(task?.updated_date || task?.created_date || '')) || 0;
  return Math.max(1, Math.floor(ms / 1000));
}

/** What the REAL configuration would allow a sender to do right now. */
export function sendGate(config) {
  if (config?.enabled !== true) return 'disabled';
  return config?.dry_run === false ? 'armed' : 'dry_run';
}

/** The recipient's own timezone, if this device is registered for this environment. */
function timeZoneFor(tokens, userId, config) {
  const row = (tokens || []).find((t) => t
    && t.user_id === userId
    && t.status === 'active'
    && (!t.environment || t.environment === config?.environment));
  const zone = row?.timezone;
  return isValidTimeZone(zone) ? zone : DEFAULT_TIMEZONE;
}

function activeTokenCount(tokens, userId, config) {
  return (tokens || []).filter((t) => t
    && t.user_id === userId
    && t.status === 'active'
    && (!t.environment || t.environment === config?.environment)).length;
}

/**
 * Who should be observed for this event.
 *
 * Recipients are taken from the STORED record — `client_id` is the publisher,
 * `worker_id` is the worker — never from the request. The single exception is a
 * deletion, where the record no longer exists; there the event's own payload is
 * the only evidence of who was tracking it, and such a row is labelled
 * `trigger_hint` so the distinction is visible forever.
 */
export function observationRecipients({ task, config, hints = {} }: any = {}) {
  if (!task) {
    const out = [];
    if (hints.client_id) out.push({ userId: hints.client_id, role: 'publisher', source: 'trigger_hint' });
    if (hints.worker_id) out.push({ userId: hints.worker_id, role: 'worker', source: 'trigger_hint' });
    return out;
  }

  const out = [];
  const terminal = TERMINAL_TASK_STATUSES.includes(task.status);

  if (terminal) {
    // A finished task closes for BOTH sides regardless of the tracking toggles:
    // a stale Lock Screen outlives the work, and closing it is not an "update".
    if (task.client_id) out.push({ userId: task.client_id, role: 'publisher', source: 'entity_event' });
    if (task.worker_id) out.push({ userId: task.worker_id, role: 'worker', source: 'entity_event' });
    return out;
  }

  if (task.status === 'OPEN') {
    if (task.client_id && isRoleTracked(config, 'OPEN', 'publisher')) {
      out.push({ userId: task.client_id, role: 'publisher', source: 'entity_event' });
    }
    return out;
  }

  if (task.client_id && isRoleTracked(config, task.status, 'publisher')) {
    out.push({ userId: task.client_id, role: 'publisher', source: 'entity_event' });
  }
  if (task.worker_id && isRoleTracked(config, task.status, 'worker')) {
    out.push({ userId: task.worker_id, role: 'worker', source: 'entity_event' });
  }
  return out;
}

/**
 * Build the diagnostic rows for one event.
 *
 * Pure: it reads its inputs and returns rows; it writes nothing, sends nothing
 * and never throws for an ordinary task shape. `lastByRecipient` is the most
 * recent recorded observation per (user, role) — see `recipientKey` — which
 * supplies the dedupe and terminal memory a real `LiveActivityState` will
 * supply in Stage 3.
 *
 * @returns `{ rows }` — one row per recipient, already shaped like the entity.
 */
export function planObservation(input) {
  const {
    task = null,
    event = 'update',
    config = {},
    lastByRecipient = {},
    categories = [],
    settings = {},
    tokens = [],
    hints = {},
    now = Date.now(),
  } = input || {};

  const gate = sendGate(config);
  const recipients = observationRecipients({ task, config, hints });
  const revision = task ? revisionFromTask(task) : Math.max(1, Math.floor(now / 1000));
  const rows = [];

  for (const { userId, role, source } of recipients) {
    const last = lastByRecipient?.[recipientKey(userId, role)] || null;

    // The snapshot is only meaningful while the task is live; a terminal task
    // has nothing to display, it only has to be closed.
    const snapshot = (task && !TERMINAL_TASK_STATUSES.includes(task.status))
      ? buildBackendSnapshot({
          task,
          role,
          userId,
          categories,
          settings,
          timeZone: timeZoneFor(tokens, userId, config),
          revision,
          now,
        })
      : null;

    let plan;
    if (!task) {
      // ── Deleted ────────────────────────────────────────────────────────────
      // There is no record left to plan from, so the only correct outcome is a
      // close, and only once per recipient.
      plan = last?.terminal
        ? { kind: 'none', decision: 'terminal_already_sent', reason: 'task_deleted', revision: (Number(last.revision) || 0) + 1 }
        : { kind: 'end', decision: 'terminal', reason: 'task_deleted', revision: (Number(last?.revision) || 0) + 1 };
    } else {
      plan = planLiveActivityDispatch({
        task,
        role,
        userId,
        // Planning only: lets the decision be reported while the real gate is
        // still shut. Recorded separately as `send_gate`.
        config: { ...config, enabled: true },
        state: last
          ? {
              revision: Number(last.revision) || 0,
              content_key: last.content_key || '',
              phase: last.phase || '',
              terminal: last.terminal === true,
            }
          : null,
        snapshot,
        // Deliberately no eventRevision: the record is re-read on every event,
        // so the planner must judge the CURRENT state, and staleness is decided
        // below against the revision derived from that same record.
        eventRevision: null,
        now,
      });
    }

    let decision = plan.decision;
    let kind = plan.kind;
    let reason = plan.reason || '';

    // An observation carrying an older task version than the one already
    // recorded is reported as stale and is never written as news.
    if (task && last && revision < (Number(last.revision) || 0)) {
      decision = 'stale_revision';
      kind = 'none';
      reason = 'record_older_than_last_observation';
    }

    const contentKey = plan.contentKey
      || (snapshot ? snapshotContentKey(snapshot) : (kind === 'end' ? '' : (last?.content_key || '')));

    rows.push({
      task_id: task?.id || hints.task_id || '',
      event_type: OBSERVED_EVENTS.includes(event) ? event : 'update',
      user_id: userId,
      role,
      source,
      task_status: task?.status || hints.status || '',
      worker_status: task?.worker_status || '',
      phase: plan.snapshot?.phase || (kind === 'end' ? 'terminal' : (snapshot?.phase || '')),
      decision,
      kind,
      reason,
      revision,
      next_revision: Number.isFinite(Number(plan.revision)) ? Number(plan.revision) : null,
      content_key: contentKey,
      title: plan.snapshot?.title || '',
      subtitle: plan.snapshot?.subtitle || '',
      category_key: task?.category || '',
      category_label: snapshot?.categoryLabel || '',
      applicants: snapshot?.counters?.applicants
        ?? (Array.isArray(task?.applicants) ? task.applicants.length : null),
      terminal: kind === 'end' || last?.terminal === true,
      send_gate: gate,
      device_tokens: activeTokenCount(tokens, userId, config),
      apns_contacted: false,
      task_updated_at: task?.updated_date || '',
    });
  }

  return { rows };
}

/** Rows older than this are swept. Keeps the diagnostic table bounded. */
export function retentionCutoffMs(config, now = Date.now()) {
  const days = Number(config?.diagnostic_retention_days);
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 30) : 7;
  return now - safeDays * 86400000;
}