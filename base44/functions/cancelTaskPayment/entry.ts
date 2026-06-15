import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

/**
 * cancelTaskPayment — Cancels a task and refunds the client if Stripe payment was made.
 * Can be called by:
 *   - Task owner (any status before COMPLETED)
 *   - Assigned worker (voluntary exit)
 */
Deno.serve(async (req) => {
  try {
    // Init Stripe inside handler — module-level init crashes on missing secret
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'Missing taskId' }, { status: 400 });

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    const isClient = task.client_id === user.id;
    const isWorker = task.worker_id === user.id;
    if (!isClient && !isWorker) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Prevent cancelling a completed task
    if (task.status === 'COMPLETED') return Response.json({ error: 'Task already completed' }, { status: 409 });

    // Refund Stripe payment if payment was held/funded
    let refunded = false;
    if (task.payment_held || task.payment_status === 'funded' || task.payment_status === 'pending') {
      const transactions = await base44.asServiceRole.entities.Transaction.filter({ task_id: taskId });
      const paymentTx = transactions.find(t => t.type === 'payment' && t.status === 'completed');

      if (paymentTx) {
        const amountAgorot = Math.round((task.payment_amount || task.price) * 100);
        // Search for the PaymentIntent by task metadata
        const paymentIntents = await stripe.paymentIntents.list({ limit: 20 });
        const pi = paymentIntents.data.find(p =>
          p.metadata?.task_id === taskId && p.status === 'succeeded'
        );
        if (pi) {
          await stripe.refunds.create({ payment_intent: pi.id, amount: amountAgorot });
          refunded = true;
          // Log refund as a withdrawal record
          await base44.asServiceRole.entities.Transaction.create({
            user_id: task.client_id,
            task_id: taskId,
            task_title: task.title,
            amount: task.payment_amount || task.price,
            type: 'withdrawal',
            status: 'completed',
          });
          console.log(`✅ Stripe refund issued: ₪${amountAgorot / 100} for task ${taskId}`);
        }
      }

      await base44.asServiceRole.entities.Task.update(taskId, {
        payment_status: 'refunded',
        payment_held: false,
      });
    }

    // Refund credits to ALL active applicants (pending + approved)
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = apps.filter(a => a.status === 'pending' || a.status === 'approved');

    await Promise.all(activeApps.map(async (app) => {
      const creditsToRefund = app.credits_charged || 0;
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'cancelled' });

      if (creditsToRefund <= 0) return;

      const workerUsers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
      const worker = workerUsers[0];
      if (!worker) return;

      const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
      await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: worker.id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        balance_after: newBalance,
        note: isClient
          ? `החזר קרדיטים - המשימה "${task.title}" בוטלה על ידי המפרסם`
          : `החזר קרדיטים - המשימה "${task.title}" בוטלה על ידי העובד`,
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to worker ${worker.id}`);
    }));

    // Penalize client trust_score if cancelling after worker started moving
    const workerHasStarted = !!task.worker_status;
    if (isClient && workerHasStarted) {
      const clientUsers = await base44.asServiceRole.entities.User.filter({ id: task.client_id });
      const client = clientUsers[0];
      if (client) {
        const newScore = Math.max(0, Math.round(((client.trust_score ?? 1) - 0.05) * 100) / 100);
        await base44.asServiceRole.entities.User.update(client.id, { trust_score: newScore });
        console.log(`⚠️ Client trust_score reduced to ${newScore}`);
      }
    }

    const cancelledWorkerId = task.worker_id;

    // Cancel the task and clear worker assignment
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'CANCELLED',
      worker_id: null,
      worker_name: null,
      worker_status: null,
    });

    console.log(`✅ Task ${taskId} cancelled by ${isClient ? 'client' : 'worker'}`);
    return Response.json({ success: true, refunded, cancelledWorkerId, taskTitle: task.title, taskId });

  } catch (error) {
    console.error('❌ cancelTaskPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});