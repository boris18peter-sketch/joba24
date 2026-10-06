/**
 * scheduling.ts — the server-side scheduling layer over the CANONICAL Task.
 *
 * Mirrors src/lib/scheduling.js. The two must agree on what a "occurrence" is,
 * because the server decides WHICH notification to send and the client decides
 * which state to render — and they describe the same moment.
 *
 * Scheduling is TASK-BASED: there is no CalendarTask. A task's schedule is read
 * from the two fields the platform already persists (`category_details.schedule`
 * and `scheduled_time`) and projected into one canonical list of occurrences.
 */

/**
 * The three scheduling windows, in hours — the FALLBACK only. The live values
 * come from JobaSettings and are merged over these by `scheduleWindows`.
 */
export const DEFAULT_SCHEDULE_WINDOWS = {
  upcoming_visibility_hours: 48,
  execution_activation_hours: 3,
  starting_soon_reminder_hours: 2,
};

/** Merge admin-configured values over the defaults, ignoring anything invalid. */
export function scheduleWindows(settings: any) {
  const out: any = { ...DEFAULT_SCHEDULE_WINDOWS };
  for (const key of Object.keys(DEFAULT_SCHEDULE_WINDOWS)) {
    const value = Number(settings?.[key]);
    if (Number.isFinite(value) && value >= 0) out[key] = value;
  }
  return out;
}

/**
 * The app's timezone. A schedule slot is stored as a WALL CLOCK — the hour the
 * publisher actually typed ('09:00' means 9am where the work happens), not an
 * instant. The server runs in UTC, so reading that wall clock as UTC would fire
 * every reminder three hours early in summer. Slots are therefore resolved
 * against this zone, which is also what the client's local parse produces.
 */
export const APP_TIMEZONE = 'Asia/Jerusalem';

/** The wall clock ('YYYY-MM-DD HH:MM') an instant shows in a given zone. */
function wallClockInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/**
 * Resolve a 'YYYY-MM-DD' + 'HH:MM' wall clock into the real instant.
 *
 * Both offsets the zone can be on are tried and the one whose rendering matches
 * the requested wall clock wins — so this is correct across the DST switch
 * without hardcoding +02:00 or +03:00.
 */
export function zonedInstant(date: string, time: string, timeZone = APP_TIMEZONE): Date | null {
  const wanted = `${date} ${time}`;
  const naive = new Date(`${date}T${time}:00Z`);
  if (isNaN(naive.getTime())) return null;
  for (const offsetMinutes of [180, 120]) {
    const candidate = new Date(naive.getTime() - offsetMinutes * 60000);
    if (wallClockInZone(candidate, timeZone) === wanted) return candidate;
  }
  return null;
}

/** Human label for an occurrence in the app timezone: 'היום, 09:00' / 'מחר, 14:30'. */
export function formatOccurrenceHe(start: Date, timeZone = APP_TIMEZONE): string {
  const dayKeyOf = (d: Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  const clock = new Intl.DateTimeFormat('he-IL', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(start);
  const key = dayKeyOf(start);
  if (key === dayKeyOf(new Date())) return `היום, ${clock}`;
  if (key === dayKeyOf(new Date(Date.now() + 86400000))) return `מחר, ${clock}`;
  const day = new Intl.DateTimeFormat('he-IL', { timeZone, day: 'numeric', month: 'short' }).format(start);
  return `${day}, ${clock}`;
}

/** A bare 'YYYY-MM-DD' is a date, not an instant — keep it at local midnight. */
function parseTime(value: any): Date | null {
  if (!value) return null;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const normalized = s.includes('T') && !s.endsWith('Z') && !s.includes('+') ? `${s}Z` : s;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * The canonical occurrences of a task, earliest first.
 * Deduplicated by START, so a slot and the derived `scheduled_time` describing
 * the same moment collapse into one.
 */
export function occurrencesOf(task: any): { key: string; start: Date; end: Date | null }[] {
  if (!task) return [];
  const out: { key: string; start: Date; end: Date | null }[] = [];
  const seen = new Set<number>();

  const push = (occurrence: any) => {
    const stamp = occurrence.start.getTime();
    if (seen.has(stamp)) return;
    seen.add(stamp);
    out.push(occurrence);
  };

  for (const slot of (task?.category_details?.schedule || [])) {
    if (!slot?.date) continue;
    // Resolved as a wall clock in the app timezone, matching how the client
    // parses the very same slot — so both sides agree on the instant.
    const start = zonedInstant(slot.date, slot.start || '00:00');
    if (!start) continue;
    const end = slot.end ? zonedInstant(slot.date, slot.end) : null;
    push({ key: `${slot.date}_${slot.start}`, start, end });
  }

  const single = parseTime(task?.scheduled_time);
  if (single) push({ key: 'scheduled_time', start: single, end: null });

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * The idempotency anchor for a time-based notification: one task, one
 * occurrence, one recipient, one notification type. Never changes while the
 * occurrence does not, so a workflow re-run finds the existing marker.
 */
export function occurrenceKey(taskId: string, start: Date): string {
  return `${taskId}_${start.toISOString()}`;
}

/**
 * Which notification window an occurrence falls in RIGHT NOW, or null when it
 * is not notifiable:
 *   'starting_soon' — close enough for the final nudge.
 *   'upcoming'      — inside the visibility window, still further out.
 *   null            — already started/finished, or still beyond the window.
 *
 * An occurrence that has already begun is deliberately NOT notifiable: a
 * reminder to "start soon" for something already under way is noise.
 */
export function notificationWindow(
  occurrence: { start: Date; end: Date | null },
  now: number,
  windows: any,
): 'starting_soon' | 'upcoming' | null {
  const start = occurrence.start.getTime();
  const end = (occurrence.end || occurrence.start).getTime();
  if (end <= now) return null;
  const minutes = (start - now) / 60000;
  if (minutes <= 0) return null;
  if (minutes <= windows.starting_soon_reminder_hours * 60) return 'starting_soon';
  if (minutes <= windows.upcoming_visibility_hours * 60) return 'upcoming';
  return null;
}

/**
 * scheduleSignature — the stable identity of a task's schedule.
 *
 * A worker sees a task's schedule when they apply. If that schedule is
 * unchanged at the moment the publisher picks them, the two are already
 * aligned: the Schedule Agreement is automatic and no confirmation is asked.
 * A signature is the cheapest way to prove "unchanged" without trusting either
 * side's clock or shipping the whole schedule around.
 *
 * Built ONLY from the raw persisted fields, so the client and the server derive
 * an identical string for identical data. It is a change-detector, not a
 * security token — it never gates credits or access.
 */
export function scheduleSignature(task: any): string {
  const slots = (task?.category_details?.schedule || [])
    .map((s: any) => `${s?.date ?? ''} ${s?.start ?? ''}-${s?.end ?? ''}`)
    .sort()
    .join('|');
  const single = task?.scheduled_time ? String(task.scheduled_time) : '';
  return `${slots}::${single}`;
}

/** Whether a task carries any schedule at all. */
export function hasSchedule(task: any): boolean {
  const slots = task?.category_details?.schedule;
  return (Array.isArray(slots) && slots.length > 0) || !!task?.scheduled_time;
}