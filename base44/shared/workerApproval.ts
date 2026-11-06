/**
 * workerApproval — assigning a worker to a task, as ONE implementation.
 *
 * ── WHY IT WAS EXTRACTED ───────────────────────────────────────────────────
 * Assignment is not just a status write: it flips the task to TAKEN, records the
 * schedule agreement, tells the worker, projects the remaining applicants, and
 * carries three separate concurrency guards (an application cancelled mid-flight,
 * two approvals racing, and a re-tap after a cache desync).
 *
 * A Lock Screen assignment must run EXACTLY this — so the body moved here
 * unchanged and `approveWorker` (the HTTP entry the app calls) delegates to it.
 * Two callers, one implementation: a future fix lands in both at once.
 */

import { scheduleSignature, hasSchedule, occurrencesOf, formatOccurrenceHe } from './scheduling.ts';
import { runTaskTransition } from './taskTransitionFastLane.ts';

export type ApprovalResult = { status: number; body: Record<string, any> };

export type ApprovalActor = {
  /** The publisher (task owner), or the worker confirming their own selection. */
  actorId: string;
  taskId: string;
  applicationId: string;
  workerId: string;
  workerName?: string;
};

/**
 * Approve `workerId`'s application on `taskId`, as `actorId`.
 *
 * Authorization is decided here, from the RECORD: ownership is never taken from
 * a client-supplied claim. That is what lets a Lock Screen capability call this
 * with nothing but the user id the token was signed for.
 */
export async function approveWorkerCore(base44: any, actor: ApprovalActor): Promise<ApprovalResult> {
  const { actorId, taskId, applicationId, workerId, workerName } = actor || ({} as ApprovalActor);

  if (!taskId || !applicationId || !workerId) {
    return { status: 400, body: { error: 'Missing required fields' } };
  }

  const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
  const task = tasks[0];
  if (!task) return { status: 404, body: { error: 'Task not found' } };

  // Allow either the task owner (approving an applicant) OR the worker
  // themselves confirming "go now" (their own approved/pending application).
  const isOwnerCall = task.client_id === actorId;
  const isWorkerSelfConfirm = workerId === actorId;
  if (!isOwnerCall && !isWorkerSelfConfirm) {
    return { status: 403, body: { error: 'Forbidden — not authorized' } };
  }

  const apps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
  const app = apps[0];
  if (!app) return { status: 404, body: { error: 'Application not found' } };
  // The application must belong to the worker being assigned. Without this a
  // caller could name one worker and promote somebody else's application.
  if (app.worker_id !== workerId) {
    return { status: 409, body: { error: 'application_mismatch' } };
  }

  if (isWorkerSelfConfirm) {
    if (app.worker_id !== actorId) {
      return { status: 403, body: { error: 'Forbidden — not your application' } };
    }
    if (app.status !== 'approved' && app.status !== 'pending') {
      return { status: 409, body: { error: 'Application no longer valid' } };
    }
  } else if (app.status !== 'pending') {
    return { status: 409, body: { error: 'Application no longer pending' } };
  }

  // Idempotent: if the task is already taken by THIS worker (e.g. re-tap after
  // a client cache desync), return success without re-mutating.
  if (task.status === 'TAKEN' && task.worker_id === workerId) {
    const freshTaken = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    return { status: 200, body: { success: true, task: freshTaken[0], already_assigned: true } };
  }

  // Concurrency guard: taken by someone else or not open
  if (task.status !== 'OPEN' || (task.worker_id && task.worker_id !== workerId)) {
    return { status: 409, body: { error: 'already_assigned', note: 'Task is no longer open' } };
  }

  // Resolve worker name server-side — the client may pass an empty string when
  // the worker's full_name was never set on their User record.
  let resolvedWorkerName = workerName || app.worker_name || '';
  if (!resolvedWorkerName) {
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: workerId });
    resolvedWorkerName = workerUsers[0]?.full_name || 'עובד';
  }

  // ── Schedule Agreement ──────────────────────────────────────────────────
  // The worker saw the task's schedule when they applied. If it is unchanged at
  // the moment they are picked, the two are already aligned, so the agreement is
  // recorded automatically. A schedule that CHANGED since the application is
  // deliberately left unagreed — that is the reschedule layer's case (M3.8).
  const signature = scheduleSignature(task);
  const isScheduled = hasSchedule(task);
  const scheduleAgreed = isScheduled && (!app.schedule_snapshot || app.schedule_snapshot === signature);

  await base44.asServiceRole.entities.Task.update(taskId, {
    status: 'TAKEN',
    worker_id: workerId,
    worker_name: resolvedWorkerName,
    worker_rating: app.worker_rating || 0,
    worker_verified: app.worker_verified || false,
    schedule_agreed_at: scheduleAgreed ? new Date().toISOString() : null,
  });
  console.log('✅ TASK UPDATED:', taskId);

  await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'approved' });

  // ── THE APPLICATION MUST STILL BE OURS TO APPROVE ───────────────────────
  // Selection and cancellation are two separate calls, so this approval can
  // cross a cancel the worker sent while the application was still `pending`.
  const afterApps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
  if (afterApps[0]?.status !== 'approved') {
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'OPEN',
      worker_id: null,
      worker_name: null,
      worker_status: null,
      schedule_agreed_at: null,
    });
    return { status: 409, body: { error: 'Application was cancelled', code: 'cancelled' } };
  }

  // ── ONLY ONE APPROVAL CAN WIN THE TASK ──────────────────────────────────
  // Two approvals landing together both read the task as OPEN and both assign.
  // The TASK is the arbiter: whoever is not its worker steps their own
  // application back to pending, so the publisher can pick again.
  const afterAssign = await base44.asServiceRole.entities.Task.filter({ id: taskId });
  if (afterAssign[0]?.worker_id !== workerId) {
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'pending' });
    return { status: 409, body: { error: 'already_assigned', note: 'Task was assigned to another worker' } };
  }
  console.log('✅ APPLICATION APPROVED');

  // ── Schedule agreed → tell the worker the job is locked in ──────────────
  if (scheduleAgreed) {
    try {
      const first = occurrencesOf(task)[0];
      await base44.asServiceRole.functions.invoke('notificationManager', {
        event_key: 'schedule_agreed',
        user_ids: [workerId],
        task_id: taskId,
        variables: {
          task_title: task.title || '',
          task_id: taskId,
          when: first ? formatOccurrenceHe(first.start) : '',
        },
      });
    } catch (notifyErr) {
      console.log('[approveWorker] schedule_agreed notification failed:', notifyErr.message);
    }
  }

  // ── The workers who were NOT picked stay on the list, still pending ─────
  // Their Jobas remain committed, exactly as before. The hold is released only
  // when the task itself reaches a terminal state.
  const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
  const activeApps = allApps.filter((a) => a.status === 'pending' || a.status === 'approved');
  await base44.asServiceRole.entities.Task.update(taskId, {
    applicants: activeApps.map((a) => ({
      worker_id: a.worker_id,
      worker_name: a.worker_name,
      applied_at: a.created_date,
    })),
  });

  const freshTaskData = await base44.asServiceRole.entities.Task.filter({ id: taskId });
  const updatedTask = freshTaskData[0];

  if (!updatedTask || updatedTask.worker_id !== workerId || updatedTask.status !== 'TAKEN') {
    console.error('❌ CRITICAL: data verification failed after update', { expected: workerId, got: updatedTask?.worker_id });
    return { status: 500, body: { error: 'Data consistency error after update' } };
  }

  console.log('✅ APPROVAL COMPLETE - DATA VERIFIED');

  // ── THE WORKER'S CARD IS ARMED HERE, BY THE APPROVAL ITSELF ──────────────
  // Approval used to leave the Live Activity to two other things: the client
  // calling `taskTransitionDispatch` afterwards (only the applicants list did),
  // and the entity workflow. The workflow is measured at 30–84 s behind a burst
  // — the runs of this very event took 66 s and 80 s today — so the card's
  // start push arrived long after the worker had already opened the app, whose
  // own bridge then started the card locally. The result was exactly what was
  // reported: the widget only appeared once the app was opened.
  //
  // Running the ONE shared sender here makes the approval itself start the
  // card, immediately and for EVERY entry point (applicants list, new-applicant
  // popup, task screen, simulator, Lock Screen) — there is no second
  // implementation and nothing new to keep in sync. A repeat is refused by the
  // planner's own revision claim, so this can never produce a second card.
  let liveActivity = null;
  try {
    liveActivity = await runTaskTransition({ base44, task: updatedTask, previousWorkerStatus: '' });
  } catch (dispatchError) {
    // A Lock Screen or a push may never break an approval that is already
    // written; the durable workflow still carries the same event.
    console.log('[approveWorker] live activity dispatch failed:', dispatchError?.message);
  }

  return { status: 200, body: { success: true, task: updatedTask, live_activity: liveActivity?.live_activity || [] } };
}