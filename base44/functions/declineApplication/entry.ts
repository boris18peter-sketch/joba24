import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * declineApplication — Publisher declines a pending application.
 * - Validates caller is the task owner
 * - Checks application is still "pending" (idempotency / double-click guard)
 * - Marks application as "rejected"
 * - Refunds credits to worker
 * - If no more active applications remain, unfreezes auto-bump (resets price to base_price)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { applicationId, taskId } = await req.json();
    if (!applicationId || !taskId) {
      return Response.json({ error: 'applicationId and taskId required' }, { status: 400 });
    }

    // Fetch application
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
    const app = apps[0];
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });

    // Idempotency: if already rejected/cancelled, return 409 — no double refund
    if (app.status === 'rejected' || app.status === 'cancelled') {
      return Response.json({ error: 'Application already declined', code: 'already_declined' }, { status: 409 });
    }
    if (app.status !== 'pending') {
      return Response.json({ error: 'Only pending applications can be declined' }, { status: 400 });
    }

    // Fetch task and verify caller is the owner
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) {
      return Response.json({ error: 'Forbidden — not task owner' }, { status: 403 });
    }

    // Mark application as rejected
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'rejected' });

    // Rebuild applicants array from actual TaskApplication records (single source of truth)
    const allAppsAfter = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeAppsAfter = allAppsAfter.filter(a => a.status === 'pending' || a.status === 'approved');
    await base44.asServiceRole.entities.Task.update(taskId, {
      applicants: activeAppsAfter.map(a => ({
        worker_id: a.worker_id,
        worker_name: a.worker_name,
        applied_at: a.created_date,
      })),
    });

    // Refund credits to worker
    const creditsToRefund = app.credits_charged || 0;
    if (creditsToRefund > 0) {
      const workers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
      const worker = workers[0];
      if (worker) {
        const currentCredits = worker.worker_credits ?? 0;
        const newBalance = currentCredits + creditsToRefund;
        await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
        await base44.asServiceRole.entities.CreditTransaction.create({
          user_id: app.worker_id,
          amount: creditsToRefund,
          type: 'Refund_Rejection',
          task_id: taskId,
          task_title: task.title,
          balance_after: newBalance,
          note: `הבקשה למשימה "${task.title}" נדחתה על ידי המפרסם — ${creditsToRefund} ג׳ובות הוחזרו`,
        });
      }
    }

    // Reuse activeAppsAfter (already queried above) for auto-bump check
    if (activeAppsAfter.length === 0 && task.auto_bump_enabled && task.base_price) {
      // Reset price back to base_price so auto-bump can continue
      await base44.asServiceRole.entities.Task.update(taskId, { price: task.base_price });
    }

    return Response.json({
      success: true,
      refunded: creditsToRefund,
      auto_bump_resumed: activeAppsAfter.length === 0 && task.auto_bump_enabled,
    });

  } catch (error) {
    console.error('❌ declineApplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});