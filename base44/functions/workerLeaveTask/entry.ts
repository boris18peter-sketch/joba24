import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * workerLeaveTask — Called by the WORKER to voluntarily exit a TAKEN task.
 * 1. Refunds credits for their approved application
 * 2. Sends a chat notification to the task owner
 * 3. Resets task to OPEN
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
    if (task.worker_id !== user.id) return Response.json({ error: 'Forbidden — you are not the worker' }, { status: 403 });

    // Find the worker's approved/pending application
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId, worker_id: user.id });
    const activeApps = apps.filter(a => a.status === 'approved' || a.status === 'pending');

    // Fetch worker once (outside the loop — avoid N+1)
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const worker = workerUsers[0];

    // Refund credits for all active applications (should be 1)
    await Promise.all(activeApps.map(async (app) => {
      const creditsToRefund = app.credits_charged || 0;
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'cancelled' });

      if (creditsToRefund <= 0 || !worker) return;

      const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
      await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: user.id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        balance_after: newBalance,
        note: `החזר קרדיטים - יציאה מרצון מהמשימה "${task.title}"`,
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to worker ${user.id}`);
    }));

    // Notify task owner via chat
    if (task.client_id) {
      await base44.asServiceRole.entities.ChatMessage.create({
        task_id: taskId,
        sender_id: user.id,
        sender_name: user.full_name,
        content: `👋 ${user.full_name} יצא מהמשימה. המשימה חזרה להיות פתוחה — תוכל לאשר בקשות קיימות או לקבל חדשות.`,
      });
    }

    // Reset task to OPEN and clear worker data
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'OPEN',
      worker_id: null,
      worker_name: null,
      worker_status: null,
      worker_rating: null,
      worker_verified: false,
      on_the_way_at: null,
      arrived_at: null,
    });

    console.log(`✅ Worker ${user.id} left task ${taskId}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('❌ workerLeaveTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});