import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaNotify — Webhook endpoint called by Tranzila after payment processing.
 * Per official guide: MUST return "OK" with status 200 — otherwise Tranzila retries.
 * Accepts POST with application/x-www-form-urlencoded data.
 *
 * The payment_id is passed as a query param in the notify_url:
 *   .../tranzilaNotify?payment_id=<id>
 *
 * Key fields from Tranzila:
 *   Response: "000" = success, anything else = failed
 *   index: Tranzila transaction ID
 *   sum: amount charged
 *   ConfirmationCode: bank confirmation code
 *   TranzilaTK: token (for recurring charges)
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    // Get payment_id from query string
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');

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
    console.log(`📋 Payment ID from query: ${paymentId}`);

    const responseCode = notify['Response'] || '';
    const index = notify['index'] || '';
    const tranzilaToken = notify['TranzilaTK'] || '';

    if (!paymentId) {
      console.error('❌ Missing payment_id in Tranzila notification query');
      return new Response('OK', { status: 200 }); // Still return OK to avoid retries
    }

    // Find the payment by ID
    const payment = await base44.asServiceRole.entities.TranzilaPayment.get(paymentId);

    if (!payment) {
      console.error(`❌ Payment not found for id: ${paymentId}`);
      return new Response('OK', { status: 200 }); // Still return OK
    }

    // Idempotency — skip if already processed
    if (payment.status === 'completed') {
      console.log(`ℹ️ Payment ${payment.id} already completed — skipping`);
      return new Response('OK', { status: 200 });
    }

    // Response "000" = success
    const isSuccess = responseCode === '000';

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
        thtk: tranzilaToken || payment.thtk,
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