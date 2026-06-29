import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaCreateHandshake
 * Creates a Tranzila handshake token (thtk) for one-time or subscription payments.
 * Per official Tranzila Base44 integration guide.
 *
 * Input: { sum, credits, package_id, is_subscription }
 * Returns: { thtk, supplier, sum, payment_id }
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
    const TranzilaPW = Deno.env.get('TranzilaPW');

    if (!supplier || !TranzilaPW) {
      console.error('Missing Tranzila credentials in environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Tranzila credentials' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Create pending payment record BEFORE calling Tranzila
    const payment = await base44.asServiceRole.entities.TranzilaPayment.create({
      user_id: user.id,
      amount: sum,
      credits: credits || 0,
      thtk: '',
      type: is_subscription ? 'subscription' : 'one_time',
      status: 'pending',
      package_id: package_id || '',
    });

    // Construct the Tranzila Handshake URL (exactly per official guide)
    const handshakeUrl = `https://api.tranzila.com/v1/handshake/create?supplier=${supplier}&sum=${sum}&TranzilaPW=${TranzilaPW}`;

    const response = await fetch(handshakeUrl);
    const data = await response.text();

    // Extract thtk — response is plain text: "thtk=<token>"
    const thtkPrefix = 'thtk=';
    let thtk = data.trim();
    if (thtk.startsWith(thtkPrefix)) {
      thtk = thtk.substring(thtkPrefix.length);
    }

    if (!thtk || thtk.length < 5) {
      console.error('Tranzila handshake failed — response:', data);
      return new Response(JSON.stringify({ error: 'Failed to create Tranzila handshake', raw: data }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    // Update payment record with thtk
    await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, { thtk });

    console.log(`✅ Handshake created for payment ${payment.id}, thtk=${thtk.substring(0, 8)}...`);

    return new Response(JSON.stringify({
      thtk,
      supplier,
      sum,
      payment_id: payment.id,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ tranzilaCreateHandshake error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});