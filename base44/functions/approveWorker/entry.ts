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

    // ── THE WORKERS WHO WERE NOT PICKED GET THEIR JOBAS BACK, NOW ──────────
    // Applying costs the worker Jobas, held while the publisher decides. The
    // moment a DIFFERENT worker is picked, that hold has served its purpose:
    // the others can no longer be chosen for this task, so keeping their Jobas
    // locked is charging them for an outcome that is already settled. They are
    // released here, in the same breath as the approval, rather than waiting for
    // a terminal state that may be days away (or never come).
    //
    // The approved worker is excluded — their fee stays held, exactly as before,
    // until the task reaches a terminal state.
    let releasedCount = 0;
    let releasedTotal = 0;
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const notPicked = allApps.filter((a) => a.id !== applicationId && a.status === 'pending');
    const notPickedIds = new Set(notPicked.map((a) => a.id));
    for (const other of notPicked) {
      await base44.asServiceRole.entities.TaskApplication.update(other.id, { status: 'rejected' });
      const held = other.credits_charged || 0;
      if (held <= 0) continue;
      const otherUsers = await base44.asServiceRole.entities.User.filter({ id: other.worker_id });
      const otherWorker = otherUsers[0];
      if (!otherWorker) continue;
      const otherBalance = (otherWorker.worker_credits ?? 0) + held;
      await base44.asServiceRole.entities.User.update(otherWorker.id, { worker_credits: otherBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: other.worker_id,
        amount: held,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title || '',
        brand_id: task.origin_brand_id || null,
        balance_after: otherBalance,
        note: `נבחר עובד אחר למשימה "${task.title || ''}" — ${held} ג׳ובות הוחזרו`,
      });
      releasedCount += 1;
      releasedTotal += held;
    }
    console.log(`↩️ Released ${releasedTotal} Jobas to ${releasedCount} worker(s) not picked for task ${taskId}`);

    // The applicants list on the task is rebuilt from the applications
    // themselves (single source of truth), so the rejected workers drop off the
    // publisher's list at the same moment their Jobas come back.
    // `allApps` was read BEFORE the rejections above, so the workers just turned
    // away are still 'pending' in memory — they are excluded by id, not by the
    // stale status, or they would stay on the publisher's list.
    const activeApps = allApps.filter(
      (a) => !notPickedIds.has(a.id) && (a.status === 'pending' || a.status === 'approved'),
    );
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