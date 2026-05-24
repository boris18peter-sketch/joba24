/**
 * Trust Score Calculation — 0 to 100
 * Aggregates behavioral signals into a single score.
 */

export function calculateTrustScore(user, { tasks = [], reviews = [] } = {}) {
  if (!user) return 0;
  let score = 0;

  // Identity verification (40 pts)
  if (user.is_verified) score += 30;
  if (user.is_phone_verified) score += 10;

  // Rating quality (20 pts)
  const ratingCount = user.rating_count || reviews.length;
  if ((user.rating || 0) > 0 && ratingCount >= 1) {
    score += Math.round((user.rating / 5) * 20);
  }

  // Completed tasks experience (20 pts, 1 pt per task, max 20)
  const completedCount =
    tasks.filter(t => t.status === 'COMPLETED').length ||
    user.tasks_completed || 0;
  score += Math.min(completedCount, 20);

  // On-time arrival rate (10 pts)
  const clientReviews = reviews.filter(r => r.role === 'client');
  const withOnTime = clientReviews.filter(r => r.arrived_on_time != null);
  const onTimeRate =
    withOnTime.length >= 2
      ? (withOnTime.filter(r => r.arrived_on_time === true).length / withOnTime.length) * 100
      : user.on_time_rate || 0;
  if (onTimeRate > 0) score += Math.round((onTimeRate / 100) * 10);

  // Repeat hires / recommendations (10 pts max)
  score += Math.min((user.repeat_hires || 0) * 2, 10);

  return Math.min(score, 100);
}

export function getTrustLevel(score) {
  if (score >= 80) return { label: 'אמון גבוה',   color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', bar: '#10b981' };
  if (score >= 50) return { label: 'אמון טוב',    color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe', bar: '#3b82f6' };
  if (score >= 20) return { label: 'אמון בינוני', color: '#d97706', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b' };
  return             { label: 'חדש',             color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', bar: '#9ca3af' };
}