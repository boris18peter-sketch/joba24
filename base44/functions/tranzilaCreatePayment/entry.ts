import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaCreatePayment
 * Creates a pending TranzilaPayment record and returns the iframe parameters.
 *
 * Terminal routing:
 *   - Subscription  → joba24tok (V2 handshake → V1 fallback → recur params fallback)
 *   - One-time card → joba24
 *   - One-time alt  → joba24ch (Bit, Apple Pay, Google Pay, PayPal, phone)
 *
 * Input: { sum, credits, package_id, is_subscription, pay_method }
 * Returns: { supplier, sum, payment_id, pay_method, thtk }
 */

/**
 * V2 Handshake — HMAC-SHA256 authentication
 * POST https://api.tranzila.com/v2/handshake/create
 * Headers: X-tranzila-api-app-key, X-tranzila-api-request-time, X-tranzila-api-nonce, X-tranzila-api-access-token
 * access_token = hash_hmac('sha256', appKey, secret + time + nonce)  (lowercase hex)
 */
async function v2Handshake(supplier, sum) {
  const appKey = Deno.env.get('TRANZILA_JOBA24TOK_PUBLIC_KEY');
  const secret = Deno.env.get('TRANZILA_JOBA24TOK_PRIVATE_KEY');

  if (!appKey || !secret) {
    throw new Error('Missing V2 API keys');
  }

  // Generate nonce: 40 random bytes → 80 hex chars
  const nonceBytes = new Uint8Array(40);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Request time: Unix seconds
  const time = Math.floor(Date.now() / 1000).toString();

  // Access token: HMAC-SHA256(appKey, secret + time + nonce)
  const keyData = new TextEncoder().encode(secret + time + nonce);
  const messageData = new TextEncoder().encode(appKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const accessToken = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const body = JSON.stringify({ terminal_name: supplier, sum });

  const response = await fetch('https://api.tranzila.com/v2/handshake/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-tranzila-api-app-key': appKey,
      'X-tranzila-api-request-time': time,
      'X-tranzila-api-nonce': nonce,
      'X-tranzila-api-access-token': accessToken,
    },
    body,
  });

  const data = await response.json();
  console.log(`📋 V2 handshake response:`, JSON.stringify(data));

  if (data.error_code === 0 && data.thtk) {
    return data.thtk;
  }

  throw new Error(`V2 handshake failed: error_code=${data.error_code}, message=${data.message || JSON.stringify(data)}`);
}

/**
 * V1 Handshake — fallback (PW-based)
 * GET https://secure5.tranzila.com/cgi-bin/tranzila71dt.cgi?sum=&TranzilaPW=&supplier=&op=1
 * Response: "thtk=<token>"
 */
async function v1Handshake(supplier, sum) {
  const TranzilaPW = Deno.env.get('TranzilaPW');
  if (!TranzilaPW) throw new Error('Missing TranzilaPW');

  const url = `https://secure5.tranzila.com/cgi-bin/tranzila71dt.cgi?sum=${sum}&TranzilaPW=${encodeURIComponent(TranzilaPW)}&supplier=${encodeURIComponent(supplier)}&op=1`;
  const response = await fetch(url);
  const text = await response.text();

  console.log(`📋 V1 handshake response: ${text.substring(0, 100)}`);

  let thtk = text.trim();
  if (thtk.startsWith('thtk=')) {
    thtk = thtk.substring(5);
  }

  if (!thtk || thtk.length < 5 || thtk.startsWith('{') || thtk.startsWith('<')) {
    throw new Error(`V1 handshake failed: ${text.substring(0, 200)}`);
  }

  return thtk;
}

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

    // === For subscriptions (token terminal): create handshake token ===
    let thtk = '';
    if (is_subscription) {
      // Try V2 API first
      try {
        thtk = await v2Handshake(supplier, sum);
        console.log(`✅ V2 handshake success for payment ${payment.id}, thtk=${thtk.substring(0, 8)}...`);
      } catch (v2Err) {
        console.warn(`⚠️ V2 handshake failed: ${v2Err.message}`);
        // Try V1 API as fallback
        try {
          thtk = await v1Handshake(supplier, sum);
          console.log(`✅ V1 handshake success for payment ${payment.id}, thtk=${thtk.substring(0, 8)}...`);
        } catch (v1Err) {
          console.warn(`⚠️ V1 handshake failed: ${v1Err.message}`);
          // Final fallback: use joba24 with recur params (no token)
          thtk = '';
          supplier = 'joba24';
        }
      }

      // Update payment with thtk if we got one
      if (thtk) {
        await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, { thtk });
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