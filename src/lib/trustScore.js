/**
 * Trust Score Calculation — 0 to 100
 * Aggregates behavioral signals into a single score.
 *
 * Identity verification is KYC approval (kyc_status === 'approved') = full 40 pts.
 * There is no separate phone-verification flow in the app, so phone is NOT a
 * standalone signal — it was a phantom requirement that never matched reality.
 */

// Shared helper so the meter, the popup, and the improvement guide always agree.
//
// ── THE HIGHER OF THE TWO, NEVER THE LOADED LIST ALONE ──────────────────────
// `tasks` is a WINDOW, not the total: the profile loads only the completed tasks
// of the Brand in view, at most 50 of them. `user.tasks_completed` is the
// counter the server increments on every completion, for every Brand.
//
// This used to return the list's length whenever the list was non-empty, so the
// same account could score differently depending on where the score was read:
// the rating popup (which passes no list, only the user) showed the real total,
// while the profile — whose list is scoped to the current Brand — showed that
// Brand's slice. A worker who completed a job on another surface saw the bar
// "not move" or land on a smaller number than the popup had just promised.
//
// The counter is authoritative, so the score is the larger of the two and can
// never go backwards because a list happened to be short, filtered or truncated.
export function getCompletedCount(tasks, user) {
  const fromTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'COMPLETED').length : 0;
  const counter = Number(user?.tasks_completed) || 0;
  return Math.max(fromTasks, counter);
}

export function calculateTrustScore(user, { tasks = [], reviews = [] } = {}) {
  if (!user) return 0;
  let score = 0;

  // Identity verification — KYC approved = full 40 pts (single source of truth: kyc_status)
  if (user.kyc_status === 'approved') score += 40;

  // Rating quality (30 pts)
  // The denormalized `rating`/`rating_count` fields can be out of sync (e.g.
  // wiped by the new-user simulator). Fall back to the actual reviews so the
  // trust bar always reflects real ratings the user received.
  const ratingCount = user.rating_count || (Array.isArray(reviews) ? reviews.length : 0);
  let rating = user.rating;
  if ((!rating || rating <= 0) && Array.isArray(reviews) && reviews.length > 0) {
    const valid = reviews.map(r => r.rating).filter(r => typeof r === 'number' && r > 0);
    if (valid.length) rating = valid.reduce((a, b) => a + b, 0) / valid.length;
  }
  // A positive rating always counts. The old guard also demanded a rating COUNT,
  // but the popup is handed no reviews, so a user whose `rating_count` field was
  // never written scored 0 there while the profile — which also reads the review
  // rows — awarded the points. The average itself is only ever built from real
  // reviews, so the count is a label here, not a second gate.
  if ((rating || 0) > 0) {
    score += Math.round((rating / 5) * 30);
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