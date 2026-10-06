/**
 * scheduling.js — the scheduling layer over the CANONICAL Task.
 *
 * Scheduling is TASK-BASED. There is no CalendarTask and no second entity: a
 * task's schedule is read from the two fields the platform already persists —
 * `category_details.schedule` (one or more exact slots the publisher offered)
 * and `scheduled_time` (the single instant a task needs a worker at) — and
 * projected here into one canonical list of occurrences.
 *
 * Every scheduling decision in the app comes from `occurrencesOf` and
 * `schedulePhase`: "is this upcoming or active?", "when does it start?", "may
 * the worker set out yet?". No component compares dates itself.
 *
 * Upcoming and Active Execution are DIFFERENT presentation states:
 *   upcoming — the engagement exists, but execution has not been unlocked.
 *   active   — the window is open; the worker's step CTAs are live.
 */
import { combineDateTime, parseTime, formatWhen } from '@/lib/time';

/**
 * Execution unlocks this long before an occurrence starts. Until then a
 * scheduled task is UPCOMING — visible, agreed, but with no "יצאתי לדרך".
 */
export const ACTIVATION_LEAD_MINUTES = 60;

/** The "starting soon" window. Reminders land here (M3.7). */
export const STARTING_SOON_MINUTES = 120;

/**
 * The canonical occurrences of a task, earliest first.
 *
 * An occurrence is { key, start, end, date, startClock, endClock, source }.
 * Slots and a single instant are deduplicated by start time, so a task that
 * carries both never shows the same moment twice.
 */
export function occurrencesOf(task) {
  if (!task) return [];
  const out = [];
  const seen = new Set();

  // Deduplicate by START alone: a slot and the single instant describe the SAME
  // moment even though only the slot carries an end time. Keying on start+end
  // would list that moment twice.
  const push = (occurrence) => {
    const key = occurrence.start.getTime();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(occurrence);
  };

  // 1. The publisher's explicit slots — the primary source.
  for (const slot of (task.category_details?.schedule || [])) {
    const start = combineDateTime(slot?.date, slot?.start);
    if (!start) continue;
    push({
      key: `${slot.date}_${slot.start}`,
      start,
      end: combineDateTime(slot?.date, slot?.end),
      date: slot.date,
      startClock: slot.start,
      endClock: slot.end,
      source: 'slot',
    });
  }

  // 2. The single instant — a true UTC timestamp, read as an instant (never as
  //    a local clock). CreateTask derives it from the earliest slot, so the two
  //    collapse into ONE occurrence instead of showing the same moment twice.
  const single = parseTime(task.scheduled_time);
  if (single) {
    push({ key: 'scheduled_time', start: single, end: null, date: null, startClock: null, endClock: null, source: 'scheduled_time' });
  }

  return out.sort((a, b) => a.start - b.start);
}

/** The occurrence governing the task now: the next one, else the last one. */
export function primaryOccurrence(task, now = Date.now()) {
  const all = occurrencesOf(task);
  if (!all.length) return null;
  return all.find((o) => (o.end || o.start).getTime() > now) || all[all.length - 1];
}

export function hasSchedule(task) {
  return occurrencesOf(task).length > 0;
}

/**
 * The scheduling phase of a task.
 *   'none'     — no schedule: execution may start immediately.
 *   'upcoming' — scheduled, and execution is not unlocked yet.
 *   'active'   — inside the activation window, or already started.
 *   'ended'    — every occurrence is behind us.
 */
export function schedulePhase(task, now = Date.now()) {
  const all = occurrencesOf(task);
  if (!all.length) return 'none';

  const lastEnd = Math.max(...all.map((o) => (o.end || o.start).getTime()));
  if (lastEnd < now) return 'ended';

  const firstStart = all[0].start.getTime();
  return firstStart - now > ACTIVATION_LEAD_MINUTES * 60000 ? 'upcoming' : 'active';
}

/** Whether the worker may begin execution now — or has no schedule to wait for. */
export function isExecutionActive(task, now = Date.now()) {
  const phase = schedulePhase(task, now);
  return phase === 'none' || phase === 'active';
}

/**
 * Whether the client and the worker are aligned on the schedule. Set once, when
 * the worker is assigned to a schedule they already saw at application time.
 */
export function isScheduleAgreed(task) {
  return !!task?.schedule_agreed_at;
}

/** Display label for an occurrence: 'היום, 14:00–17:00' or 'מחר, 09:30'. */
export function formatOccurrence(occurrence) {
  if (!occurrence) return '';
  const when = formatWhen(occurrence.start);
  return occurrence.endClock ? `${when}–${occurrence.endClock}` : when;
}