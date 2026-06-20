import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Called when a publisher reopens an expired/cancelled task.
 * Refunds credits to all applicants and deletes/cancels all applications for that task.
 * Also resets task applicants array and price to base_price.
 *
 * Payload: { taskId }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });

    // Verify caller is the task owner
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Get all non-cancelled applications
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = apps.filter(a => a.status !== 'cancelled');

    let refundedCount = 0;

    // Batch-fetch all worker records to avoid N+1 queries
    const workerIds = [...new Set(activeApps.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
    const workerResults = await Promise.all(workerIds.map(id => base44.asServiceRole.entities.User.filter({ id })));
    const workerMap = {};
    workerResults.forEach(res => { if (res[0]) workerMap[res[0].id] = res[0]; });

    await Promise.all(activeApps.map(async (app) => {
      const creditsToRefund = app.credits_charged || 0;

      if (creditsToRefund > 0) {
        const worker = workerMap[app.worker_id];
        if (worker) {
          const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
          await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
          await base44.asServiceRole.entities.CreditTransaction.create({
            user_id: app.worker_id,
            amount: creditsToRefund,
            type: 'Refund_Expiration',
            task_id: taskId,
            task_title: task.title || '',
            balance_after: newBalance,
            note: 'החזר קרדיטים — המשימה פורסמה מחדש',
          });
          refundedCount++;
        }
      }

      // Mark application as cancelled
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'cancelled' });
    }));

    // Reset task: clear applicants array, reset price to base_price
    const resetPrice = task.base_price || task.price;
    await base44.asServiceRole.entities.Task.update(taskId, {
      applicants: [],
      price: resetPrice,
    });

    console.log(`✅ Reset ${activeApps.length} apps for task ${taskId}, refunded ${refundedCount} workers`);
    return Response.json({ success: true, apps_reset: activeApps.length, refunded: refundedCount });

  } catch (error) {
    console.error('❌ resetTaskApplications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});