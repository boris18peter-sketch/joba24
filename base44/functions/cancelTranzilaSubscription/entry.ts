import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * cancelTranzilaSubscription — Cancels an active Tranzila recurring subscription.
 *
 * Calls Tranzila's recurring cancellation API:
 *   https://secure5.tranzila.com/cgi-bin/tranzila71un.cgi
 *   Params: supplier, TranzilaPW, TranzilaTK (the token to cancel)
 *
 * Also marks the subscription as "cancelled" in the database so recurring
 * charge notifications are ignored.
 *
 * Input: { payment_id }
 * Returns: { success, message }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { payment_id } = await req.json();
    if (!payment_id) return Response.json({ error: 'Missing payment_id' }, { status: 400 });

    const payments = await base44.asServiceRole.entities.TranzilaPayment.filter({ id: payment_id });
    const payment = payments?.[0];
    if (!payment) return Response.json({ error: 'Payment not found' }, { status: 404 });

    if (payment.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payment.type !== 'subscription') {
      return Response.json({ error: 'Not a subscription' }, { status: 400 });
    }

    if (payment.subscription_status === 'cancelled') {
      return Response.json({ success: true, message: 'Already cancelled' });
    }

    const supplier = Deno.env.get('supplier');
    const TranzilaPW = Deno.env.get('TranzilaPW');

    if (!supplier || !TranzilaPW) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Call Tranzila's cancellation API
    const token = payment.thtk;
    if (!token) {
      console.error('❌ No TranzilaTK token stored for subscription', payment_id);
      return Response.json({ error: 'No subscription token found' }, { status: 400 });
    }

    const cancelUrl = `https://secure5.tranzila.com/cgi-bin/tranzila71un.cgi?supplier=${encodeURIComponent(supplier)}&TranzilaPW=${encodeURIComponent(TranzilaPW)}&TranzilaTK=${encodeURIComponent(token)}`;

    console.log(`🔗 Cancelling subscription ${payment_id}...`);

    const response = await fetch(cancelUrl);
    const data = await response.text();

    console.log(`📋 Tranzila cancellation response: ${data}`);

    // Mark subscription as cancelled in our DB regardless
    // (even if Tranzila API has issues, we don't want to charge the user)
    await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
      subscription_status: 'cancelled',
    });

    console.log(`✅ Subscription ${payment_id} cancelled`);

    return Response.json({
      success: true,
      message: 'Subscription cancelled successfully',
      raw: data,
    });

  } catch (error) {
    console.error('❌ cancelTranzilaSubscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});