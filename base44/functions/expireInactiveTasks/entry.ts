import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { syncTaskApplicants } from '../../shared/taskApplicants.ts';
import { fetchUserMap } from '../../shared/userLookup.ts';

/**
 * Cron job — runs every hour.
 * Expires OPEN tasks whose `expires_at` has passed, OR tasks older than 48h with no expiry set.
 * Refunds credits to ALL applicants (pending or approved).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow: scheduled cron (no auth token) OR authenticated admin users
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    // Unauthenticated requests are allowed (scheduled cron automation)

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

      // Every applicant's worker record is read in ONE query, not one query each.
      const workerIds = [...new Set(appsToRefund.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
      const workerMap = await fetchUserMap(base44.asServiceRole, workerIds);

      // Cancel every application in one call, then settle the refunds in batches
      // — this runs hourly over every expired task, so a per-applicant chain of
      // reads, updates and inserts multiplied across the whole batch.
      if (appsToRefund.length) {
        await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
          appsToRefund.map(a => ({ id: a.id, status: 'cancelled' }))
        );
      }

      const runningBalance = {};
      const userPatches = [];
      const ledgerRows = [];
      for (const app of appsToRefund) {
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
          task_id: task.id,
          task_title: task.title,
          balance_after: newBalance,
          note: `החזר ג'ובות - משימה "${task.title}" פגה תוקף`,
        });

        refundedCount++;
        console.log(`✅ Refunded ${creditsToRefund} credits to worker ${app.worker_id}`);
      }
      // The balance writes stay one call per worker — the User entity rejects a
      // batched update — but the application statuses and the whole ledger are
      // written in single calls now, which is where the round-trips actually were.
      if (userPatches.length) {
        await Promise.all(userPatches.map((p) => base44.asServiceRole.entities.User.update(p.id, { worker_credits: p.worker_credits })));
      }
      if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);

      // The task is EXPIRED — no application may still count towards its card.
      await syncTaskApplicants(base44.asServiceRole, task.id);
    }

    console.log(`✅ Done: ${expiredCount} tasks expired, ${refundedCount} refunds issued`);
    return Response.json({ success: true, expired: expiredCount, refunded: refundedCount });

  } catch (error) {
    console.error('❌ expireInactiveTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});