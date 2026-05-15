import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'Missing taskId' }, { status: 400 });

    // Get task
    const tasks = await base44.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Only the client (task owner) can release payment
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Find the PaymentIntent for this task via Stripe search
    const paymentIntents = await stripe.paymentIntents.search({
      query: `metadata['task_id']:'${taskId}' AND status:'succeeded'`,
      limit: 5,
    });

    // Also try "requires_capture" status (if using manual capture)
    const allPIs = paymentIntents.data;

    if (allPIs.length === 0) {
      // Fallback: search by status requires_capture
      const piCapture = await stripe.paymentIntents.search({
        query: `metadata['task_id']:'${taskId}' AND status:'requires_capture'`,
        limit: 5,
      });
      allPIs.push(...piCapture.data);
    }

    if (allPIs.length === 0) {
      // Payment already transferred (automatic capture) — just update DB
      console.log('No capturable PI found — payment likely auto-captured. Updating DB only.');
    }

    const pi = allPIs[0];
    const feePercent = parseFloat(Deno.env.get('STRIPE_PLATFORM_FEE_PERCENT') || '15');
    const amountAgorot = task.payment_amount ? Math.round(task.payment_amount * 100) : Math.round(task.price * 100);
    const platformFeeAgorot = Math.round(amountAgorot * feePercent / 100);
    const workerAmountAgorot = amountAgorot - platformFeeAgorot;

    // If PI needs capture, capture it now
    if (pi?.status === 'requires_capture') {
      await stripe.paymentIntents.capture(pi.id);
    }

    // Transfer to worker's Stripe account if they have one
    let stripeTransferDone = false;
    if (task.worker_id) {
      const workerAccounts = await base44.asServiceRole.entities.StripeAccount.filter({ user_id: task.worker_id });
      const workerAccount = workerAccounts.find(a => a.payouts_enabled);
      if (workerAccount) {
        await stripe.transfers.create({
          amount: workerAmountAgorot,
          currency: 'ils',
          destination: workerAccount.stripe_account_id,
          transfer_group: taskId,
          metadata: { task_id: taskId, worker_id: task.worker_id },
        });
        stripeTransferDone = true;
      }
    }

    // Update task: payment released
    await base44.asServiceRole.entities.Task.update(taskId, {
      payment_status: 'funded',
      payment_held: false,
    });

    // Update transactions
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ task_id: taskId });
    for (const tx of transactions) {
      if (tx.type === 'earning' && tx.status === 'pending') {
        await base44.asServiceRole.entities.Transaction.update(tx.id, { status: 'completed' });
      }
    }

    return Response.json({
      success: true,
      stripeTransferDone,
      workerAmount: workerAmountAgorot / 100,
      platformFee: platformFeeAgorot / 100,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});