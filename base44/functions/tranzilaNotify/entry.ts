import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * tranzilaNotify — Webhook endpoint called by Tranzila after payment processing.
 * No user auth (called by Tranzila server). Uses service role.
 *
 * Tranzila sends POST with form-urlencoded data including:
 *   Response (000 = success), thtk, index, sum, ConfirmationCode, etc.
 *
 * On success: grants credits to the user and marks payment as completed.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse form data from Tranzila
    const contentType = req.headers.get('content-type') || '';
    let params;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      params = new URLSearchParams(text);
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        params.append(k, String(v));
      }
    } else {
      // Try form data
      const formData = await req.formData();
      params = new URLSearchParams();
      for (const [k, v] of formData.entries()) {
        params.append(k, String(v));
      }
    }

    const responseCode = params.get('Response') || '';
    const thtk = params.get('thtk') || '';
    const index = params.get('index') || '';
    const sum = params.get('sum') || '';
    const confirmationCode = params.get('ConfirmationCode') || '';

    console.log(`📋 Tranzila notify received — Response: ${responseCode}, thtk: ${thtk?.substring(0, 8)}..., index: ${index}`);

    if (!thtk) {
      return Response.json({ error: 'Missing thtk' }, { status: 400 });
    }

    // Find the payment by thtk
    const payments = await base44.asServiceRole.entities.TranzilaPayment.filter({ thtk });
    const payment = payments?.[0];

    if (!payment) {
      console.error(`❌ Payment not found for thtk: ${thtk}`);
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Already processed
    if (payment.status === 'completed') {
      console.log(`ℹ️ Payment ${payment.id} already completed — skipping`);
      return Response.json({ success: true, message: 'Already processed' });
    }

    // Response=000 means success
    if (responseCode === '000') {
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
          note: `רכישת ${payment.credits} קרדיטים — Tranzila`,
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
      // Payment failed
      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        status: 'failed',
        tranzila_index: index,
      });
      console.log(`❌ Payment ${payment.id} failed — Response code: ${responseCode}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ tranzilaNotify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});