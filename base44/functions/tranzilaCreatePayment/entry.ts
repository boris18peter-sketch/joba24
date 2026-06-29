import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaCreatePayment
 * Creates a pending TranzilaPayment record and returns the iframe parameters.
 *
 * Terminal routing:
 *   - Subscription  → joba24tok
 *   - One-time card → joba24
 *   - One-time alt  → joba24ch (Bit, Apple Pay, Google Pay, PayPal, phone)
 *
 * Input: { sum, credits, package_id, is_subscription, pay_method }
 * Returns: { supplier, sum, payment_id, pay_method }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const { sum, credits, package_id, is_subscription, pay_method } = await req.json();

    if (!sum || sum <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid sum' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // === Terminal selection ===
    let supplier;
    if (is_subscription) {
      supplier = 'joba24tok';
    } else if (pay_method && pay_method !== 'card') {
      supplier = 'joba24ch';
    } else {
      supplier = 'joba24';
    }

    // Create pending payment record
    const paymentData = {
      user_id: user.id,
      amount: sum,
      credits: credits || 0,
      thtk: '',
      type: is_subscription ? 'subscription' : 'one_time',
      status: 'pending',
      package_id: package_id || '',
    };
    if (is_subscription) {
      paymentData.subscription_status = 'active';
    }
    const payment = await base44.asServiceRole.entities.TranzilaPayment.create(paymentData);

    console.log(`✅ Payment record created: ${payment.id} | terminal=${supplier} | sum=${sum} | credits=${credits} | method=${pay_method || 'card'}`);

    return new Response(JSON.stringify({
      supplier,
      sum,
      payment_id: payment.id,
      pay_method: pay_method || 'card',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ tranzilaCreatePayment error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});