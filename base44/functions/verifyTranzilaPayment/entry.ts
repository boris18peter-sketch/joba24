import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * verifyTranzilaPayment — Called by the frontend after Tranzila redirects
 * the iframe to our callback page. Processes the payment result and grants credits.
 *
 * This is the PRIMARY mechanism for credit granting — it works entirely in the
 * browser via redirect + postMessage, without depending on the notify_url webhook.
 *
 * Input: { payment_id, response_code, index, token }
 * Returns: { success, credits_granted, new_balance }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { payment_id, response_code, index, token } = body;

    if (!payment_id) {
      return Response.json({ error: 'Missing payment_id' }, { status: 400 });
    }

    const payments = await base44.asServiceRole.entities.TranzilaPayment.filter({ id: payment_id });
    const payment = payments?.[0];

    if (!payment) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Verify the payment belongs to the requesting user
    if (payment.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Already completed — return success without double-granting
    if (payment.status === 'completed') {
      return Response.json({
        success: true,
        credits_granted: 0,
        new_balance: user.worker_credits ?? 0,
        message: 'Already completed'
      });
    }

    // Verify the transaction was successful (Tranzila Response code 000 = success)
    const isSuccess = response_code === '000';

    if (!isSuccess) {
      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        status: 'failed',
        tranzila_index: index || '',
      });
      return Response.json({
        success: false,
        credits_granted: 0,
        message: 'Payment was not successful'
      });
    }

    // Grant credits to the user
    const newBalance = (user.worker_credits ?? 0) + payment.credits;
    await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });

    // Record the credit transaction
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: payment.credits,
      type: 'Purchase',
      balance_after: newBalance,
      note: `רכישת ${payment.credits} קרדיטים — Tranzila (${payment.type === 'subscription' ? 'מנוי חודשי' : 'חד-פעמי'})`,
    });

    // Mark payment as completed
    const updateData = {
      status: 'completed',
      tranzila_index: index || '',
      thtk: token || payment.thtk,
    };
    if (payment.type === 'subscription') {
      updateData.subscription_status = 'active';
    }
    await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, updateData);

    console.log(`✅ Payment ${payment.id} completed via redirect verification — ${payment.credits} credits granted, balance: ${newBalance}`);

    return Response.json({
      success: true,
      credits_granted: payment.credits,
      new_balance: newBalance,
    });

  } catch (error) {
    console.error('❌ verifyTranzilaPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});