import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Cron job — runs every hour.
 * Expires OPEN tasks whose `expires_at` has passed, OR tasks older than 48h with no expiry set.
 * Refunds credits to ALL applicants (pending or approved).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date().toISOString();
    const fallbackCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Fetch all OPEN tasks
    const openTasks = await base44.asServiceRole.entities.Task.filter({ status: 'OPEN' });

    const expiredTasks = openTasks.filter(t => {
      if (t.expires_at) return t.expires_at < now;
      return t.created_date && t.created_date < fallbackCutoff;
    });

    if (expiredTasks.length === 0) {
      console.log('✅ No expired tasks found');
      return Response.json({ success: true, expired: 0 });
    }

    let expiredCount = 0;
    let refundedCount = 0;

    for (const task of expiredTasks) {
      console.log(`🔄 Expiring task: ${task.id} (${task.title})`);

      await base44.asServiceRole.entities.Task.update(task.id, { status: 'EXPIRED' });
      expiredCount++;

      const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: task.id });
      const appsToRefund = apps.filter(a => a.status === 'pending' || a.status === 'approved');

      await Promise.all(appsToRefund.map(async (app) => {
        // Mark cancelled first
        await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'cancelled' });

        const creditsToRefund = app.credits_charged || 0;
        if (creditsToRefund <= 0) return;

        const workerUsers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
        const worker = workerUsers[0];
        if (!worker) return;

        const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
        await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });

        await base44.asServiceRole.entities.CreditTransaction.create({
          user_id: app.worker_id,
          amount: creditsToRefund,
          type: 'Refund_Expiration',
          task_id: task.id,
          task_title: task.title,
          balance_after: newBalance,
          note: `החזר קרדיטים - משימה "${task.title}" פגה תוקף`,
        });

        refundedCount++;
        console.log(`✅ Refunded ${creditsToRefund} credits to worker ${app.worker_id}`);
      }));
    }

    console.log(`✅ Done: ${expiredCount} tasks expired, ${refundedCount} refunds issued`);
    return Response.json({ success: true, expired: expiredCount, refunded: refundedCount });

  } catch (error) {
    console.error('❌ expireInactiveTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});