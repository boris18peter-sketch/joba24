import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaCreateHandshake
 * Creates a Tranzila handshake token (thtk) for a one-time credit purchase.
 * Also creates a pending TranzilaPayment record to track the transaction.
 *
 * Input: { sum, credits, package_id, is_subscription }
 * Returns: { thtk, supplier, payment_id, sum }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sum, credits, package_id, is_subscription } = await req.json();

    if (!sum || sum <= 0 || !credits || credits <= 0) {
      return Response.json({ error: 'Invalid sum or credits' }, { status: 400 });
    }

    const supplier = Deno.env.get('supplier');
    const TranzilaPW = Deno.env.get('TranzilaPW');

    if (!supplier || !TranzilaPW) {
      return Response.json({ error: 'Tranzila credentials not configured' }, { status: 500 });
    }

    // Create a pending payment record
    const payment = await base44.asServiceRole.entities.TranzilaPayment.create({
      user_id: user.id,
      amount: sum,
      credits,
      thtk: '',
      type: is_subscription ? 'subscription' : 'one_time',
      status: 'pending',
      package_id: package_id || '',
    });

    // Construct the Tranzila handshake URL
    const handshakeUrl = `https://api.tranzila.com/v1/handshake/create?supplier=${encodeURIComponent(supplier)}&sum=${sum}&TranzilaPW=${encodeURIComponent(TranzilaPW)}`;

    const response = await fetch(handshakeUrl);
    const data = await response.text();

    // Extract thtk from response (format: "thtk=<token>")
    const thtkPrefix = 'thtk=';
    let thtk = data.trim();
    if (thtk.startsWith(thtkPrefix)) {
      thtk = thtk.substring(thtkPrefix.length);
    }

    if (!thtk || thtk.length < 5) {
      console.error('Tranzila handshake failed — response:', data);
      return Response.json({ error: 'Failed to create Tranzila handshake' }, { status: 502 });
    }

    // Update payment record with thtk
    await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, { thtk });

    console.log(`✅ Handshake created for payment ${payment.id}, thtk=${thtk.substring(0, 8)}...`);

    return Response.json({
      thtk,
      supplier,
      payment_id: payment.id,
      sum,
    });
  } catch (error) {
    console.error('❌ tranzilaCreateHandshake error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});