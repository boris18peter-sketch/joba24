/**
 * time.js — the SINGLE source of every date/time decision in the app.
 *
 * Scheduling, alerts, comparisons and formatting all read from here, so a
 * "future moment" means the same thing in the feed, the active banner, the task
 * sheet and the reminder layer. No component re-implements a date parse.
 *
 * ── The naive-UTC rule ──────────────────────────────────────────────────────
 * Date-times are stored as ISO strings. A value that carries no zone
 * (`2026-10-06T14:00:00`) is UTC by convention across this app — the rule every
 * existing screen already applied by hand. `parseTime` applies it once,
 * centrally, so the behaviour can never drift between screens again.
 */

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** Parse a stored time value into a Date, or null when it is not a time. */
export function parseTime(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value);
  // A bare 'YYYY-MM-DD' is a DATE, not an instant — keep it at local midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const normalized = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? `${s}Z` : s;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function isValidTime(value) {
  return parseTime(value) !== null;
}

/** 'HH:MM' — from an ISO instant or an already-formatted clock string. */
export function formatClock(value) {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;
  const d = parseTime(value);
  return d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
}

/** 'today' | 'tomorrow' | 'yesterday' | null — the calendar relation of a date. */
export function dayRelation(value) {
  const d = parseTime(value);
  if (!d) return null;
  const dayOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayOf(d) - dayOf(new Date())) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return null;
}

export function isSameDay(a, b) {
  const da = parseTime(a), db = parseTime(b);
  if (!da || !db) return false;
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

/**
 * Human label for a moment: 'היום, 14:00' · 'מחר, 09:30' ·
 * 'יום ג׳, 6 באוק׳, 14:00'. Returns '' for an unparseable value.
 */
export function formatWhen(value) {
  const d = parseTime(value);
  if (!d) return '';
  const clock = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const rel = dayRelation(value);
  if (rel === 'today') return `היום, ${clock}`;
  if (rel === 'tomorrow') return `מחר, ${clock}`;
  const datePart = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  return `${WEEKDAYS_HE[d.getDay()]}, ${datePart}, ${clock}`;
}

/** Whole minutes from now to a moment. Negative = already past. null = unparseable. */
export function minutesFromNow(value) {
  const d = parseTime(value);
  return d ? Math.round((d.getTime() - Date.now()) / 60000) : null;
}

export function isFuture(value) {
  const m = minutesFromNow(value);
  return m !== null && m > 0;
}

export function isPast(value) {
  const m = minutesFromNow(value);
  return m !== null && m <= 0;
}

/**
 * Combine a 'YYYY-MM-DD' date and an 'HH:MM' time into a Date in LOCAL time —
 * the shape the schedule slots are stored in.
 */
export function combineDateTime(date, time) {
  if (!date) return null;
  const d = new Date(`${date}T${time || '00:00'}:00`);
  return isNaN(d.getTime()) ? null : d;
}