import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by task owner to cancel an approved worker BEFORE they start moving.
// Refunds credits to the approved worker AND all remaining pending applicants.
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

    if (task.worker_status) {
      return Response.json({ error: 'Worker already on the way — cannot cancel from here' }, { status: 409 });
    }

    const cancelledWorkerId = task.worker_id;

    // Fetch ALL applications for this task
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });

    // Refund approved + pending applicants
    for (const app of apps) {
      if (app.status !== 'approved' && app.status !== 'pending') continue;

      const creditsToRefund = app.credits_charged || 0;
      const note = app.status === 'approved'
        ? 'החזר קרדיטים - בעל המשימה ביטל את בחירתך'
        : 'החזר קרדיטים - בעל המשימה ביטל את המשימה';

      // Mark as rejected
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'rejected' });

      if (creditsToRefund > 0) {
        const workerUsers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
        const worker = workerUsers[0];
        if (worker) {
          const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
          await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
          await base44.asServiceRole.entities.CreditTransaction.create({
            user_id: worker.id,
            amount: creditsToRefund,
            type: 'Refund_Rejection',
            task_id: taskId,
            task_title: task.title,
            balance_after: newBalance,
            note,
          });
          console.log(`✅ Refunded ${creditsToRefund} credits to worker ${worker.id} (was ${app.status})`);
        }
      }
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