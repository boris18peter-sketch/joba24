import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by task owner to report a worker no-show.
// Resets task to OPEN, rejects worker's app (NO credit refund = penalty), reduces worker trust_score by 5%.
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

    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const noShowWorkerId = task.worker_id;

    // Reject the approved application WITHOUT refunding credits (penalty)
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const approvedApp = apps.find(a => a.status === 'approved');
    if (approvedApp) {
      await base44.asServiceRole.entities.TaskApplication.update(approvedApp.id, { status: 'rejected' });
    }

    // Reduce worker trust_score by 5%
    if (noShowWorkerId) {
      const workerUsers = await base44.asServiceRole.entities.User.filter({ id: noShowWorkerId });
      const worker = workerUsers[0];
      if (worker) {
        const currentScore = worker.trust_score ?? 1;
        const newScore = Math.max(0, Math.round((currentScore - 0.05) * 100) / 100);
        await base44.asServiceRole.entities.User.update(worker.id, { trust_score: newScore });
      }
    }

    // Reset task to OPEN
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'OPEN',
      worker_id: null,
      worker_name: null,
      worker_status: null,
      on_the_way_at: null,
    });

    return Response.json({ success: true, noShowWorkerId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});