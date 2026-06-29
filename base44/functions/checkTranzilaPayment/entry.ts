import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * checkTranzilaPayment — Returns the status of a Tranzila payment.
 * Used by the frontend to poll for payment completion while the iframe is open.
 *
 * Input: { payment_id }
 * Returns: { status, credits }
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

    // Ensure the payment belongs to the requesting user
    if (payment.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json({
      status: payment.status,
      credits: payment.credits,
    });
  } catch (error) {
    console.error('❌ checkTranzilaPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});