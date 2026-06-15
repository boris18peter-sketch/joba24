import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'Missing taskId' }, { status: 400 });

    const tasks = await base44.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const feePercent = parseFloat(Deno.env.get('STRIPE_PLATFORM_FEE_PERCENT') || '15');
    const amountAgorot = Math.round((task.payment_amount || task.price) * 100);
    const platformFeeAgorot = Math.round(amountAgorot * feePercent / 100);
    const workerAmountAgorot = amountAgorot - platformFeeAgorot;

    let stripeTransferDone = false;

    // Transfer to worker's Stripe account if they have one connected
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

    // Update task status
    await base44.asServiceRole.entities.Task.update(taskId, {
      payment_status: 'funded',
      payment_held: false,
    });

    // Mark pending earning transactions as completed
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
      note: stripeTransferDone
        ? 'Transfer sent to worker Stripe account'
        : 'Worker has no Stripe account — funds remain on platform',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});