import { useEffect, useState } from 'react';
import { occurrencesOf, DEFAULT_SCHEDULE_WINDOWS } from '@/lib/scheduling';

/**
 * useScheduleClock — the minimum re-render needed for the calendar → upcoming →
 * active transitions to happen live.
 *
 * No polling: it computes the exact instant the NEXT phase boundary is crossed
 * (a task entering the upcoming window, or entering the execution window, or
 * starting) and arms a single timer for it. When the timer fires, `now` advances
 * once and the hook re-arms for the boundary after that.
 *
 * The timer is capped so a boundary days away cannot rely on one long timeout
 * (background tabs throttle and suspend them); a visibilitychange listener
 * re-syncs immediately when the user comes back, so a sleeping tab is correct
 * the moment it is seen again rather than after the next tick.
 */

/** The soonest instant after `now` at which any task's phase changes. */
function nextBoundary(tasks, now, upcomingHours, activationHours) {
  const leads = [activationHours * 3600000, upcomingHours * 3600000];
  let soonest = null;
  for (const task of (tasks || [])) {
    for (const occurrence of occurrencesOf(task)) {
      const start = occurrence.start.getTime();
      const end = (occurrence.end || occurrence.start).getTime();
      for (const candidate of [...leads.map((l) => start - l), start, end]) {
        if (candidate > now && (soonest === null || candidate < soonest)) soonest = candidate;
      }
    }
  }
  return soonest;
}

/** Longest single timeout we will arm — keeps a far boundary from relying on one. */
const MAX_DELAY_MS = 30 * 60 * 1000;

export function useScheduleClock(tasks, windows) {
  const upcomingHours = windows?.upcoming_visibility_hours ?? DEFAULT_SCHEDULE_WINDOWS.upcoming_visibility_hours;
  const activationHours = windows?.execution_activation_hours ?? DEFAULT_SCHEDULE_WINDOWS.execution_activation_hours;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const soonest = nextBoundary(tasks, Date.now(), upcomingHours, activationHours);
    if (soonest === null) return;
    const delay = Math.min(Math.max(soonest - Date.now(), 250), MAX_DELAY_MS);
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [tasks, now, upcomingHours, activationHours]);

  // A backgrounded tab suspends timers. Re-sync the instant it is visible again
  // instead of waiting for the next tick.
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return now;
}