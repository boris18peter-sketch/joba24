/**
 * Price calculation and hourly pricing helpers.
 * Single source of truth for displaying task prices across the app.
 */

/**
 * Returns task.price exactly as stored in the DB.
 * We never override the user-entered price with a calculated value for display.
 */
export function calculateCurrentPrice(task) {
  return task.price ?? 0;
}

/**
 * Checks whether a task uses hourly pricing (rate × hours = total).
 * Relies on category_details.pricing_type === 'hourly' set at creation time.
 */
export function isHourlyTask(task) {
  return task?.category_details?.pricing_type === 'hourly';
}

/**
 * Returns { hourlyRate, hours, total } for hourly tasks, or null otherwise.
 * The hourlyRate is kept in sync by the auto-bump logic (updated proportionally
 * when the total price increases).
 */
export function getHourlyBreakdown(task) {
  const cd = task?.category_details;
  if (!cd || cd.pricing_type !== 'hourly') return null;
  const hours = cd.hours ? parseFloat(cd.hours) : null;
  const hourlyRate = cd.hourly_rate ? Number(cd.hourly_rate) : null;
  if (!hours || !hourlyRate) return null;
  return { hourlyRate, hours, total: task.price ?? 0 };
}

/**
 * Formats the hours value as a Hebrew label.
 * 1 → "שעה", 2 → "2 שעות", 0.5 → "חצי שעה", 1.5 → "שעה וחצי"
 */
export function formatHoursLabel(hours) {
  if (hours === 0.5) return 'חצי שעה';
  if (hours === 1) return 'שעה';
  if (hours === 1.5) return 'שעה וחצי';
  if (hours === 2) return 'שעתיים';
  return `${hours} שעות`;
}

/**
 * Returns a compact sublabel string for hourly tasks, e.g. "₪50/שעה · 3 שעות".
 * Returns null for non-hourly tasks.
 */
export function formatHourlySublabel(task) {
  const bd = getHourlyBreakdown(task);
  if (!bd) return null;
  return `₪${bd.hourlyRate}/שעה · ${formatHoursLabel(bd.hours)}`;
}