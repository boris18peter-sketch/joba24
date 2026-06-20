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

    if (!taskId || !applicationId || !workerId || !workerName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch task via service role
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Verify caller is the task owner
    if (task.client_id !== user.id) {
      return Response.json({ error: 'Forbidden — not task owner' }, { status: 403 });
    }

    // Concurrency guard: task must still be OPEN with no worker assigned
    if (task.status !== 'OPEN' || task.worker_id) {
      return Response.json({ error: 'already_assigned', note: 'Task is no longer open' }, { status: 409 });
    }

    // Verify application is still pending
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
    const app = apps[0];
    if (!app || app.status !== 'pending') {
      return Response.json({ error: 'Application no longer pending' }, { status: 409 });
    }

    // Assign worker to task
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
      worker_rating: app.worker_rating || 0,
      worker_verified: app.worker_verified || false,
    });
    console.log('✅ TASK UPDATED:', taskId);

    // Approve the application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, {
      status: 'approved'
    });
    console.log('✅ APPLICATION APPROVED');

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