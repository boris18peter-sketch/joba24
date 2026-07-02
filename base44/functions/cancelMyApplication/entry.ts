import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * cancelMyApplication — Called by the WORKER to cancel their own pending application.
 * Refunds credits and marks application as cancelled.
 * Only works on PENDING applications (not approved).
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

    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
    const app = apps[0];
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });
    if (app.worker_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (app.status === 'cancelled' || app.status === 'rejected') {
      return Response.json({ success: true, note: 'Already cancelled' });
    }

    const creditsToRefund = app.credits_charged || 0;

    // Mark cancelled first
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'cancelled' });

    if (creditsToRefund > 0) {
      const workerUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const worker = workerUsers[0];
      if (worker) {
        const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
        await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
        await base44.asServiceRole.entities.CreditTransaction.create({
          user_id: user.id,
          amount: creditsToRefund,
          type: 'Refund_Rejection',
          task_id: taskId,
          task_title: app.task_title || '',
          balance_after: newBalance,
          note: `החזר קרדיטים - ביטול בקשה`,
        });
        console.log(`✅ Refunded ${creditsToRefund} credits to worker ${user.id}`);
      }
    }

    // Sync applicants array on task so feed cards stay in sync
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (task) {
      const currentApplicants = Array.isArray(task.applicants) ? task.applicants : [];
      await base44.asServiceRole.entities.Task.update(taskId, {
        applicants: currentApplicants.filter(a => a.worker_id !== user.id),
      });
    }

    // If this was the only pending applicant and task has auto_bump, unfreeze price
    if (task?.auto_bump_enabled && task?.base_price) {
      const remaining = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
      const activeRemaining = remaining.filter(a => a.status === 'pending' || a.status === 'approved');
      if (activeRemaining.length === 0) {
        await base44.asServiceRole.entities.Task.update(taskId, { price: task.base_price });
        console.log(`🔓 Auto-bump price reset to base price ₪${task.base_price} for task ${taskId}`);
      }
    }

    return Response.json({ success: true, refunded: creditsToRefund });

  } catch (error) {
    console.error('❌ cancelMyApplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});