import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig, isTrackedRecipient, isRoleTracked, testModeActive } from '../../shared/liveActivityConfig.ts';
import { TERMINAL_TASK_STATUSES } from '../../shared/liveActivityDispatch.ts';
import { dispatchRecipient, recordDispatchOutcome } from '../../shared/liveActivitySend.ts';
import { requireInternalOperator } from '../../shared/internalAuth.ts';

/**
 * liveActivityTaskEvent — the SERVER half of the real-task Live Activity.
 *
 * ── WHERE IT SITS IN THE REAL LIFECYCLE ────────────────────────────────────
 * A Task entity event (the same trigger the diagnostic observer listens to)
 * calls this. Nothing in it is a new status system: the record it reads IS the
 * lifecycle. A task is "active" when `status` leaves OPEN and `worker_id` is
 * set, which is what approving a worker writes; progress is `worker_status`;
 * it is over when the status is terminal.
 *
 * ── WHAT IT MAY DO ─────────────────────────────────────────────────────────
 * One thing per recipient: ask the shared sender to plan (and, when the
 * configuration allows it FOR THAT RECIPIENT, to push) the current snapshot.
 * The revision, the dedupe and the terminal-once rule all live in the shared
 * planner — this file only decides WHO is asked, and reuses the record.
 *
 * ── THE ROLLOUT GATE ───────────────────────────────────────────────────────
 * With an empty `test_user_ids` and the global flag off, this returns
 * `skipped: 'disabled'` before it reads a task. In test mode it still only
 * reaches recipients on the allowlist, and only those recipients can ever have
 * `mayContactApnsFor()` true. Production delivery is unchanged and remains off.
 *
 * A deleted task is handled from the event's own payload: the record is gone,
 * so a minimal stand-in carrying the two identities and a terminal status is
 * used to close both cards. It is never written anywhere.
 */
const EVENTS = ['create', 'update', 'delete'];

export default async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const denied = await requireInternalOperator(base44, req, user ?? null);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    const eventType = EVENTS.includes(body?.event_type) ? body.event_type : '';
    if (!taskId || !eventType) {
      return Response.json({ error: 'task_id and event_type are required' }, { status: 400 });
    }

    // ── 1. The gate, before any task read ───────────────────────────────────
    const configPage = await base44.asServiceRole.entities.LiveActivityConfig
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const config = normalizeConfig((configPage?.items || [])[0]);
    if (!testModeActive(config) && config.enabled !== true) {
      return Response.json({
        ok: true,
        skipped: 'disabled',
        test_mode: false,
        dispatched: 0,
        contactedApns: false,
      });
    }

    // ── 2. The record is the authority ──────────────────────────────────────
    const task = await base44.asServiceRole.entities.Task.get(taskId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));

    const hints = {
      client_id: typeof body?.client_id === 'string' ? body.client_id : '',
      worker_id: typeof body?.worker_id === 'string' ? body.worker_id : '',
    };

    // A deleted task has no record left. Its two identities come from the event
    // payload, and a terminal status is the only correct thing to report.
    const subject = task || (hints.client_id || hints.worker_id
      ? {
          id: taskId,
          status: 'CANCELLED',
          client_id: hints.client_id,
          worker_id: hints.worker_id,
          category: '',
          updated_date: new Date().toISOString(),
        }
      : null);

    if (!subject) {
      return Response.json({ ok: true, skipped: 'no_recipients', dispatched: 0, contactedApns: false });
    }

    // ── 3. Recipients: the record's own two people, filtered by the gate ────
    // A finished task closes for both sides regardless of the tracking toggles,
    // because a stale Lock Screen outlives the work and closing it is not an
    // "update". Every other status obeys the same role toggles as the rest of
    // the pipeline.
    const terminal = TERMINAL_TASK_STATUSES.includes(subject.status);
    const candidates = [];
    if (subject.client_id) candidates.push({ userId: subject.client_id, role: 'publisher' });
    if (subject.worker_id) candidates.push({ userId: subject.worker_id, role: 'worker' });

    const targets = candidates.filter(({ userId, role }) => (
      isTrackedRecipient(config, userId)
      && (terminal || isRoleTracked(config, subject.status, role))
    ));

    // ── A RECIPIENT THE GATE EXCLUDED IS STILL AN OUTCOME ──────────────────
    // Without this row the audit reads as though the dispatcher was never asked
    // about that person — which is indistinguishable from a lost event.
    const skipped = candidates.filter(({ role }) => !targets.some((t) => t.role === role));
    await Promise.allSettled(skipped.map(({ userId, role }) => recordDispatchOutcome(base44, {
      recipientId: userId,
      taskId: subject.id,
      role,
      event: terminal ? 'end' : 'update',
      revision: 0,
      decision: 'skipped',
      status: 'skipped',
      reason: isTrackedRecipient(config, userId) ? 'role_not_tracked' : 'recipient_not_tracked',
      environment: config?.environment,
    })));

    if (!targets.length) {
      return Response.json({
        ok: true,
        skipped: 'no_tracked_recipients',
        task_status: subject.status,
        dispatched: 0,
        contactedApns: false,
      });
    }

    // ── 4. The shared sender does the rest ──────────────────────────────────
    const results = await Promise.all(targets.map(async ({ userId, role }) => {
      const outcome = await dispatchRecipient({
        base44,
        config,
        task: subject,
        role,
        recipientId: userId,
        mode: 'dispatch',
      }).catch((error) => ({ decision: 'error', reason: error?.message || 'dispatch_failed' }));

      return {
        role,
        decision: outcome.decision || 'none',
        kind: outcome.kind || 'none',
        reason: outcome.reason || null,
        revision: outcome.revision || 0,
        tokens: outcome.tokens || 0,
        sent: outcome.sent || 0,
        contactedApns: outcome.contactedApns === true,
      };
    }));

    return Response.json({
      ok: true,
      event: eventType,
      task_status: subject.status,
      terminal,
      dispatched: results.length,
      contactedApns: results.some((r) => r.contactedApns),
      results,
    });
  } catch (error) {
    // Same rule as the observer: a task operation has already completed, so a
    // failure here must never look like an error in the app.
    return Response.json({ ok: false, error: error.message, dispatched: 0, contactedApns: false });
  }
}