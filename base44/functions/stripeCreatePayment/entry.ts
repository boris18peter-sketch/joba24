import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    // Init Stripe inside handler — module-level init crashes on missing secret
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { taskId, taskData } = body;

    let price, workerId, existingTaskId;

    if (taskId) {
      const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
      const task = tasks[0];
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
      if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      price = task.price;
      workerId = task.worker_id;
      existingTaskId = taskId;
    } else if (taskData) {
      if (!taskData.price || taskData.price <= 0) return Response.json({ error: 'Invalid price' }, { status: 400 });
      price = parseFloat(taskData.price);
      workerId = null;
      existingTaskId = null;
    } else {
      return Response.json({ error: 'Must provide taskId or taskData' }, { status: 400 });
    }

    const storyFeeAgorot = (taskData?.is_story && !taskId) ? 500 : 0;
    const taskPriceAgorot = Math.round((taskId ? price : parseFloat(taskData?.price || 0)) * 100);
    const amountAgorot = taskPriceAgorot + storyFeeAgorot;
    const feePercent = parseFloat(Deno.env.get('STRIPE_PLATFORM_FEE_PERCENT') || '15');
    const taskFeeAgorot = Math.round(taskPriceAgorot * feePercent / 100);
    const platformFeeAgorot = taskFeeAgorot + storyFeeAgorot;

    let transferData = undefined;
    if (workerId) {
      const workerAccounts = await base44.asServiceRole.entities.StripeAccount.filter({ user_id: workerId });
      const workerAccount = workerAccounts.find(a => a.payouts_enabled);
      if (workerAccount) {
        transferData = {
          destination: workerAccount.stripe_account_id,
          amount: taskPriceAgorot - taskFeeAgorot,
        };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountAgorot,
      currency: 'ils',
      capture_method: 'automatic',
      metadata: {
        task_id: existingTaskId || '',
        client_id: user.id,
        worker_id: workerId || '',
        platform_fee: platformFeeAgorot,
        ...(taskData ? { pending_task_data: JSON.stringify({ ...taskData, price: parseFloat(taskData.price), payment_amount: price, client_id: user.id, client_name: user.full_name }) } : {}),
      },
      automatic_payment_methods: { enabled: true },
    });

    if (existingTaskId) {
      await base44.asServiceRole.entities.Task.update(existingTaskId, {
        payment_status: 'pending',
        payment_amount: price,
      });
    }

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: (Deno.env.get('STRIPE_PUBLISHABLE_KEY') || Deno.env.get('VITE_STRIPE_PUBLISHABLE_KEY') || '').trim(),
      amount: amountAgorot / 100,
      platformFee: platformFeeAgorot / 100,
      storyFee: storyFeeAgorot / 100,
      workerReceives: (taskPriceAgorot - taskFeeAgorot) / 100,
      feePercent,
    });
  } catch (error) {
    console.error('❌ stripeCreatePayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});