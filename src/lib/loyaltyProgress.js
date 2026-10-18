/**
 * loyaltyProgress — the single source of truth for the worker RANK ladder.
 *
 * Every completed task moves a worker up the ladder, so the bonus popup can show
 * real, motivating progress instead of a bare number. The tiers are defined once
 * here and read by the popup (and anywhere else that needs to talk about rank),
 * so the thresholds can never drift apart between screens.
 *
 * `min` is the number of COMPLETED tasks at which the tier is reached.
 */
export const LOYALTY_TIERS = [
  { key: 'rookie', labelKey: 'lp_tier_rookie', min: 0,   color: '#64748b', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)' },
  { key: 'pro',    labelKey: 'lp_tier_pro',    min: 5,   color: '#1a6fd4', gradient: 'linear-gradient(135deg,#3b82f6,#1a6fd4)' },
  { key: 'expert', labelKey: 'lp_tier_expert', min: 20,  color: '#7c3aed', gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)' },
  { key: 'master', labelKey: 'lp_tier_master', min: 50,  color: '#d97706', gradient: 'linear-gradient(135deg,#fbbf24,#d97706)' },
  { key: 'legend', labelKey: 'lp_tier_legend', min: 100, color: '#dc2626', gradient: 'linear-gradient(135deg,#f97316,#dc2626)' },
];

/**
 * Resolve a worker's current rank and how far they are from the next one.
 *
 * @param {number} tasksCompleted  the user's completed-task count
 * @returns {{tier, next, done, into, span, percent, remaining, isMax, tierIndex}}
 */
export function getLoyaltyProgress(tasksCompleted) {
  const done = Math.max(0, Number(tasksCompleted) || 0);

  let tierIndex = 0;
  for (let i = 0; i < LOYALTY_TIERS.length; i++) {
    if (done >= LOYALTY_TIERS[i].min) tierIndex = i;
  }

  const tier = LOYALTY_TIERS[tierIndex];
  const next = LOYALTY_TIERS[tierIndex + 1] || null;
  const span = next ? next.min - tier.min : 0;
  const into = done - tier.min;
  const percent = next ? Math.min(100, Math.round((into / span) * 100)) : 100;

  return {
    tier,
    next,
    done,
    into,
    span,
    percent,
    remaining: next ? next.min - done : 0,
    isMax: !next,
    tierIndex,
  };
}