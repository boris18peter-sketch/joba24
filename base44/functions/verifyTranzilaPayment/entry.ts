import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * verifyTranzilaPayment — status check for an in-flight Tranzila payment.
 *
 * PHASE 1 — SERVER-SIDE AUTHORITY (security fix):
 *   This function NO LONGER grants credits. It previously trusted a
 *   client-supplied `response_code === '000'`, which allowed any signed-in user
 *   to credit their own pending payment without ever paying.
 *
 *   Credits are now granted ONLY by `tranzilaNotify` — the server-to-server
 *   notification Tranzila sends directly to our backend. This function only
 *   reports the stored payment status so the client can render the right UX; it
 *   can never change that status and never grants anything.
 *
 * Input:   { payment_id }   — any other field sent by the client is ignored.
 * Returns: { success, pending, status, credits_granted: 0, new_balance }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const payment_id = body?.payment_id;
    if (!payment_id) {
      return Response.json({ error: 'Missing payment_id' }, { status: 400 });
    }

    let payment = null;
    try {
      const payments = await base44.asServiceRole.entities.TranzilaPayment.filter({ id: payment_id });
      payment = payments?.[0] ?? null;
    } catch {
      // Malformed record id — treat as not found rather than a server error.
      payment = null;
    }

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    // A user may only inspect their own payment.
    if (payment.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const newBalance = freshUsers?.[0]?.worker_credits ?? user.worker_credits ?? 0;

    if (payment.status === 'completed') {
      return Response.json({
        success: true,
        pending: false,
        status: 'completed',
        credits_granted: 0,
        new_balance: newBalance,
        message: 'Already completed',
      });
    }

    if (payment.status === 'failed') {
      return Response.json({
        success: false,
        pending: false,
        status: 'failed',
        credits_granted: 0,
        new_balance: newBalance,
        message: 'Payment was not successful',
      });
    }

    // Still pending — the server has not yet received Tranzila's confirmation.
    return Response.json({
      success: false,
      pending: true,
      status: 'pending',
      credits_granted: 0,
      new_balance: newBalance,
      message: 'Awaiting server confirmation',
    });

  } catch (error) {
    console.error('❌ verifyTranzilaPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});