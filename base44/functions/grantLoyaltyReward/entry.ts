import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    const { taskId, workerId, rating, taskTitle } = await req.json();
    if (!taskId || !workerId || rating === undefined) {
      return Response.json({ error: 'taskId, workerId, rating required' }, { status: 400 });
    }

    // Only grant bonus for 5-star rating
    if (rating !== 5) {
      return Response.json({ success: true, bonus: 0, note: 'Rating < 5, no bonus' });
    }

    // Idempotency: check if bonus already granted for this task+worker
    const existingBonus = await base44.asServiceRole.entities.CreditTransaction.filter({
      user_id: workerId,
      task_id: taskId,
      type: 'Loyalty_Reward',
    });
    if (existingBonus.length > 0) {
      return Response.json({ success: true, bonus: 0, note: 'Bonus already granted', new_balance: existingBonus[0].balance_after });
    }

    // Find the application for this worker+task (approved OR any status — worker was already assigned)
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({
      task_id: taskId,
      worker_id: workerId,
    });
    // Prefer approved, but fall back to any app that had credits charged (task may be completed now)
    const approvedApp = apps.find(a => a.status === 'approved') || apps.find(a => (a.credits_charged || 0) > 0) || apps[0];
    if (!approvedApp) {
      return Response.json({ success: true, bonus: 0, note: 'No application found' });
    }

    const creditsCharged = approvedApp.credits_charged || 0;
    // If no credits were charged, grant a minimum flat bonus of 1 for 5-star work
    const effectiveCharged = creditsCharged > 0 ? creditsCharged : 1;

    const bonus = Math.max(1, Math.round(effectiveCharged * 0.1));

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
      task_title: taskTitle || '',
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