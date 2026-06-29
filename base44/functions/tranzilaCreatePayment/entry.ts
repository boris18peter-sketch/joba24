import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaCreatePayment
 * Creates a pending TranzilaPayment record and returns the iframe parameters.
 * No handshake needed — the terminal doesn't have handshake enabled.
 *
 * Input: { sum, credits, package_id, is_subscription }
 * Returns: { supplier, sum, payment_id }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const { sum, credits, package_id, is_subscription } = await req.json();

    if (!sum || sum <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid sum' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const supplier = Deno.env.get('supplier');
    if (!supplier) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing supplier' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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

    console.log(`✅ Payment record created: ${payment.id} for user ${user.id}, sum=${sum}, credits=${credits}`);

    return new Response(JSON.stringify({
      supplier,
      sum,
      payment_id: payment.id,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ tranzilaCreatePayment error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});