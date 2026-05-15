import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { taskId, taskData } = body;

    // Determine price and worker info
    let price, workerId, existingTaskId;

    if (taskId) {
      // Paying for an existing task (TAKEN flow)
      const tasks = await base44.entities.Task.filter({ id: taskId });
      const task = tasks[0];
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
      if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      price = task.price;
      workerId = task.worker_id;
      existingTaskId = taskId;
    } else if (taskData) {
      // New task publication — payment before task is created
      if (!taskData.price || taskData.price <= 0) return Response.json({ error: 'Invalid price' }, { status: 400 });
      price = taskData.price;
      workerId = null;
      existingTaskId = null;
    } else {
      return Response.json({ error: 'Must provide taskId or taskData' }, { status: 400 });
    }

    const amountAgorot = Math.round(price * 100);
    const feePercent = parseFloat(Deno.env.get('STRIPE_PLATFORM_FEE_PERCENT') || '15');
    const platformFeeAgorot = Math.round(amountAgorot * feePercent / 100);

    // Check if worker has a connected Stripe account
    let transferData = undefined;
    if (workerId) {
      const workerAccounts = await base44.asServiceRole.entities.StripeAccount.filter({ user_id: workerId });
      const workerAccount = workerAccounts.find(a => a.payouts_enabled);
      if (workerAccount) {
        transferData = {
          destination: workerAccount.stripe_account_id,
          amount: amountAgorot - platformFeeAgorot,
        };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountAgorot,
      currency: 'ils',
      metadata: {
        task_id: existingTaskId || '',
        client_id: user.id,
        worker_id: workerId || '',
        platform_fee: platformFeeAgorot,
        // Store task data for webhook to create task after payment
        ...(taskData ? { pending_task_data: JSON.stringify({ ...taskData, client_id: user.id, client_name: user.full_name }) } : {}),
      },
      ...(transferData ? { transfer_data: transferData } : {}),
      automatic_payment_methods: { enabled: true },
    });

    // For existing tasks: mark as payment pending
    if (existingTaskId) {
      await base44.entities.Task.update(existingTaskId, {
        payment_status: 'pending',
        payment_amount: price,
      });
    }

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: price,
      platformFee: platformFeeAgorot / 100,
      workerReceives: (amountAgorot - platformFeeAgorot) / 100,
      feePercent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});