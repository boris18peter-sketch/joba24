import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cron job — runs every hour.
 * Finds OPEN tasks older than 48h with no worker approved,
 * cancels them, and refunds all applicants.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Fetch all OPEN tasks
    const openTasks = await base44.asServiceRole.entities.Task.filter({ status: 'OPEN' });

    // Filter: created more than 48h ago
    const staleTasks = openTasks.filter(t => t.created_date && t.created_date < cutoff);

    if (staleTasks.length === 0) {
      console.log('✅ No stale tasks found');
      return Response.json({ success: true, cancelled: 0 });
    }

    let cancelledCount = 0;
    let refundedCount = 0;

    for (const task of staleTasks) {
      console.log(`🔄 Cancelling stale task: ${task.id} (${task.title})`);

      // Cancel task
      await base44.asServiceRole.entities.Task.update(task.id, { status: 'CANCELLED' });
      cancelledCount++;

      // Find all pending applications for this task
      const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: task.id });
      const pendingApps = apps.filter(a => a.status === 'pending');

      for (const app of pendingApps) {
        const creditsToRefund = app.credits_charged || 0;
        if (creditsToRefund <= 0) continue;

        // Fetch worker
        const users = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
        const worker = users[0];
        if (!worker) continue;

        const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;

        // Refund credits
        await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });

        // Mark application cancelled
        await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'cancelled' });

        // Log transaction
        await base44.asServiceRole.entities.CreditTransaction.create({
          user_id: app.worker_id,
          amount: creditsToRefund,
          type: 'Refund_Expiration',
          task_id: task.id,
          task_title: task.title,
          balance_after: newBalance,
          note: `החזר קרדיטים - משימה "${task.title}" בוטלה אוטומטית לאחר 48 שעות`,
        });

        refundedCount++;
        console.log(`✅ Refunded ${creditsToRefund} credits to worker ${app.worker_id}`);
      }
    }

    console.log(`✅ Done: ${cancelledCount} tasks cancelled, ${refundedCount} refunds issued`);
    return Response.json({ success: true, cancelled: cancelledCount, refunded: refundedCount });

  } catch (error) {
    console.error('❌ expireInactiveTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});