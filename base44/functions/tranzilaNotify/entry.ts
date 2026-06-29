import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaNotify — Webhook endpoint called by Tranzila after payment processing.
 * Per official guide: MUST return "OK" with status 200 — otherwise Tranzila retries.
 * Accepts POST with application/x-www-form-urlencoded data.
 *
 * Key fields from Tranzila:
 *   Response: "000" or "0" = success, anything else = failed
 *   thtk: handshake token (used to match our TranzilaPayment record)
 *   index: Tranzila transaction ID
 *   sum: amount charged
 *   ConfirmationCode: bank confirmation code
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    // Parse form data — Tranzila sends application/x-www-form-urlencoded
    let notify = {};
    try {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        notify[key] = value;
      }
    } catch {
      // Fallback: try URL-encoded text body
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params.entries()) {
        notify[k] = v;
      }
    }

    console.log('📋 Tranzila Notification Received:', JSON.stringify(notify, null, 2));

    const responseCode = notify['Response'] || '';
    const thtk = notify['thtk'] || '';
    const index = notify['index'] || '';

    if (!thtk) {
      console.error('❌ Missing thtk in Tranzila notification');
      return new Response('OK', { status: 200 }); // Still return OK to avoid retries
    }

    // Find the payment by thtk
    const payments = await base44.asServiceRole.entities.TranzilaPayment.filter({ thtk });
    const payment = payments?.[0];

    if (!payment) {
      console.error(`❌ Payment not found for thtk: ${thtk}`);
      return new Response('OK', { status: 200 }); // Still return OK
    }

    // Idempotency — skip if already processed
    if (payment.status === 'completed') {
      console.log(`ℹ️ Payment ${payment.id} already completed — skipping`);
      return new Response('OK', { status: 200 });
    }

    // Response "000" or "0" = success
    const isSuccess = responseCode === '000' || responseCode === '0';

    if (isSuccess) {
      // Grant credits to user
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
          note: `רכישת ${payment.credits} קרדיטים — Tranzila (${payment.type === 'subscription' ? 'מנוי' : 'חד-פעמי'})`,
        });

        console.log(`✅ Payment ${payment.id} completed — ${payment.credits} credits granted to ${payment.user_id}, new balance: ${newBalance}`);
      } else {
        console.error(`❌ User ${payment.user_id} not found for payment ${payment.id}`);
      }

      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        status: 'completed',
        tranzila_index: index,
      });
    } else {
      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        status: 'failed',
        tranzila_index: index,
      });
      console.log(`❌ Payment ${payment.id} failed — Response code: ${responseCode}`);
    }

    // CRITICAL: Tranzila requires "OK" with 200 to stop retrying
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ tranzilaNotify error:', error);
    // Still return OK to avoid infinite Tranzila retries
    return new Response('OK', { status: 200 });
  }
});