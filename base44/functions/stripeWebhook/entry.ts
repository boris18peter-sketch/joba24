import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      return Response.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 });
    }

    const { type, data } = event;

    if (type === 'payment_intent.succeeded') {
      const pi = data.object;
      const taskId = pi.metadata?.task_id;
      const workerId = pi.metadata?.worker_id;
      const platformFee = parseInt(pi.metadata?.platform_fee || '0');
      const totalAgorot = pi.amount;
      const workerAmount = (totalAgorot - platformFee) / 100;

      if (taskId) {
        await base44.asServiceRole.entities.Task.update(taskId, {
          payment_status: 'funded',
          payment_held: true,
        });

        // Record transaction for client (payment)
        const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
        const task = tasks[0];
        if (task) {
          await base44.asServiceRole.entities.Transaction.create({
            user_id: task.client_id,
            task_id: taskId,
            task_title: task.title,
            amount: totalAgorot / 100,
            type: 'payment',
            status: 'completed',
          });

          // If worker already assigned, record earning transaction
          if (workerId) {
            await base44.asServiceRole.entities.Transaction.create({
              user_id: workerId,
              task_id: taskId,
              task_title: task.title,
              amount: workerAmount,
              type: 'earning',
              status: 'pending', // pending until task complete
            });
          }
        }
      }
    }

    if (type === 'account.updated') {
      const account = data.object;
      const accounts = await base44.asServiceRole.entities.StripeAccount.filter({
        stripe_account_id: account.id
      });
      if (accounts.length > 0) {
        await base44.asServiceRole.entities.StripeAccount.update(accounts[0].id, {
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
          onboarding_complete: account.payouts_enabled && account.charges_enabled,
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});