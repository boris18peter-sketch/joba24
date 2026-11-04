import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { verifyActionToken } from '../../shared/liveActivityActionToken.ts';
import {
  ACTION_IDS,
  guardPublisherApproval,
  guardPublisherAssign,
  guardWorkerStep,
  workerStepPatch,
} from '../../shared/liveActivityActionGuard.ts';
import { approveWorkerCore } from '../../shared/workerApproval.ts';
import { deriveActivityAction, authorizeActivity } from '../../shared/taskActivitySnapshot.ts';
import { actionsForRole } from '../../shared/liveActivityActionGuard.ts';
import { ROLES } from '../../shared/liveActivityAuth.ts';
import { completeTaskCore } from '../../shared/taskCompletion.ts';
import { buildBackendSnapshot } from '../../shared/liveActivitySnapshot.ts';
import { resolveStatusFlow, resolveSchedule, DEFAULT_TIMEZONE } from '../../shared/liveActivityFlow.ts';
import { t } from '../../shared/liveActivityStrings.ts';

/**
 * liveActivityAction — the ONE endpoint a Lock Screen button may call.
 *
 * ── WHO IS CALLING ─────────────────────────────────────────────────────────
 * An Apple App Intent in the widget extension: no WebView, no session. Identity
 * comes from the capability token the app minted for this exact (user, task,
 * role) pair, so the request is authenticated without any secret ever leaving
 * the server or entering the payload.
 *
 * ── WHAT IT REFUSES TO TRUST ───────────────────────────────────────────────
 * Everything except the token's binding. The task is re-read from the database,
 * the category flow is re-resolved, the eligibility is re-derived with the SAME
 * function the Lock Screen's button came from, and the guard re-checks role,
 * ownership and the exact transition. A token minted an hour ago can therefore
 * never approve a task that has since been cancelled, or step a task twice.
 *
 * ── WHAT IT ACTUALLY RUNS ──────────────────────────────────────────────────
 * Only the existing authoritative operations:
 *   worker_step       → the same `worker_status` + timestamp write the in-app
 *                       banner performs (downstream notifications come from the
 *                       existing entity-triggered workflows, unchanged).
 *   publisher_approve → `completeTaskCore`, i.e. `completeTask` itself: worker
 *                       counter, refunds, credit ledger, applicant projection and
 *                       its idempotency guard.
 *
 * Nothing is reported as done until the write has returned, and the response
 * carries the freshly built snapshot so the card shows the confirmed state.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const secret = Deno.env.get('LIVE_ACTIVITY_ACTION_SECRET');
    if (!secret) return Response.json({ error: 'action_auth_unavailable' }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const actionId = typeof body?.action_id === 'string' ? body.action_id : '';
    const expectedStep = typeof body?.expected_step === 'string' ? body.expected_step : '';

    const verified = await verifyActionToken({ secret, token: body?.token });
    if (!verified.ok) {
      return Response.json({ ok: false, error: verified.reason, decision: 'rejected' }, { status: 401 });
    }
    const claims = verified.claims;

    // ── WHICH TASK, AND AS WHOM ────────────────────────────────────────────
    // A per-card capability NAMES its task and role (that is its whole point).
    // An install-scoped one does not: the request must name them, and the RECORD
    // then decides whether this user really is that side of that task. Nothing is
    // inferred from the token beyond the user id it was signed for.
    const isUserScope = claims.scope === 'user';
    const claimedTaskId = isUserScope
      ? String(body?.task_id || '').trim()
      : String(claims.tid || '');
    const role = isUserScope
      ? (ROLES.includes(body?.role) ? body.role : '')
      : claims.role;
    const permitted = isUserScope ? actionsForRole(role) : claims.actions;

    if (isUserScope && (!claimedTaskId || !role)) {
      return Response.json({ ok: false, error: 'task_and_role_required', decision: 'rejected' }, { status: 400 });
    }

    if (!ACTION_IDS.includes(actionId)) {
      return Response.json({ ok: false, error: 'unknown_action', decision: 'rejected' }, { status: 400 });
    }
    if (!permitted.includes(actionId)) {
      // A worker's capability can never carry publisher_approve, and vice versa.
      return Response.json({ ok: false, error: 'action_not_permitted', decision: 'rejected' }, { status: 403 });
    }

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: claimedTaskId });
    const task = tasks?.[0];
    if (!task) {
      return Response.json({ ok: false, error: 'task_missing', decision: 'rejected' }, { status: 404 });
    }

    // ── AN INSTALL-SCOPED CAPABILITY MUST OWN THIS TASK, IN THIS ROLE ───────
    // Same rule `authorizeActivity` applies everywhere else, stated explicitly
    // because this token deliberately names no task of its own.
    if (isUserScope) {
      const auth = authorizeActivity(task, role, claims.sub);
      if (!auth.ok) {
        return Response.json({ ok: false, error: auth.reason, decision: 'rejected' }, { status: 403 });
      }
    }

    // ── Re-derive eligibility from the CURRENT record ──────────────────────
    const categories = await base44.asServiceRole.entities.GlobalCategory.list()
      .then((page) => (Array.isArray(page) ? page : page?.items || []))
      .catch(() => []);
    const settings = await base44.asServiceRole.entities.JobaSettings.list()
      .then((rows) => (Array.isArray(rows) ? rows[0] : rows?.items?.[0]))
      .catch(() => null);

    const flow = resolveStatusFlow(task.category, categories);
    const schedule = resolveSchedule(task, { now: Date.now(), settings: settings || {}, timeZone: DEFAULT_TIMEZONE });
    const eligible = deriveActivityAction({
      task,
      role,
      flow,
      isEngagement: !!schedule.isEngagement,
      t,
    });

    const snapshotFor = (sourceTask: any) => buildBackendSnapshot({
      task: sourceTask,
      role,
      userId: claims.sub,
      categories,
      settings: settings || {},
      timeZone: DEFAULT_TIMEZONE,
      revision: Math.max(1, Math.floor((Date.parse(sourceTask?.updated_date || '') || Date.now()) / 1000)),
    });

    if (!eligible) {
      return Response.json({
        ok: false,
        decision: 'rejected',
        error: 'not_eligible',
        task_status: task.status,
        worker_status: task.worker_status || null,
        snapshot: snapshotFor(task),
      }, { status: 409 });
    }
    if (eligible.id !== actionId) {
      return Response.json({
        ok: false,
        decision: 'rejected',
        error: 'action_mismatch',
        expected_action: eligible.id,
        task_status: task.status,
        snapshot: snapshotFor(task),
      }, { status: 409 });
    }

    // ── Worker progress ────────────────────────────────────────────────────
    if (actionId === 'worker_step') {
      const guard = guardWorkerStep({
        task,
        userId: claims.sub,
        step: eligible.step,
        expectedStep: expectedStep || undefined,
      });

      if (!guard.ok) {
        const httpStatus = guard.reason === 'duplicate' ? 200 : guard.status;
        return Response.json({
          ok: guard.reason === 'duplicate',
          decision: guard.reason === 'duplicate' ? 'duplicate' : 'rejected',
          error: guard.reason,
          action_id: actionId,
          task_status: task.status,
          worker_status: task.worker_status || null,
          detail: guard.detail || null,
          snapshot: snapshotFor(task),
        }, { status: httpStatus });
      }

      // Exactly the banner's write — nothing else.
      await base44.asServiceRole.entities.Task.update(task.id, workerStepPatch(task, eligible.step));

      const fresh = (await base44.asServiceRole.entities.Task.filter({ id: task.id }))[0] || task;
      return Response.json({
        ok: true,
        decision: 'applied',
        action_id: actionId,
        step: eligible.step,
        task_status: fresh.status,
        worker_status: fresh.worker_status || null,
        snapshot: snapshotFor(fresh),
      });
    }

    // ── Publisher assignment: the real approval workflow ───────────────────
    // Runs `approveWorkerCore` — the SAME code the in-app applicant list calls —
    // so the assignment, the schedule agreement, the worker notification and the
    // applicant projection cannot diverge. The only thing added here is the
    // "exactly one pending applicant" rule, checked against the database.
    if (actionId === 'publisher_assign') {
      const applications = await base44.asServiceRole.entities.TaskApplication
        .filter({ task_id: task.id })
        .catch(() => []);
      const assign = guardPublisherAssign({ task, userId: claims.sub, applications });

      if (!assign.ok) {
        return Response.json({
          ok: false,
          decision: 'rejected',
          error: assign.reason,
          action_id: actionId,
          task_status: task.status,
          detail: assign.detail || null,
          // The refreshed snapshot is what makes the card correct itself: with a
          // second applicant it carries no action, so the button disappears
          // instead of inviting a pointless second tap.
          snapshot: snapshotFor(task),
        }, { status: assign.status });
      }

      const result = await approveWorkerCore(base44, {
        actorId: claims.sub,
        taskId: task.id,
        applicationId: assign.applicationId,
        workerId: assign.workerId,
      });

      const fresh = (await base44.asServiceRole.entities.Task.filter({ id: task.id }))[0] || task;
      const applied = result.status < 400;
      // `already_assigned` is a SUCCESS: the tap landed and this worker is the
      // task's worker. Anything else is a real refusal and is reported as one.
      const already = result.body?.already_assigned === true;
      return Response.json({
        ok: applied || already,
        decision: already ? 'duplicate' : (applied ? 'applied' : 'rejected'),
        error: applied ? undefined : (result.body?.error || 'assign_failed'),
        action_id: actionId,
        worker_id: assign.workerId,
        task_status: fresh.status,
        snapshot: snapshotFor(fresh),
      }, { status: already ? 200 : result.status });
    }

    // ── Publisher approval: the real completion workflow ───────────────────
    const guard = guardPublisherApproval({ task, userId: claims.sub });
    if (!guard.ok) {
      const httpStatus = guard.reason === 'already_completed' ? 200 : guard.status;
      return Response.json({
        ok: guard.reason === 'already_completed',
        decision: guard.reason === 'already_completed' ? 'duplicate' : 'rejected',
        error: guard.reason,
        action_id: actionId,
        task_status: task.status,
        worker_status: task.worker_status || null,
        detail: guard.detail || null,
        snapshot: snapshotFor(task),
      }, { status: httpStatus });
    }

    const result = await completeTaskCore(base44, { id: claims.sub }, task.id);
    if (result.status >= 400) {
      return Response.json({
        ok: false,
        decision: 'rejected',
        error: result.body?.error || 'completion_failed',
        action_id: actionId,
        task_status: task.status,
        snapshot: snapshotFor(task),
      }, { status: result.status });
    }

    const fresh = (await base44.asServiceRole.entities.Task.filter({ id: task.id }))[0] || task;
    return Response.json({
      ok: true,
      decision: result.body?.already_completed ? 'duplicate' : 'applied',
      action_id: actionId,
      task_status: fresh.status,
      // A completed task has no live card: the caller ends the activity.
      terminal: fresh.status === 'COMPLETED',
      // COMPLETED is not trackable, so there is no snapshot — that absence is
      // exactly what tells the intent to close the activity.
      snapshot: snapshotFor(fresh),
    });
  } catch (error) {
    return Response.json({ ok: false, decision: 'rejected', error: error.message }, { status: 500 });
  }
});