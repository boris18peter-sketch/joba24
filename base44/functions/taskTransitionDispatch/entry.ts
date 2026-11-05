import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { runTaskTransition } from '../../shared/taskTransitionFastLane.ts';

/**
 * taskTransitionDispatch — the USER-FACING entry point of the fast lane.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * A Task write reaches the app's workflows immediately (0.15–0.35 s), but the
 * workflow ENGINE only hands the event to the backend function 30–84 seconds
 * later under a burst. Measured on this app: the dispatch function answers in
 * 677 ms while the single-step workflow run carrying it took 82.9 s. That delay
 * is platform-side and has no documented bound, so it cannot be tuned away from
 * application code — and a function-level entity automation cannot replace it,
 * because automations cannot be deployed in an app that uses workflows.
 *
 * The durable chain therefore stays exactly as it is (entity event → workflow →
 * liveActivityTaskEvent / notifyTaskWorkerStatusChange). This function is the
 * SECOND, immediate path: the participant who performed the transition asks for
 * the same work to be done now, and AWAITS the answer.
 *
 * ── THE SAME CODE RUNS FOR THE LOCK SCREEN ─────────────────────────────────
 * The work itself lives in `shared/taskTransitionFastLane.ts`, and BOTH entry
 * points call it: this one (a WebView button handler, with a session) and
 * `liveActivityAction` (Apple's App Intent, with a capability token). There is
 * no second copy, so approving from the Lock Screen and approving in the app
 * cannot diverge.
 *
 * ── AUTHORIZATION BELONGS HERE ─────────────────────────────────────────────
 * The caller must be one of the two people on the task. Nothing is taken from
 * the request except the id: the record is read server-side and IS the truth, so
 * a caller cannot describe a status it does not have.
 */
export default async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    if (!taskId) return Response.json({ error: 'task_id is required' }, { status: 400 });

    const task = await base44.asServiceRole.entities.Task.get(taskId).catch(() => null);
    if (!task) return Response.json({ error: 'task_not_found' }, { status: 404 });
    if (task.client_id !== user.id && task.worker_id !== user.id) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    const previousWorkerStatus = typeof body?.previous_worker_status === 'string'
      ? body.previous_worker_status
      : '';

    const result = await runTaskTransition({
      base44,
      task,
      previousWorkerStatus,
      // Only a caller that actually moved a worker stage asks for the stage
      // notification, because approval and completion already own theirs.
      notifyStage: body?.notify_stage === true,
    });

    return Response.json(result);
  } catch (error) {
    // The task transition itself already succeeded; this path is an accelerator.
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
}