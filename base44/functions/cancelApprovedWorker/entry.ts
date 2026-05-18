import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by task owner to cancel an approved worker BEFORE they start moving.
// Only valid while task status is TAKEN and worker_status is null.
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

    // Only the task owner can cancel
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Only allowed before worker starts moving
    if (task.worker_status) {
      return Response.json({ error: 'Worker already on the way — cannot cancel from here' }, { status: 409 });
    }

    const cancelledWorkerId = task.worker_id;

    // Find and reject the approved application + refund credits
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const approvedApp = apps.find(a => a.status === 'approved');
    if (approvedApp) {
      const creditsToRefund = approvedApp.credits_charged || 0;
      if (creditsToRefund > 0) {
        const workerUsers = await base44.asServiceRole.entities.User.filter({ id: approvedApp.worker_id });
        const worker = workerUsers[0];
        if (worker) {
          const currentCredits = worker.worker_credits ?? 0;
          const newBalance = currentCredits + creditsToRefund;
          await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
          await base44.asServiceRole.entities.CreditTransaction.create({
            user_id: worker.id,
            amount: creditsToRefund,
            type: 'Refund_Rejection',
            task_id: taskId,
            task_title: task.title,
            balance_after: newBalance,
            note: 'החזר קרדיטים - בעל המשימה ביטל את בחירתך',
          });
        }
      }
      await base44.asServiceRole.entities.TaskApplication.update(approvedApp.id, { status: 'rejected' });
    }

    // Reset task to OPEN
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'OPEN',
      worker_id: null,
      worker_name: null,
      worker_status: null,
    });

    return Response.json({ success: true, cancelledWorkerId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});