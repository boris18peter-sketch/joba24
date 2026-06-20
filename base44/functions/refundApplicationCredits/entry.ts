import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Shared helper: refund credits for a single application.
 * Called by approveWorker (rejected others), cancelApplication, and the cron job.
 * 
 * Payload: { applicationId, reason: 'Refund_Rejection' | 'Refund_Expiration' }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { applicationId, reason } = await req.json();
    if (!applicationId || !reason) {
      return Response.json({ error: 'applicationId and reason required' }, { status: 400 });
    }

    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ id: applicationId });
    const app = apps[0];
    if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });

    const creditsToRefund = app.credits_charged || 0;
    if (creditsToRefund <= 0) {
      return Response.json({ success: true, refunded: 0, note: 'No credits to refund' });
    }

    // Fetch worker's current credits
    const users = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
    const worker = users[0];
    if (!worker) return Response.json({ error: 'Worker not found' }, { status: 404 });

    const currentCredits = worker.worker_credits ?? 0;
    const newBalance = currentCredits + creditsToRefund;

    // Update worker credits
    await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });

    // Log transaction
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: app.worker_id,
      amount: creditsToRefund,
      type: reason,
      task_id: app.task_id,
      task_title: app.task_title || '',
      balance_after: newBalance,
      note: reason === 'Refund_Rejection'
        ? `החזר קרדיטים - בקשה לא נבחרה`
        : `החזר קרדיטים - משימה בוטלה אוטומטית`,
    });

    console.log(`✅ Refunded ${creditsToRefund} credits to worker ${app.worker_id} (${reason})`);
    return Response.json({ success: true, refunded: creditsToRefund, new_balance: newBalance });

  } catch (error) {
    console.error('❌ refundApplicationCredits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});