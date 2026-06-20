import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * completeTask — Called by the task owner (client) to confirm task completion.
 * 1. Marks task as COMPLETED
 * 2. Sets client_confirmed = true
 * 3. Increments worker's tasks_completed count
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'Missing taskId' }, { status: 400 });

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Only the client (owner) can confirm completion
    if (task.client_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (task.status === 'COMPLETED') {
      return Response.json({ success: true, note: 'Already completed' });
    }

    // Mark task as COMPLETED
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'COMPLETED',
      client_confirmed: true,
      completed_at: new Date().toISOString(),
    });

    // Increment worker's completed tasks count — only if not already incremented (idempotency guard)
    if (task.worker_id && !task.client_confirmed) {
      const workerUsers = await base44.asServiceRole.entities.User.filter({ id: task.worker_id });
      const worker = workerUsers[0];
      if (worker) {
        const newCount = (worker.tasks_completed ?? 0) + 1;
        await base44.asServiceRole.entities.User.update(worker.id, { tasks_completed: newCount });
        console.log(`✅ Worker ${worker.id} tasks_completed → ${newCount}`);
      }
    }

    console.log(`✅ Task ${taskId} marked COMPLETED by client ${user.id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ completeTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});