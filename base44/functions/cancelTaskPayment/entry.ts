import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * cancelTaskPayment — Cancels a task and refunds credits to all applicants.
 * Can be called by:
 *   - Task owner (any status before COMPLETED)
 *   - Assigned worker (voluntary exit)
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

    const isClient = task.client_id === user.id;
    const isWorker = task.worker_id === user.id;
    if (!isClient && !isWorker) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Prevent cancelling a completed task
    if (task.status === 'COMPLETED') return Response.json({ error: 'Task already completed' }, { status: 409 });

    // Refund credits to ALL active applicants (pending + approved)
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = apps.filter(a => a.status === 'pending' || a.status === 'approved');

    // Fetch all worker records in one batch to avoid N+1 queries
    const workerIds = [...new Set(activeApps.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
    const workerRecords = workerIds.length > 0
      ? await Promise.all(workerIds.map(id => base44.asServiceRole.entities.User.filter({ id })))
      : [];
    const workerMap = {};
    workerRecords.forEach(res => { if (res[0]) workerMap[res[0].id] = res[0]; });

    await Promise.all(activeApps.map(async (app) => {
      const creditsToRefund = app.credits_charged || 0;
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'cancelled' });

      if (creditsToRefund <= 0) return;

      const worker = workerMap[app.worker_id];
      if (!worker) return;

      const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
      await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: worker.id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        balance_after: newBalance,
        note: isClient
          ? `החזר קרדיטים - המשימה "${task.title}" בוטלה על ידי המפרסם`
          : `החזר קרדיטים - המשימה "${task.title}" בוטלה על ידי העובד`,
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to worker ${worker.id}`);
    }));

    // Penalize client trust_score if cancelling after worker started moving
    const workerHasStarted = !!task.worker_status;
    if (isClient && workerHasStarted) {
      const clientUsers = await base44.asServiceRole.entities.User.filter({ id: task.client_id });
      const client = clientUsers[0];
      if (client) {
        const newScore = Math.max(0, Math.round(((client.trust_score ?? 1) - 0.05) * 100) / 100);
        await base44.asServiceRole.entities.User.update(client.id, { trust_score: newScore });
        console.log(`⚠️ Client trust_score reduced to ${newScore}`);
      }
    }

    const cancelledWorkerId = task.worker_id;

    // Cancel the task and clear worker assignment
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'CANCELLED',
      worker_id: null,
      worker_name: null,
      worker_status: null,
    });

    console.log(`✅ Task ${taskId} cancelled by ${isClient ? 'client' : 'worker'}`);
    return Response.json({ success: true, cancelledWorkerId, taskTitle: task.title, taskId });

  } catch (error) {
    console.error('❌ cancelTaskPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});