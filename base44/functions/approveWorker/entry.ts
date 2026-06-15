import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * approveWorker — Called by task owner to approve a worker's application.
 * 1. Sets task status to TAKEN with worker info
 * 2. Marks application as approved
 * 3. Rejects all other pending applications (no refund — they stay in the pool)
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

    // Verify requester is the task owner
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch worker info for rating/verification
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const worker = workerUsers[0];

    // Update task with worker assignment
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
      worker_rating: worker?.rating ?? null,
      worker_verified: worker?.is_verified ?? false,
    });

    // Approve this application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, {
      status: 'approved',
    });

    // Fetch fresh task to return to client
    const freshTaskData = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const updatedTask = freshTaskData[0];

    if (!updatedTask || updatedTask.worker_id !== workerId) {
      console.error('❌ Data consistency error after approveWorker');
      return Response.json({ error: 'Data consistency error' }, { status: 500 });
    }

    console.log(`✅ Worker ${workerId} approved for task ${taskId}`);
    return Response.json({ success: true, task: updatedTask });

  } catch (error) {
    console.error('❌ approveWorker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});