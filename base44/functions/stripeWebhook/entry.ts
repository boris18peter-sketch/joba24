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
        // Existing task — mark as funded
        await base44.asServiceRole.entities.Task.update(taskId, {
          payment_status: 'funded',
          payment_held: true,
        });

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

          if (workerId) {
            await base44.asServiceRole.entities.Transaction.create({
              user_id: workerId,
              task_id: taskId,
              task_title: task.title,
              amount: workerAmount,
              type: 'earning',
              status: 'pending',
            });
          }
        }
      } else if (pi.metadata?.pending_task_data) {
        // New task — create it now after successful payment
        let pendingData;
        try {
          pendingData = JSON.parse(pi.metadata.pending_task_data);
        } catch (e) {
          console.error('Failed to parse pending_task_data:', e.message);
        }

        if (pendingData) {
          const expiryHours = pendingData.expiry_duration_hours || 24;
          const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

          const newTask = await base44.asServiceRole.entities.Task.create({
            ...pendingData,
            payment_status: 'funded',
            payment_held: true,
            payment_amount: totalAgorot / 100,
            status: 'OPEN',
            expires_at: expiresAt,
          });

          await base44.asServiceRole.entities.Transaction.create({
            user_id: pendingData.client_id,
            task_id: newTask.id,
            task_title: newTask.title,
            amount: totalAgorot / 100,
            type: 'payment',
            status: 'completed',
          });
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