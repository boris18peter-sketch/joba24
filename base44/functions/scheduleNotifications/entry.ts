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

    // Only agreed engagements can be notified: an OPEN task has no worker yet.
    const tasks = await base44.asServiceRole.entities.Task.filter({ status: 'TAKEN' }, '-created_date', 300);

    const sent: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const task of (tasks || [])) {
      if (!task?.id) continue;

      for (const occurrence of occurrencesOf(task)) {
        const window = notificationWindow(occurrence, now, windows);
        if (!window) continue;

        const eventKey = window === 'starting_soon' ? 'schedule_starting_soon' : 'schedule_upcoming';
        const marker = occurrenceKey(task.id, occurrence.start);
        const when = formatOccurrenceHe(occurrence.start);

        for (const recipient of recipientsOf(task)) {
          try {
            // Already told? Any prior log row for this exact task+occurrence+
            // type+recipient — regardless of outcome — counts. Retrying a
            // segment/cooldown rejection forever would be spam, not diligence.
            const existing = await base44.asServiceRole.entities.NotificationLog.filter({
              user_id: recipient.id,
              event_key: eventKey,
              occurrence_key: marker,
            });
            if (existing.length > 0) {
              skipped.push(`${marker}:${recipient.id}:${eventKey}`);
              continue;
            }

            await base44.asServiceRole.functions.invoke('notificationManager', {
              event_key: eventKey,
              user_ids: [recipient.id],
              task_id: task.id,
              occurrence_key: marker,
              variables: {
                task_title: task.title || '',
                task_id: task.id,
                when,
                occurrence_key: marker,
                role_line: roleLine(task, recipient.role, when, window === 'starting_soon'),
              },
            });
            sent.push(`${marker}:${recipient.id}:${eventKey}`);
          } catch (sendErr) {
            errors.push(`${marker}:${recipient.id}: ${sendErr.message}`);
          }
        }
      }
    }

    console.log('[scheduleNotifications]', { sent: sent.length, skipped: skipped.length, errors: errors.length });

    return Response.json({
      scanned: (tasks || []).length,
      sent: sent.length,
      skipped: skipped.length,
      errors,
    });
  } catch (error) {
    console.error('[scheduleNotifications] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});