import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getJobaSettings } from '../../shared/jobaSettings.ts';
import { getAuthenticatedUser, unauthorized, forbidden } from '../../shared/internalAuth.ts';

/**
 * Called after a review is submitted.
 * If worker received a 5-star rating from the client → grant loyalty bonus.
 * Bonus = credits_charged * loyalty_reward_percent (configurable), min loyalty_reward_min.
 * 
 * Payload: { taskId }
 *
 * ── Trust boundary (Package #3.1C) ────────────────────────────────────────
 * The client supplies ONLY the task identifier. Everything that determines the
 * reward — who the owner is, what the persisted rating is, which worker is
 * rewarded, and what the task is called — is derived server-side from persisted
 * records, so none of it can be forged.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Authorization (Package #3.1C) ──────────────────────────────────────
    // The caller must be a signed-in user AND the task's own client.
    const caller = await getAuthenticatedUser(base44);
    if (!caller) return unauthorized();

    const { taskId } = await req.json();
    if (!taskId) {
      return Response.json({ error: 'taskId required' }, { status: 400 });
    }

    // The Task is the only source of truth for ownership, the assigned worker
    // and the title.
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Only the task's own client (the poster) may grant a loyalty reward.
    if (task.client_id !== caller.id) {
      return forbidden('Only the task owner can grant a loyalty reward');
    }

    // The persisted Review is the only source of truth for the rating.
    const reviews = await base44.asServiceRole.entities.Review.filter({
      task_id: taskId,
      reviewer_id: caller.id,
    });
    const review = reviews[0];
    if (!review) {
      return Response.json({ success: true, bonus: 0, note: 'No review found' });
    }

    // Only a persisted 5-star rating earns the bonus.
    if (review.rating !== 5) {
      return Response.json({ success: true, bonus: 0, note: 'Rating < 5, no bonus' });
    }

    // Derived server-side — never taken from the request body.
    const workerId = task.worker_id;
    const taskTitle = task.title;
    if (!workerId) {
      return Response.json({ success: true, bonus: 0, note: 'No worker assigned' });
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

    // Load configurable loyalty reward settings
    const settings = await getJobaSettings(base44);
    const bonus = Math.max(settings.loyalty_reward_min, Math.round(effectiveCharged * settings.loyalty_reward_percent / 100));

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
      note: `בונוס מקצועיות - דירוג 5 כוכבים (${settings.loyalty_reward_percent}% מ-${creditsCharged} ג'ובות)`,
      balance_after: newBalance,
    });

    console.log(`✅ Loyalty bonus ${bonus} credits granted to worker ${workerId}`);
    return Response.json({ success: true, bonus, new_balance: newBalance });

  } catch (error) {
    console.error('❌ grantLoyaltyReward error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});