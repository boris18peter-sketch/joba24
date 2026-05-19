import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Cancels a task and refunds the client if payment was made.
// Called when owner cancels (any status) OR worker exits voluntarily.
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

    // Only the client (owner) or the assigned worker can cancel
    const isClient = task.client_id === user.id;
    const isWorker = task.worker_id === user.id;
    if (!isClient && !isWorker) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Refund Stripe payment if funded
    let refunded = false;
    if (task.payment_held || task.payment_status === 'funded' || task.payment_status === 'pending') {
      // Find the payment transaction for this task
      const transactions = await base44.asServiceRole.entities.Transaction.filter({ task_id: taskId });
      const paymentTx = transactions.find(t => t.type === 'payment' && t.status === 'completed');

      if (paymentTx) {
        // Find the PaymentIntent via Stripe search
        const amountAgorot = Math.round((task.payment_amount || task.price) * 100);
        const paymentIntents = await stripe.paymentIntents.list({ limit: 20 });
        const pi = paymentIntents.data.find(p =>
          p.metadata?.task_id === taskId && p.status === 'succeeded'
        );
        if (pi) {
          await stripe.refunds.create({ payment_intent: pi.id, amount: amountAgorot });
          refunded = true;
          // Record refund transaction
          await base44.asServiceRole.entities.Transaction.create({
            user_id: task.client_id,
            task_id: taskId,
            task_title: task.title,
            amount: task.payment_amount || task.price,
            type: 'payment',
            status: 'completed',
          });
        }
      }

      // Update task payment status
      await base44.asServiceRole.entities.Task.update(taskId, {
        payment_status: 'refunded',
        payment_held: false,
      });
    }

    // Cancel all active applications + refund credits to workers
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = apps.filter(a => a.status === 'pending' || a.status === 'approved');
    await Promise.all(activeApps.map(async (a) => {
      const creditsToRefund = a.credits_charged || 0;
      if (creditsToRefund > 0) {
        const workerUsers = await base44.asServiceRole.entities.User.filter({ id: a.worker_id });
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
            note: 'החזר קרדיטים - המשימה בוטלה על ידי המפרסם',
          });
        }
      }
      await base44.asServiceRole.entities.TaskApplication.update(a.id, { status: 'cancelled' });
    }));

    // If owner cancels AFTER worker started moving → reduce client trust_score by 5%
    const workerHasStarted = task.worker_status && task.worker_status !== null;
    if (isClient && workerHasStarted) {
      const clientUsers = await base44.asServiceRole.entities.User.filter({ id: task.client_id });
      const client = clientUsers[0];
      if (client) {
        const currentScore = client.trust_score ?? 1;
        const newScore = Math.max(0, Math.round((currentScore - 0.05) * 100) / 100);
        await base44.asServiceRole.entities.User.update(client.id, { trust_score: newScore });
        console.log(`⚠️ Client trust_score reduced: ${currentScore} → ${newScore}`);
      }
    }

    // Capture worker_id before clearing (for response — so client can signal worker)
    const cancelledWorkerId = task.worker_id;

    // Cancel the task
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'CANCELLED',
      worker_id: null,
      worker_name: null,
      worker_status: null,
    });

    return Response.json({ success: true, refunded, cancelledWorkerId, taskTitle: task.title, taskId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});