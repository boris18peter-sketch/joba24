import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * approveWorker — Assigns a worker to a task, approves their application,
 * rejects all other pending applications, and returns the updated task.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, applicationId, workerId, workerName } = await req.json();
    if (!taskId || !applicationId || !workerId || !workerName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify requester owns the task
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch worker profile for rating/verified data to store on task
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const workerUser = workerUsers?.[0];

    // Update task atomically
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
      worker_rating: workerUser?.rating ?? null,
      worker_verified: workerUser?.is_verified ?? false,
    });

    // Approve the selected application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'approved' });

    // Reject all other pending applications for this task
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const others = allApps.filter(a => a.id !== applicationId && a.status === 'pending');
    await Promise.all(others.map(a =>
      base44.asServiceRole.entities.TaskApplication.update(a.id, { status: 'rejected' })
    ));
    console.log(`✅ Approved worker ${workerId} for task ${taskId}. Rejected ${others.length} other apps.`);

    // Return fresh task data
    const freshTasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    return Response.json({ success: true, task: freshTasks[0] });

  } catch (error) {
    console.error('❌ approveWorker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});