import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaNotify — Webhook endpoint called by Tranzila after payment processing.
 * Per official guide: MUST return "OK" with status 200 — otherwise Tranzila retries.
 *
 * Handles TWO scenarios:
 *   1. First payment (payment status = "pending") → mark completed, grant credits
 *   2. Recurring monthly charge (payment already "completed") → grant credits again
 *
 * The payment_id is passed as a query param in the notify_url.
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');

    // Parse form data — Tranzila sends application/x-www-form-urlencoded.
    // Read body as text ONCE (req.text() consumes the stream), then parse with URLSearchParams.
    // This avoids "Body has already been used" errors when formData() fails.
    let notify = {};
    try {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params.entries()) {
        notify[k] = v;
      }
    } catch (parseErr) {
      console.error('Failed to parse notification body:', parseErr);
    }

    console.log('📋 Tranzila Notification:', JSON.stringify(notify, null, 2));
    console.log(`📋 Payment ID: ${paymentId}`);

    const responseCode = notify['Response'] || '';
    const index = notify['index'] || '';
    const tranzilaToken = notify['TranzilaTK'] || '';
    const isSuccess = responseCode === '000';

    if (!paymentId) {
      console.error('❌ Missing payment_id in query');
      return new Response('OK', { status: 200 });
    }

    const payment = await base44.asServiceRole.entities.TranzilaPayment.get(paymentId);
    if (!payment) {
      console.error(`❌ Payment not found: ${paymentId}`);
      return new Response('OK', { status: 200 });
    }

    // === RECURRING CHARGE (subscription monthly) ===
    // Payment already completed + subscription type + not cancelled → grant credits again
    if (payment.status === 'completed' && payment.type === 'subscription') {
      if (payment.subscription_status === 'cancelled') {
        console.log(`ℹ️ Subscription ${payment.id} cancelled — ignoring recurring charge`);
        return new Response('OK', { status: 200 });
      }

      if (!isSuccess) {
        console.log(`❌ Recurring charge failed for ${payment.id} — Response: ${responseCode}`);
        return new Response('OK', { status: 200 });
      }

      // Grant credits for the recurring monthly charge
      const users = await base44.asServiceRole.entities.User.filter({ id: payment.user_id });
      const user = users?.[0];
      if (user) {
        const newBalance = (user.worker_credits ?? 0) + payment.credits;
        await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });

        await base44.asServiceRole.entities.CreditTransaction.create({
          user_id: user.id,
          amount: payment.credits,
          type: 'Purchase',
          balance_after: newBalance,
          note: `חידוש מנוי חודשי — ${payment.credits} קרדיטים (Tranzila)`,
        });

        console.log(`✅ Recurring charge: ${payment.credits} credits granted to ${payment.user_id}, balance: ${newBalance}`);
      }

      return new Response('OK', { status: 200 });
    }

    // === FIRST PAYMENT ===
    if (payment.status === 'completed') {
      console.log(`ℹ️ Payment ${payment.id} already completed — skipping`);
      return new Response('OK', { status: 200 });
    }

    if (isSuccess) {
      const users = await base44.asServiceRole.entities.User.filter({ id: payment.user_id });
      const user = users?.[0];

      if (user) {
        const newBalance = (user.worker_credits ?? 0) + payment.credits;
        await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });

        await base44.asServiceRole.entities.CreditTransaction.create({
          user_id: user.id,
          amount: payment.credits,
          type: 'Purchase',
          balance_after: newBalance,
          note: `רכישת ${payment.credits} קרדיטים — Tranzila (${payment.type === 'subscription' ? 'מנוי חודשי' : 'חד-פעמי'})`,
        });

        console.log(`✅ Payment ${payment.id} completed — ${payment.credits} credits granted, balance: ${newBalance}`);
      } else {
        console.error(`❌ User ${payment.user_id} not found`);
      }

      const updateData = {
        status: 'completed',
        tranzila_index: index,
        thtk: tranzilaToken || payment.thtk,
      };
      if (payment.type === 'subscription') {
        updateData.subscription_status = 'active';
      }

      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, updateData);
    } else {
      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        status: 'failed',
        tranzila_index: index,
      });
      console.log(`❌ Payment ${payment.id} failed — Response: ${responseCode}`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ tranzilaNotify error:', error);
    return new Response('OK', { status: 200 });
  }
});