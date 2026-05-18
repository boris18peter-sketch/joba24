import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Called after a review is submitted.
 * If worker received a 5-star rating from the client → grant loyalty bonus.
 * Bonus = credits_charged * 0.1 (no rounding, raw float).
 * 
 * Payload: { taskId, workerId, rating }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { taskId, workerId, rating } = await req.json();
    if (!taskId || !workerId || rating === undefined) {
      return Response.json({ error: 'taskId, workerId, rating required' }, { status: 400 });
    }

    // Only grant bonus for 5-star rating
    if (rating !== 5) {
      return Response.json({ success: true, bonus: 0, note: 'Rating < 5, no bonus' });
    }

    // Find the approved application for this worker+task
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({
      task_id: taskId,
      worker_id: workerId,
    });
    const approvedApp = apps.find(a => a.status === 'approved');
    if (!approvedApp) {
      return Response.json({ success: true, bonus: 0, note: 'No approved application found' });
    }

    const creditsCharged = approvedApp.credits_charged || 0;
    if (creditsCharged <= 0) {
      return Response.json({ success: true, bonus: 0, note: 'No credits were charged' });
    }

    const bonus = Math.max(1, Math.round(creditsCharged * 0.1));

    // Fetch worker's current balance
    const users = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const worker = users[0];
    if (!worker) return Response.json({ error: 'Worker not found' }, { status: 404 });

    const newBalance = (worker.worker_credits ?? 0) + bonus;

    // Credit the bonus
    await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });

    // Log transaction
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: workerId,
      amount: bonus,
      type: 'Loyalty_Reward',
      task_id: taskId,
      note: `בונוס מקצועיות - דירוג 5 כוכבים (10% מ-${creditsCharged} קרדיטים)`,
      balance_after: newBalance,
    });

    console.log(`✅ Loyalty bonus ${bonus} credits granted to worker ${workerId}`);
    return Response.json({ success: true, bonus, new_balance: newBalance });

  } catch (error) {
    console.error('❌ grantLoyaltyReward error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});