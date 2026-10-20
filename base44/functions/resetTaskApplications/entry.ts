import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { fetchUserMap } from '../../shared/userLookup.ts';

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

    // Every applicant's worker record is read in ONE query, not one query each.
    const workerIds = [...new Set(activeApps.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
    const workerMap = await fetchUserMap(base44.asServiceRole, workerIds);

    // Cancel every application in one call, then settle the refunds in batches.
    if (activeApps.length) {
      await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
        activeApps.map(a => ({ id: a.id, status: 'cancelled' }))
      );
    }

    const runningBalance = {};
    const userPatches = [];
    const ledgerRows = [];
    for (const app of activeApps) {
      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund <= 0) continue;

      const worker = workerMap[app.worker_id];
      if (!worker) continue;

      const base = runningBalance[worker.id] ?? (worker.worker_credits ?? 0);
      const newBalance = base + creditsToRefund;
      runningBalance[worker.id] = newBalance;
      userPatches.push({ id: worker.id, worker_credits: newBalance });
      ledgerRows.push({
        user_id: app.worker_id,
        amount: creditsToRefund,
        type: 'Refund_Expiration',
        task_id: taskId,
        task_title: task.title || '',
        balance_after: newBalance,
        brand_id: task.origin_brand_id || null,
        note: 'החזר ג\'ובות — המשימה פורסמה מחדש',
      });
      refundedCount++;
    }
    // The balance writes stay one call per worker — the User entity rejects a
    // batched update — but the application statuses and the whole ledger are
    // written in single calls now, which is where the round-trips actually were.
    if (userPatches.length) {
      await Promise.all(userPatches.map((p) => base44.asServiceRole.entities.User.update(p.id, { worker_credits: p.worker_credits })));
    }
    if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);

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