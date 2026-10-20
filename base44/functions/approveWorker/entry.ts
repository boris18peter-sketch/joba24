import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { scheduleSignature, hasSchedule, occurrencesOf, formatOccurrenceHe } from '../../shared/scheduling.ts';

/**
 * approveWorker — Assigns a worker to a task.
 * - Guards against double-approval: task must be OPEN with no worker_id set
 * - Uses service-role for all mutations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, applicationId, workerId, workerName } = await req.json();

    if (!taskId || !applicationId || !workerId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch task via service role
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Allow either the task owner (approving an applicant) OR the worker
    // themselves confirming "go now" (their own approved/pending application).
    const isOwnerCall = task.client_id === user.id;
    const isWorkerSelfConfirm = workerId === user.id;
    if (!isOwnerCall && !isWorkerSelfConfirm) {
      return Response.json({ error: 'Forbidden — not authorized' }, { status: 403 });
    }

    // Fetch the application (used by both paths)
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
    const app = apps[0];
    if (!app) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    if (isWorkerSelfConfirm) {
      // Worker may only confirm their OWN application
      if (app.worker_id !== user.id) {
        return Response.json({ error: 'Forbidden — not your application' }, { status: 403 });
      }
      if (app.status !== 'approved' && app.status !== 'pending') {
        return Response.json({ error: 'Application no longer valid' }, { status: 409 });
      }
    } else {
      // Owner path: application must still be pending
      if (app.status !== 'pending') {
        return Response.json({ error: 'Application no longer pending' }, { status: 409 });
      }
    }

    // Idempotent: if the task is already taken by THIS worker (e.g. re-tap after
    // a client cache desync), return success without re-mutating.
    if (task.status === 'TAKEN' && task.worker_id === workerId) {
      const freshTaken = await base44.asServiceRole.entities.Task.filter({ id: taskId });
      return Response.json({ success: true, task: freshTaken[0], already_assigned: true });
    }

    // Concurrency guard: taken by someone else or not open
    if (task.status !== 'OPEN' || (task.worker_id && task.worker_id !== workerId)) {
      return Response.json({ error: 'already_assigned', note: 'Task is no longer open' }, { status: 409 });
    }

    // Resolve worker name server-side — the client may pass an empty string
    // when the worker's full_name was never set on their User record. Fall back
    // to the application record, then to the User record, so approval never
    // fails on a missing name.
    let resolvedWorkerName = workerName || app.worker_name || '';
    if (!resolvedWorkerName) {
      const workerUsers = await base44.asServiceRole.entities.User.filter({ id: workerId });
      resolvedWorkerName = workerUsers[0]?.full_name || 'עובד';
    }

    // ── Schedule Agreement ──────────────────────────────────────────────────
    // The worker saw the task's schedule when they applied. If it is unchanged
    // at the moment they are picked, the two are already aligned, so the
    // agreement is recorded automatically and no confirmation is asked.
    // A task with no schedule has nothing to agree on. A schedule that CHANGED
    // since the application is deliberately left unagreed — that is the case the
    // reschedule/confirmation layer exists for (M3.8).
    const signature = scheduleSignature(task);
    const isScheduled = hasSchedule(task);
    const scheduleAgreed = isScheduled && (!app.schedule_snapshot || app.schedule_snapshot === signature);

    // Assign worker to task
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: resolvedWorkerName,
      worker_rating: app.worker_rating || 0,
      worker_verified: app.worker_verified || false,
      schedule_agreed_at: scheduleAgreed ? new Date().toISOString() : null,
    });
    console.log('✅ TASK UPDATED:', taskId);

    // Approve the application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, {
      status: 'approved'
    });

    // ── THE APPLICATION MUST STILL BE OURS TO APPROVE ───────────────────────
    // Selection and cancellation are two separate calls, so this approval can
    // cross a cancel the worker sent while the application was still `pending`.
    // Both sides would then "win": a task assigned to a worker whose application
    // is cancelled, and a refund paid out for a job that was given away.
    // Re-reading the application settles it deterministically — the worker's
    // cancellation stands and the task returns to OPEN, so the publisher can pick
    // someone else immediately (the applicant list is left intact).
    const afterApps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
    if (afterApps[0]?.status !== 'approved') {
      await base44.asServiceRole.entities.Task.update(taskId, {
        status: 'OPEN',
        worker_id: null,
        worker_name: null,
        worker_status: null,
        schedule_agreed_at: null,
      });
      return Response.json({ error: 'Application was cancelled', code: 'cancelled' }, { status: 409 });
    }

    // ── ONLY ONE APPROVAL CAN WIN THE TASK ──────────────────────────────────
    // Two approvals landing together — the publisher on two devices, or a
    // double-tap — both read the task as OPEN and both assign. The second
    // overwrites worker_id, and BOTH applications are left `approved`, so two
    // workers each believe the job is theirs. The TASK is the arbiter: whoever
    // is not its worker steps their own application back to pending, so the
    // publisher can pick again and no worker is left holding a job that was
    // already given to someone else.
    const afterAssign = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    if (afterAssign[0]?.worker_id !== workerId) {
      await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'pending' });
      return Response.json({ error: 'already_assigned', note: 'Task was assigned to another worker' }, { status: 409 });
    }
    console.log('✅ APPLICATION APPROVED');

    // ── Schedule agreed → tell the worker the job is locked in ──────────────
    // The client performed the approval, so they already know. The WORKER is
    // the one who needs the confirmation, and only when a schedule actually
    // exists and the two sides are aligned on it.
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
    // when the task itself reaches a terminal state — completed, deleted, or
    // expired — so if this assignment falls through (the publisher cancels it or
    // the worker walks away) the task simply returns to OPEN with its applicant
    // list intact, and the publisher can approve someone else right away.
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = allApps.filter((a) => a.status === 'pending' || a.status === 'approved');
    await base44.asServiceRole.entities.Task.update(taskId, {
      applicants: activeApps.map((a) => ({
        worker_id: a.worker_id,
        worker_name: a.worker_name,
        applied_at: a.created_date,
      })),
    });

    // Fetch FRESH task data to return
    const freshTaskData = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const updatedTask = freshTaskData[0];

    if (!updatedTask || updatedTask.worker_id !== workerId || updatedTask.status !== 'TAKEN') {
      console.error('❌ CRITICAL: data verification failed after update', { expected: workerId, got: updatedTask?.worker_id });
      return Response.json({ error: 'Data consistency error after update' }, { status: 500 });
    }

    console.log('✅ APPROVAL COMPLETE - DATA VERIFIED');
    return Response.json({ success: true, task: updatedTask });

  } catch (error) {
    console.error('❌ APPROVAL ERROR:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});