/**
 * loyaltyReward — the 5-star professionalism bonus, as ONE implementation.
 *
 * ── WHY IT MOVED HERE ──────────────────────────────────────────────────────
 * The bonus was a backend FUNCTION (`grantLoyaltyReward`), callable only with a
 * signed-in session because it authorized "the task's own client" from the
 * caller. Two callers now need it:
 *
 *   • the in-app review sheet (`submitReview`), which has a session;
 *   • a star tapped on the Lock Screen (`liveActivityAction`), which has a
 *     capability token and NO session — and for which a function call would be
 *     refused, silently costing the worker their bonus for a rating the publisher
 *     gave the moment they approved the work.
 *
 * So the RULES live here, once, and each function keeps only its own
 * authorization in front of them. Nothing about the reward changed: the persisted
 * Review is still the only source of truth for the rating, the task still decides
 * the worker and the title, the Brand still decides the percentage, and a bonus is
 * still granted at most once per task and worker.
 */
import { getBrandMarketplaceSettings } from './brandSettings.ts';

/**
 * Grant the loyalty bonus for a task, if it is earned and not yet granted.
 *
 * Callers are responsible for authorization (they must have established that the
 * caller is this task's client). This function re-derives everything else from
 * the database and is safe to call again: the CreditTransaction row is the
 * idempotency key.
 */
export async function grantLoyaltyForTask(base44, input: any) {
  const { task } = input || {};
  if (!task?.id) return { bonus: 0, note: 'no_task' };
  if (!task.client_id) return { bonus: 0, note: 'no_client' };

  const workerId = task.worker_id;
  const taskTitle = task.title;
  if (!workerId) return { bonus: 0, note: 'no_worker' };

  // The persisted review is the only source of truth for the rating.
  const reviews = await base44.asServiceRole.entities.Review.filter({
    task_id: task.id,
    reviewer_id: task.client_id,
  });
  const review = Array.isArray(reviews) ? reviews[0] : (reviews?.items || [])[0];
  if (!review) return { bonus: 0, note: 'no_review' };

  // Only a persisted 5-star rating earns the bonus.
  if (review.rating !== 5) return { bonus: 0, note: 'rating_below_five' };

  // Idempotency: one bonus per task and worker, for ever.
  const existingBonus = await base44.asServiceRole.entities.CreditTransaction.filter({
    user_id: workerId,
    task_id: task.id,
    type: 'Loyalty_Reward',
  });
  const granted = Array.isArray(existingBonus) ? existingBonus : (existingBonus?.items || []);
  if (granted.length > 0) {
    return { bonus: 0, note: 'already_granted', new_balance: granted[0].balance_after };
  }

  // The application the worker was assigned through — approved first, then any
  // application that actually charged credits (the task is completed by now, so
  // its own status can no longer be relied on).
  const apps = await base44.asServiceRole.entities.TaskApplication.filter({
    task_id: task.id,
    worker_id: workerId,
  });
  const applications = Array.isArray(apps) ? apps : (apps?.items || []);
  const approvedApp = applications.find((a) => a.status === 'approved')
    || applications.find((a) => (a.credits_charged || 0) > 0)
    || applications[0];
  if (!approvedApp) return { bonus: 0, note: 'no_application' };

  const creditsCharged = approvedApp.credits_charged || 0;
  // No credits were charged → a minimum flat bonus of 1 for 5-star work.
  const effectiveCharged = creditsCharged > 0 ? creditsCharged : 1;

  // Pricing follows the Brand the TASK belongs to (its own overrides, else Joba24).
  const settings = await getBrandMarketplaceSettings(base44, task.origin_brand_id);
  const bonus = Math.max(
    settings.loyalty_reward_min,
    Math.round(effectiveCharged * settings.loyalty_reward_percent / 100)
  );

  const users = await base44.asServiceRole.entities.User.filter({ id: workerId });
  const worker = Array.isArray(users) ? users[0] : (users?.items || [])[0];
  if (!worker) return { bonus: 0, note: 'worker_missing' };

  const newBalance = (worker.worker_credits ?? 0) + bonus;

  await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });

  await base44.asServiceRole.entities.CreditTransaction.create({
    user_id: workerId,
    amount: bonus,
    type: 'Loyalty_Reward',
    task_id: task.id,
    task_title: taskTitle || '',
    note: `בונוס מקצועיות - דירוג 5 כוכבים (${settings.loyalty_reward_percent}% מ-${creditsCharged} ג'ובות)`,
    balance_after: newBalance,
  });

  console.log(`✅ Loyalty bonus ${bonus} credits granted to worker ${workerId}`);
  return { bonus, new_balance: newBalance, note: 'granted' };
}