/**
 * scheduleEntries.js — projects TASKS into calendar entries.
 *
 * A "job" in the calendar is not an entity: it is one OCCURRENCE of an existing
 * Task. A task with three slots therefore produces three entries, each placed
 * independently on the calendar and each opening the SAME Task sheet.
 *
 * Nothing here invents data — it is a pure projection of `occurrencesOf`.
 */
import { occurrencesOf, schedulePhase, DEFAULT_SCHEDULE_WINDOWS } from '@/lib/scheduling';

/** 'YYYY-MM-DD' of a moment in LOCAL time — the calendar's day key. */
export function dateKey(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The day key of a 'YYYY-MM-DD' string, unchanged — for selected-day compare. */
export function keyOfDay(date) {
  return dateKey(date);
}

/**
 * Every scheduled occurrence of every task the user takes part in, earliest
 * first. `role` is 'client' when they published the task, 'worker' when they
 * were assigned to it — the same task can only ever be one of the two for them.
 */
export function buildScheduleEntries(tasks, meId, now = Date.now()) {
  const out = [];
  for (const task of (tasks || [])) {
    if (!task || !task.id) continue;
    const role = task.client_id === meId ? 'client' : 'worker';
    const phase = schedulePhase(task, now);
    for (const occurrence of occurrencesOf(task)) {
      out.push({
        id: `${task.id}_${occurrence.key}`,
        task,
        occurrence,
        role,
        phase,
        day: dateKey(occurrence.start),
      });
    }
  }
  return out.sort((a, b) => a.occurrence.start - b.occurrence.start);
}

/**
 * The entries inside the Upcoming window that have not already ended — the
 * "coming up" list. Anything further out stays on the calendar only.
 */
export function upcomingEntries(entries, now = Date.now(), windows = DEFAULT_SCHEDULE_WINDOWS) {
  const horizon = now + windows.upcoming_visibility_hours * 3600000;
  return (entries || []).filter((entry) => {
    const end = (entry.occurrence.end || entry.occurrence.start).getTime();
    return end > now && entry.occurrence.start.getTime() <= horizon;
  });
}

/** Entries grouped by day key, preserving the earliest-first order. */
export function groupByDay(entries) {
  const map = new Map();
  for (const entry of (entries || [])) {
    if (!map.has(entry.day)) map.set(entry.day, []);
    map.get(entry.day).push(entry);
  }
  return map;
}