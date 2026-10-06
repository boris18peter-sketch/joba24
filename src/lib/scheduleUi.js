/**
 * scheduleUi.js — the PRESENTATION vocabulary of the Job Calendar.
 *
 * Pure UI: role colours, day-density tint and countdown copy. No scheduling
 * decision lives here. Every phase, window and occurrence still comes from
 * `scheduling.js`, so this file can never disagree with the logic — it only
 * decides how a value that already exists is painted.
 */

/**
 * The one role language, used by the Calendar, the "what's next" hero, the daily
 * agenda and every role badge, so the same colour always means the same side of
 * the marketplace.
 */
export const ROLE_STYLE = {
  worker: {
    accent: 'var(--brand-primary)',
    tint: 'var(--brand-primary-light)',
    border: 'var(--border-2)',
    text: 'var(--brand-primary)',
    label: 'אני מבצע',
  },
  client: {
    accent: 'var(--color-warning)',
    tint: 'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
    text: 'var(--color-warning)',
    label: 'פרסמתי',
  },
};

export function roleStyle(role) {
  return ROLE_STYLE[role] || ROLE_STYLE.worker;
}

/**
 * A day's tint deepens with the number of jobs on it, so a full day carries more
 * visual weight than a single one. Three steps only — beyond that the badge says
 * the exact number, and more tint would just get muddy.
 */
export function densityTint(count) {
  if (!count || count <= 0) return 'transparent';
  if (count === 1) return 'rgba(26,111,212,0.07)';
  if (count === 2) return 'rgba(26,111,212,0.14)';
  return 'rgba(26,111,212,0.21)';
}

/**
 * 'בעוד 3 שעות' / 'בעוד 25 דק׳' — the near-term framing of the next job.
 * Returns null beyond a day, where the day label ("מחר", "יום שישי") says it
 * better than an hour count.
 */
export function countdownLabel(start, now = Date.now()) {
  if (!start) return null;
  const minutes = Math.round((start.getTime() - now) / 60000);
  if (minutes <= 0) return 'עכשיו';
  if (minutes < 60) return `בעוד ${minutes} דק׳`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `בעוד ${hours} שעות`;
  return null;
}