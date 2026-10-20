import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isServiceRoleCall, forbidden } from '../../shared/internalAuth.ts';
import { getJobaSettings } from '../../shared/jobaSettings.ts';
import {
  scheduleWindows,
  occurrencesOf,
  occurrenceKey,
  notificationWindow,
  formatOccurrenceHe,
} from '../../shared/scheduling.ts';

/**
 * ── scheduleNotifications ────────────────────────────────────────────────
 * Time-based scheduling notifications: "Upcoming" and "Starting Soon".
 *
 * Runs from the "Schedule: Upcoming & Starting Soon" workflow every 15 minutes.
 * It is the ONLY caller, so it is locked to service-role invocations (with an
 * admin fallback so it can be tested from the dashboard).
 *
 * ── Idempotency ──────────────────────────────────────────────────────────
 * The workflow runs again and again, but a recipient must be told ONCE per
 * task + occurrence + notification type. Every send is therefore anchored to an
 * `occurrence_key` (task id + the occurrence's start instant) written to
 * NotificationLog, and this function checks for that marker before sending.
 *
 * A task with SEVERAL occurrences produces several distinct keys, so each slot
 * is notified once — and a re-run of the workflow finds every one of them.
 */

/** The recipients of a scheduling notification: both sides of the engagement. */
function recipientsOf(task: any): { id: string; role: 'worker' | 'client' }[] {
  const out: { id: string; role: 'worker' | 'client' }[] = [];
  if (task.worker_id) out.push({ id: task.worker_id, role: 'worker' });
  if (task.client_id && task.client_id !== task.worker_id) out.push({ id: task.client_id, role: 'client' });
  return out;
}

/**
 * The role-aware line. The publisher and the worker care about different
 * things: one is going to the job, the other is waiting for someone.
 */
function roleLine(task: any, role: 'worker' | 'client', when: string, startingSoon: boolean): string {
  const title = task.title || 'המשימה';
  if (role === 'worker') {
    return startingSoon
      ? `זמן לצאת — "${title}" מתחיל ב-${when}`
      : `"${title}" מתחיל ב-${when}`;
  }
  return startingSoon
    ? `העובד אמור להתחיל את "${title}" ב-${when}`
    : `העובד יגיע ל"${title}" ב-${when}`;
}

/** The only two event keys this job ever writes — used to narrow the marker read. */
const SCHEDULE_EVENT_KEYS = ['schedule_upcoming', 'schedule_starting_soon'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Workflow-only endpoint: no frontend caller exists. Reject anything that is
    // not a service-role invocation, except a signed-in admin (dashboard tests).
    if (!isServiceRoleCall(req)) {
      const user = await base44.auth.me().catch(() => null);
      if (user?.role !== 'admin') {
        console.warn('[scheduleNotifications] Rejected non-service-role invocation');
        return forbidden();
      }
    }

    const settings = await getJobaSettings(base44);
    const windows = scheduleWindows(settings);
    const now = Date.now();

    // ── Only agreed engagements whose schedule can still be notifiable ───────
    // `scheduled_time` is the EARLIEST occurrence of a task — CreateTask and the
    // reschedule layer both derive it that way — so a task whose earliest
    // occurrence sits beyond the visibility window cannot have ANY occurrence
    // inside it. Nothing to remind anyone about, and it no longer has to travel
    // here to be discarded.
    //
    // The second branch keeps tasks carrying no `scheduled_time` at all: their
    // occurrences could only come from slots, and excluding them would silently
    // stop their reminders. The window check below still decides every send.
    const horizon = new Date(now + windows.upcoming_visibility_hours * 3600000).toISOString();
    const taskQuery = {
      status: 'TAKEN',
      $or: [
        { scheduled_time: { $lte: horizon } },
        { scheduled_time: { $exists: false } },
      ],
    };

    const tasks = [];
    let skip = 0;
    const pageSize = 200;
    while (true) {
      const page = await base44.asServiceRole.entities.Task.filter(taskQuery, 'scheduled_time', pageSize, skip);
      tasks.push(...page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    // ── Pass 1: which (task, occurrence, recipient, type) is in a window? ───
    const candidates = [];
    const markers = new Set();
    for (const task of tasks) {
      if (!task?.id) continue;

      for (const occurrence of occurrencesOf(task)) {
        const window = notificationWindow(occurrence, now, windows);
        if (!window) continue;

        const eventKey = window === 'starting_soon' ? 'schedule_starting_soon' : 'schedule_upcoming';
        const marker = occurrenceKey(task.id, occurrence.start);
        const when = formatOccurrenceHe(occurrence.start);
        markers.add(marker);

        for (const recipient of recipientsOf(task)) {
          candidates.push({ task, eventKey, marker, when, window, recipient });
        }
      }
    }

    // ── ONE read answers every "already told?" question ─────────────────────
    // This used to be a NotificationLog query PER RECIPIENT PER OCCURRENCE PER
    // TASK, inside the innermost loop — up to several hundred reads every
    // fifteen minutes, all of them asking a question about a handful of markers.
    // The markers are known before any send happens, so they are read together
    // and the answers are held in a set.
    const told = new Set();
    const markerList = [...markers];
    const MARKER_CHUNK = 25;
    const markerChunkCount = Math.ceil(markerList.length / MARKER_CHUNK);
    for (const [c] of Array.from({ length: markerChunkCount }).entries()) {
      const chunk = markerList.slice(c * MARKER_CHUNK, c * MARKER_CHUNK + MARKER_CHUNK);
      const rows = await base44.asServiceRole.entities.NotificationLog.filter(
        { occurrence_key: { $in: chunk }, event_key: { $in: SCHEDULE_EVENT_KEYS } },
        '-created_date', 1000, 0,
      );
      for (const row of rows || []) {
        told.add(`${row.user_id}|${row.event_key}|${row.occurrence_key}`);
      }
    }

    // ── Pass 2: send only what has not been sent before ─────────────────────
    const sent: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const c of candidates) {
      const key = `${c.recipient.id}|${c.eventKey}|${c.marker}`;

      // Already told? Any prior log row for this exact task+occurrence+type+
      // recipient — regardless of outcome — counts. Retrying a segment/cooldown
      // rejection forever would be spam, not diligence.
      if (told.has(key)) {
        skipped.push(`${c.marker}:${c.recipient.id}:${c.eventKey}`);
        continue;
      }

      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: c.eventKey,
          user_ids: [c.recipient.id],
          task_id: c.task.id,
          occurrence_key: c.marker,
          variables: {
            task_title: c.task.title || '',
            task_id: c.task.id,
            when: c.when,
            occurrence_key: c.marker,
            role_line: roleLine(c.task, c.recipient.role, c.when, c.window === 'starting_soon'),
          },
        });
        sent.push(`${c.marker}:${c.recipient.id}:${c.eventKey}`);
      } catch (sendErr) {
        errors.push(`${c.marker}:${c.recipient.id}: ${sendErr.message}`);
      }
    }

    console.log('[scheduleNotifications]', {
      scanned: tasks.length,
      candidates: candidates.length,
      sent: sent.length,
      skipped: skipped.length,
      errors: errors.length,
    });

    return Response.json({
      scanned: tasks.length,
      sent: sent.length,
      skipped: skipped.length,
      errors,
    });
  } catch (error) {
    console.error('[scheduleNotifications] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});