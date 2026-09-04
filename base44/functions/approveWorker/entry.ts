import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Assign worker to task
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: resolvedWorkerName,
      worker_rating: app.worker_rating || 0,
      worker_verified: app.worker_verified || false,
    });
    console.log('✅ TASK UPDATED:', taskId);

    // Approve the application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, {
      status: 'approved'
    });
    console.log('✅ APPLICATION APPROVED');

    // NOTE: Other pending applications are NOT refunded here.
    // They stay "pending" so they remain valid if the approved worker is later cancelled.
    // Credits are only refunded at terminal states: COMPLETED, CANCELLED, or EXPIRED.

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