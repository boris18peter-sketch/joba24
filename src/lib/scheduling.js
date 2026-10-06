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
 * ── Three windows, three states ─────────────────────────────────────────────
 * "Far out", "coming up" and "may start now" are THREE different product states,
 * never one future bucket. Each has its own window:
 *
 *   calendar — beyond the visibility window. Calendar only; no Upcoming entry.
 *   upcoming — inside the visibility window. Calendar AND Upcoming.
 *   active   — inside the activation window. Active Task, with the
 *              category-aware status flow and live step CTAs.
 *
 * Upcoming and Active Execution are therefore never the same window, and a task
 * does not silently become "active" just because it has a future date.
 */
import { combineDateTime, parseTime, formatWhen } from '@/lib/time';

/**
 * The three scheduling windows, in hours.
 *
 * These defaults are placeholders for JobaSettings (M3.7). Every function below
 * accepts a `windows` argument, so promoting them to the dashboard is a DATA
 * change and not a code change — no caller hard-codes a window.
 */
export const DEFAULT_SCHEDULE_WINDOWS = {
  /** How far ahead the Upcoming list reaches. */
  upcoming_visibility_hours: 48,
  /** How early before an occurrence the worker may begin execution. */
  execution_activation_hours: 3,
  /** When the "starting soon" reminder fires (M3.7). */
  starting_soon_reminder_hours: 2,
};

/**
 * Merge admin-configured values over the defaults. Anything missing or not a
 * non-negative number is ignored, so a half-written settings record can never
 * disable the scheduling windows.
 */
export function scheduleWindows(settings) {
  const out = { ...DEFAULT_SCHEDULE_WINDOWS };
  for (const key of Object.keys(out)) {
    const value = Number(settings?.[key]);
    if (Number.isFinite(value) && value >= 0) out[key] = value;
  }
  return out;
}

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

/** The next occurrence still ahead (or in progress), else null. */
export function nextOccurrence(task, now = Date.now()) {
  return occurrencesOf(task).find((o) => (o.end || o.start).getTime() > now) || null;
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
 *   'calendar' — scheduled beyond the visibility window: calendar only.
 *   'upcoming' — inside the visibility window, execution not unlocked yet.
 *   'active'   — inside the activation window, or already started.
 *   'ended'    — every occurrence is behind us (handled in M3.8).
 *
 * The phase follows the NEXT occurrence, not the first one, so a task whose
 * earlier slot has passed is judged by the slot still ahead of it.
 */
export function schedulePhase(task, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  const all = occurrencesOf(task);
  if (!all.length) return 'none';

  const next = all.find((o) => (o.end || o.start).getTime() > now);
  if (!next) return 'ended';

  const minutesToStart = (next.start.getTime() - now) / 60000;
  if (minutesToStart <= windows.execution_activation_hours * 60) return 'active';
  if (minutesToStart <= windows.upcoming_visibility_hours * 60) return 'upcoming';
  return 'calendar';
}

/** Whether the worker may begin execution now — or has no schedule to wait for. */
export function isExecutionActive(task, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  const phase = schedulePhase(task, now, windows);
  return phase === 'none' || phase === 'active';
}

/**
 * Whether the task is an AGREED ENGAGEMENT that has not started: either inside
 * the Upcoming window or still far out. Both are "not execution" — the banner
 * shows the planned time and offers no step CTA for either.
 */
export function isEngagement(task, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  const phase = schedulePhase(task, now, windows);
  return phase === 'upcoming' || phase === 'calendar';
}

/** Whether the task is beyond the Upcoming window — calendar only. */
export function isCalendarOnly(task, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  return schedulePhase(task, now, windows) === 'calendar';
}

/** Whether the occurrence is close enough to warrant a "starting soon" nudge. */
export function isStartingSoon(task, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  const next = nextOccurrence(task, now);
  if (!next) return false;
  const minutes = (next.start.getTime() - now) / 60000;
  return minutes > 0 && minutes <= windows.starting_soon_reminder_hours * 60;
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

/* ────────────────────────────────────────────────────────────────────────────
   RESCHEDULE & CONFLICT DETECTION (M3.8)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The assumed length of an occurrence that carries no explicit end. Mirrors the
 * server constant; the live value comes from JobaSettings.
 */
export const DEFAULT_OCCURRENCE_MINUTES = 60;

/** Tasks that are no longer engagements — they can never conflict. */
export const TERMINAL_TASK_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

/**
 * Whether two occurrences collide in time. An occurrence without an end is
 * given `defaultMinutes` of assumed length, so a job that only states a start
 * still collides with whatever is booked straight after it.
 */
export function overlaps(a, b, defaultMinutes = DEFAULT_OCCURRENCE_MINUTES) {
  if (!a?.start || !b?.start) return false;
  const aStart = a.start.getTime();
  const aEnd = (a.end || new Date(aStart + defaultMinutes * 60000)).getTime();
  const bStart = b.start.getTime();
  const bEnd = (b.end || new Date(bStart + defaultMinutes * 60000)).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/**
 * The user's OTHER work that collides with `occurrence` — a warning, never a
 * block. The person stays free to proceed; they are simply told they are
 * double-booked so the choice is informed.
 */
export function findConflicts({ tasks, userId, occurrence, excludeTaskId = null, defaultMinutes = DEFAULT_OCCURRENCE_MINUTES }) {
  const out = [];
  if (!userId || !occurrence?.start) return out;

  for (const task of (tasks || [])) {
    if (!task?.id || task.id === excludeTaskId) continue;
    if (TERMINAL_TASK_STATUSES.includes(task.status)) continue;
    // Only work THIS person is committed to — as the publisher or as the worker.
    const asClient = task.client_id === userId;
    const asWorker = task.worker_id === userId;
    if (!asClient && !asWorker) continue;

    for (const other of occurrencesOf(task)) {
      if (!overlaps(occurrence, other, defaultMinutes)) continue;
      out.push({
        task_id: task.id,
        task_title: task.title || '',
        role: asClient ? 'client' : 'worker',
        start: other.start.toISOString(),
        end: other.end ? other.end.toISOString() : null,
      });
    }
  }
  return out;
}

/** The occurrence a change request targets — by its stable key, never by index. */
export function findOccurrence(task, key) {
  return occurrencesOf(task).find((o) => o.key === key) || null;
}

/**
 * A pending change request, or null. While one is pending the ORIGINAL time
 * stays the effective one — the calendar is not touched until it is accepted.
 */
export function pendingChangeRequest(task) {
  return task?.schedule_change_request || null;
}

/** Whether this user asked for the pending change (so they cannot accept it). */
export function isChangeRequester(task, userId) {
  return !!userId && task?.schedule_change_request?.requested_by === userId;
}