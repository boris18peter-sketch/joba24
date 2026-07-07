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
  if (hours == null || isNaN(hours)) return '';
  // Sub-hour durations → minutes (e.g. 0.15 → "9 דקות")
  if (hours > 0 && hours < 1) {
    const minutes = Math.round(hours * 60);
    if (minutes === 30) return 'חצי שעה';
    if (minutes === 15) return 'רבע שעה';
    if (minutes === 45) return 'שלושת רבעי שעה';
    return `${minutes} דקות`;
  }
  if (hours === 1) return 'שעה';
  if (hours === 1.5) return 'שעה וחצי';
  if (hours === 2) return 'שעתיים';
  if (Number.isInteger(hours)) return `${hours} שעות`;
  // Mixed hour + minutes (e.g. 1.25 → "שעה ורבע", 2.5 → "שעתיים וחצי")
  const wholeHours = Math.floor(hours);
  const mins = Math.round((hours - wholeHours) * 60);
  const wholeLabel = wholeHours === 1 ? 'שעה' : wholeHours === 2 ? 'שעתיים' : `${wholeHours} שעות`;
  if (mins === 30) return `${wholeLabel} וחצי`;
  if (mins === 15) return `${wholeLabel} ורבע`;
  if (mins === 45) return `${wholeLabel} ושלושת רבע`;
  if (mins > 0) return `${wholeLabel} ו-${mins} דקות`;
  return wholeLabel;
}

const SCHEDULE_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/**
 * Formats an array of schedule slots { date, start, end } into readable labels.
 * Returns [] for empty/invalid input.
 */
export function formatScheduleSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return [];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return slots.map(s => {
    const d = new Date((s.date || '') + 'T00:00:00');
    let dayLabel;
    if (!isNaN(d.getTime())) {
      const isToday = d.toDateString() === now.toDateString();
      const isTomorrow = d.toDateString() === tomorrow.toDateString();
      const weekday = SCHEDULE_WEEKDAYS[d.getDay()] || '';
      const datePart = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
      if (isToday) dayLabel = 'היום';
      else if (isTomorrow) dayLabel = 'מחר';
      else dayLabel = `${weekday}, ${datePart}`;
    } else {
      dayLabel = s.date || '';
    }
    return { dayLabel, time: `${s.start || ''} – ${s.end || ''}` };
  });
}

/**
 * Returns a compact sublabel string for hourly tasks, e.g. "₪50/שעה · 3 שעות".
 * Returns null for non-hourly tasks.
 */
export function formatHourlySublabel(task) {
  const bd = getHourlyBreakdown(task);
  if (!bd) return null;
  // Sub-hour durations are billed by the minute — don't show the hourly rate
  if (bd.hours > 0 && bd.hours < 1) {
    return formatHoursLabel(bd.hours);
  }
  return `₪${bd.hourlyRate}/שעה · ${formatHoursLabel(bd.hours)}`;
}