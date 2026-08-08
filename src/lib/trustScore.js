/**
 * Trust Score Calculation — 0 to 100
 * Aggregates behavioral signals into a single score.
 *
 * Identity verification is KYC approval (kyc_status === 'approved') = full 40 pts.
 * There is no separate phone-verification flow in the app, so phone is NOT a
 * standalone signal — it was a phantom requirement that never matched reality.
 */

// Shared helper so the meter, the popup, and the improvement guide always agree.
export function getCompletedCount(tasks, user) {
  const fromTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'COMPLETED').length : 0;
  return fromTasks || (user?.tasks_completed || 0);
}

export function calculateTrustScore(user, { tasks = [], reviews = [] } = {}) {
  if (!user) return 0;
  let score = 0;

  // Identity verification — KYC approved = full 40 pts (single source of truth: kyc_status)
  if (user.kyc_status === 'approved') score += 40;

  // Rating quality (30 pts)
  const ratingCount = user.rating_count || (Array.isArray(reviews) ? reviews.length : 0);
  if ((user.rating || 0) > 0 && ratingCount >= 1) {
    score += Math.round((user.rating / 5) * 30);
  }

  // Completed tasks experience (30 pts, 1.5 pts per task, max 30)
  const completedCount = getCompletedCount(tasks, user);
  score += Math.min(Math.round(completedCount * 1.5), 30);

  return Math.min(score, 100);
}

export function getTrustLevel(score) {
  if (score >= 80) return { labelKey: 'tl_high_trust',   label: 'אמון גבוה',   color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', bar: '#10b981' };
  if (score >= 50) return { labelKey: 'tl_good_trust',  label: 'אמון טוב',    color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe', bar: '#3b82f6' };
  if (score >= 20) return { labelKey: 'tl_medium_trust', label: 'אמון בינוני', color: '#d97706', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b' };
  return             { labelKey: 'tl_new',              label: 'חדש',         color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', bar: '#9ca3af' };
}

/**
 * Get the translated trust level label using the i18n t() function.
 * Falls back to the Hebrew label if the key is not translated.
 */
export function getTrustLevelLabel(trustLevel, t) {
  if (!trustLevel) return '';
  if (t && trustLevel.labelKey) {
    const translated = t(trustLevel.labelKey);
    if (translated && translated !== trustLevel.labelKey) return translated;
  }
  return trustLevel.label || '';
}