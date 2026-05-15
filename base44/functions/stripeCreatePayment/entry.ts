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

    // Fetch the task
    const tasks = await base44.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Must be task owner
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const amountAgorot = Math.round(task.price * 100); // Stripe uses smallest currency unit
    const feePercent = parseFloat(Deno.env.get('STRIPE_PLATFORM_FEE_PERCENT') || '15');
    const platformFee = Math.round(amountAgorot * feePercent / 100);

    // Check if worker has a connected Stripe account
    let transferData = undefined;
    if (task.worker_id) {
      const workerAccounts = await base44.asServiceRole.entities.StripeAccount.filter({ user_id: task.worker_id });
      const workerAccount = workerAccounts.find(a => a.payouts_enabled);
      if (workerAccount) {
        transferData = {
          destination: workerAccount.stripe_account_id,
          amount: amountAgorot - platformFee,
        };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountAgorot,
      currency: 'ils',
      metadata: {
        task_id: taskId,
        client_id: user.id,
        worker_id: task.worker_id || '',
        platform_fee: platformFee,
      },
      ...(transferData ? { transfer_data: transferData } : {}),
      automatic_payment_methods: { enabled: true },
    });

    // Update task payment status
    await base44.entities.Task.update(taskId, {
      payment_status: 'pending',
      payment_amount: task.price,
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: task.price,
      platformFee: platformFee / 100,
      workerReceives: (amountAgorot - platformFee) / 100,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});