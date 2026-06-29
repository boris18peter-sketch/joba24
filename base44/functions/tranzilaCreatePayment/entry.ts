import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaCreatePayment
 * Creates a pending TranzilaPayment record and returns the iframe parameters.
 *
 * Terminal routing:
 *   - Subscription  → joba24tok (requires V2 handshake — IP whitelist needed)
 *     FALLBACK: joba24 with recur params if V2 handshake not available
 *   - One-time card → joba24
 *   - One-time alt  → joba24ch (Bit, Apple Pay, Google Pay, PayPal, phone)
 *
 * Input: { sum, credits, package_id, is_subscription, pay_method }
 * Returns: { supplier, sum, payment_id, pay_method, thtk }
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

    // === For subscriptions (token terminal): try V1 handshake to get thtk ===
    let thtk = '';
    if (is_subscription) {
      const TranzilaPW = Deno.env.get('TranzilaPW');
      if (TranzilaPW) {
        const handshakeUrl = `https://secure5.tranzila.com/cgi-bin/tranzila71dt.cgi?sum=${sum}&TranzilaPW=${encodeURIComponent(TranzilaPW)}&supplier=${encodeURIComponent(supplier)}&op=1`;

        try {
          const hsResponse = await fetch(handshakeUrl);
          const hsData = await hsResponse.text();

          // Response is plain text: "thtk=<token>"
          const thtkPrefix = 'thtk=';
          thtk = hsData.trim();
          if (thtk.startsWith(thtkPrefix)) {
            thtk = thtk.substring(thtkPrefix.length);
          }

          // Check if handshake succeeded (thtk should be a token, not HTML/error)
          if (!thtk || thtk.length < 5 || thtk.startsWith('{') || thtk.startsWith('<')) {
            console.warn(`⚠️ V1 handshake failed — falling back to joba24 with recur params`);
            thtk = '';
            // Fall back to regular terminal with recurring params
            supplier = 'joba24';
          } else {
            // Handshake succeeded — update payment with thtk
            await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, { thtk });
            console.log(`✅ Handshake created for payment ${payment.id}, thtk=${thtk.substring(0, 8)}...`);
          }
        } catch (hsErr) {
          console.warn(`⚠️ Handshake request failed — falling back to joba24 with recur params:`, hsErr);
          thtk = '';
          supplier = 'joba24';
        }
      } else {
        console.warn(`⚠️ No TranzilaPW secret — using joba24 with recur params for subscription`);
        supplier = 'joba24';
      }
    }

    console.log(`✅ Payment record created: ${payment.id} | terminal=${supplier} | sum=${sum} | credits=${credits} | method=${pay_method || 'card'} | thtk=${thtk ? 'yes' : 'no'}`);

    return new Response(JSON.stringify({
      supplier,
      sum,
      payment_id: payment.id,
      pay_method: pay_method || 'card',
      thtk,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ tranzilaCreatePayment error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});