import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getJobaSettings } from '../../shared/jobaSettings.ts';
import {
  occurrencesOf,
  zonedInstant,
  formatOccurrenceHe,
  applyOccurrenceChange,
  findConflicts,
  TERMINAL_TASK_STATUSES,
} from '../../shared/scheduling.ts';

/**
 * ── rescheduleTask ───────────────────────────────────────────────────────
 * בקשה לשינוי מועד (Reschedule) — זמינה לשני הצדדים לאחר שנקבעה עבודה.
 *
 *   request  → הצד השני רואה Old → New ושולט ב-Accept / Decline
 *   accept   → המועד הקנוני מתעדכן, schedule_agreed_at = now, הבקשה מנוקה
 *   decline  → המועד המקורי נשאר ללא שינוי, הבקשה מנוקה
 *
 * ── למה זה לא ביטול ─────────────────────────────────────────────────────
 * שינוי מועד מוסכם אינו Cancellation. הפונקציה הזו במכוון לא נוגעת ב:
 * Task.status, worker_status, ג'ובות, CreditTransaction, אמינות/דירוג,
 * או בכל לוגיקת cancellation / no-show. היא כותבת אך ורק את שדות המועד.
 *
 * ── Multiple occurrences ────────────────────────────────────────────────
 * משימה אינה מועד אחד. הבקשה נושאת `occurrence_key` — המזהה היציב של המועד
 * הבודד שמשתנה — ולכן שינוי של יום חמישי לא יכול להזיז את יום ראשון.
 *
 * ── Conflict = Warning בלבד ─────────────────────────────────────────────
 * חפיפה עם עבודה אחרת מדווחת בחזרה למשתמש, ולעולם אינה חוסמת את הפעולה.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const HISTORY_LIMIT = 10;

/** Validate the proposed slot and resolve it to real instants. */
function cleanProposed(raw: any) {
  const date = String(raw?.date || '');
  const start = String(raw?.start || '');
  const end = String(raw?.end || '');
  if (!DATE_RE.test(date) || !TIME_RE.test(start) || !TIME_RE.test(end)) return null;
  if (end <= start) return null;
  const startInstant = zonedInstant(date, start);
  const endInstant = zonedInstant(date, end);
  if (!startInstant || !endInstant) return null;
  // A new time in the past is not a reschedule, it is a mistake.
  if (startInstant.getTime() <= Date.now()) return null;
  return { date, start, end, iso: startInstant.toISOString(), end_iso: endInstant.toISOString() };
}

/** Every non-terminal task this user is committed to, as publisher or worker. */
async function committedTasksOf(base44: any, userId: string) {
  const [asClient, asWorker] = await Promise.all([
    base44.asServiceRole.entities.Task.filter({ client_id: userId }, '-created_date', 100),
    base44.asServiceRole.entities.Task.filter({ worker_id: userId }, '-created_date', 100),
  ]);
  const seen = new Set<string>();
  const out: any[] = [];
  for (const task of [...(asClient || []), ...(asWorker || [])]) {
    if (!task?.id || seen.has(task.id)) continue;
    seen.add(task.id);
    if (TERMINAL_TASK_STATUSES.includes(task.status)) continue;
    out.push(task);
  }
  return out;
}

/** The bounded audit trail — the fact that a reschedule happened is never lost. */
function pushHistory(task: any, entry: any) {
  const history = Array.isArray(task.schedule_change_history) ? task.schedule_change_history : [];
  return [...history, entry].slice(-HISTORY_LIMIT);
}

/** Hebrew label for the party who asked, from the RECIPIENT's point of view. */
function requesterLabelFromRecipient(task: any, requesterId: string) {
  return task.client_id === requesterId ? 'המפרסם' : 'העובד';
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const { action, taskId, occurrence_key, proposed } = await req.json().catch(() => ({}));
    if (!action || !taskId) return Response.json({ error: 'missing_fields' }, { status: 400 });

    const found = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = found[0];
    if (!task) return Response.json({ error: 'not_found' }, { status: 404 });

    const isClient = task.client_id === user.id;
    const isWorker = task.worker_id === user.id;
    if (!isClient && !isWorker) return Response.json({ error: 'forbidden' }, { status: 403 });
    if (task.status !== 'TAKEN') {
      return Response.json({ error: 'not_agreed', status: task.status }, { status: 409 });
    }

    const pending = task.schedule_change_request || null;
    const settings = await getJobaSettings(base44);
    const defaultMinutes = settings.default_occurrence_minutes;
    const myRoleLabel = isClient ? 'המפרסם' : 'העובד';

    /* ── REQUEST ───────────────────────────────────────────────────────── */
    if (action === 'request') {
      if (pending) return Response.json({ error: 'request_pending' }, { status: 409 });

      const target = occurrencesOf(task).find((o: any) => o.key === occurrence_key);
      if (!target) return Response.json({ error: 'occurrence_not_found' }, { status: 404 });

      const clean = cleanProposed(proposed);
      if (!clean) return Response.json({ error: 'invalid_time' }, { status: 400 });

      const request = {
        occurrence_key: target.key,
        old: {
          key: target.key,
          iso: target.start.toISOString(),
          end_iso: target.end ? target.end.toISOString() : null,
          date: target.date ?? null,
          start: target.startClock ?? null,
          end: target.endClock ?? null,
        },
        proposed: clean,
        requested_by: user.id,
        requested_by_name: user.full_name || '',
        requested_at: new Date().toISOString(),
      };

      await base44.asServiceRole.entities.Task.update(taskId, { schedule_change_request: request });

      // Warning only — the requester is told they are double-booked, and stays
      // free to proceed. Nothing is blocked.
      let conflicts: any[] = [];
      try {
        const mine = await committedTasksOf(base44, user.id);
        conflicts = findConflicts({
          tasks: mine,
          userId: user.id,
          occurrence: { start: new Date(clean.iso), end: new Date(clean.end_iso) },
          excludeTaskId: taskId,
          defaultMinutes,
        });
      } catch (conflictErr) {
        console.log('[rescheduleTask] conflict check failed:', conflictErr.message);
      }

      if (task.client_id !== user.id || task.worker_id !== user.id) {
        const recipientId = isClient ? task.worker_id : task.client_id;
        if (recipientId) {
          try {
            await base44.asServiceRole.functions.invoke('notificationManager', {
              event_key: 'schedule_change_requested',
              user_ids: [recipientId],
              task_id: taskId,
              variables: {
                task_title: task.title || '',
                task_id: taskId,
                requester_label: myRoleLabel,
                old_when: formatOccurrenceHe(target.start),
                new_when: formatOccurrenceHe(new Date(clean.iso)),
              },
            });
          } catch (notifyErr) {
            console.log('[rescheduleTask] requested notification failed:', notifyErr.message);
          }
        }
      }

      return Response.json({ success: true, request, conflicts });
    }

    /* ── ACCEPT ────────────────────────────────────────────────────────── */
    if (action === 'accept') {
      if (!pending) return Response.json({ error: 'no_request' }, { status: 409 });
      if (pending.requested_by === user.id) {
        return Response.json({ error: 'cannot_accept_own_request' }, { status: 403 });
      }

      const applied = applyOccurrenceChange(task, pending.occurrence_key, pending.proposed);
      if (!applied) return Response.json({ error: 'occurrence_not_found' }, { status: 409 });

      const nowIso = new Date().toISOString();
      const history = pushHistory(task, {
        occurrence_key: pending.occurrence_key,
        old: pending.old,
        proposed: pending.proposed,
        outcome: 'accepted',
        actor_id: user.id,
        actor_name: user.full_name || '',
        actor_role: isClient ? 'client' : 'worker',
        requested_by: pending.requested_by,
        at: nowIso,
      });

      // ONLY the schedule moves. Status, worker_status, credits and reliability
      // are deliberately untouched — an agreed reschedule is not a cancellation.
      await base44.asServiceRole.entities.Task.update(taskId, {
        category_details: applied.category_details,
        scheduled_time: applied.scheduled_time,
        schedule_agreed_at: nowIso,
        schedule_change_request: null,
        schedule_change_history: history,
      });

      let conflicts: any[] = [];
      try {
        const mine = await committedTasksOf(base44, user.id);
        if (applied.occurrence) {
          conflicts = findConflicts({
            tasks: mine,
            userId: user.id,
            occurrence: applied.occurrence,
            excludeTaskId: taskId,
            defaultMinutes,
          });
        }
      } catch (conflictErr) {
        console.log('[rescheduleTask] conflict check failed:', conflictErr.message);
      }

      // The requester proposed it, so the OTHER side accepted — tell the requester.
      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'schedule_change_accepted',
          user_ids: [pending.requested_by],
          task_id: taskId,
          variables: {
            task_title: task.title || '',
            task_id: taskId,
            old_when: pending.old?.iso ? formatOccurrenceHe(new Date(pending.old.iso)) : '',
            new_when: formatOccurrenceHe(new Date(pending.proposed.iso)),
          },
        });
      } catch (notifyErr) {
        console.log('[rescheduleTask] accepted notification failed:', notifyErr.message);
      }

      // The OLD occurrence key no longer matches any occurrence of this task, so
      // its pending Upcoming / Starting Soon reminders can never fire again. The
      // NEW start produces a fresh key and therefore fresh reminders.
      return Response.json({
        success: true,
        conflicts,
        scheduled_time: applied.scheduled_time,
        new_occurrence: applied.occurrence ? applied.occurrence.start.toISOString() : null,
      });
    }

    /* ── DECLINE ───────────────────────────────────────────────────────── */
    if (action === 'decline') {
      if (!pending) return Response.json({ error: 'no_request' }, { status: 409 });
      if (pending.requested_by === user.id) {
        return Response.json({ error: 'cannot_decline_own_request' }, { status: 403 });
      }

      const nowIso = new Date().toISOString();
      const history = pushHistory(task, {
        occurrence_key: pending.occurrence_key,
        old: pending.old,
        proposed: pending.proposed,
        outcome: 'declined',
        actor_id: user.id,
        actor_name: user.full_name || '',
        actor_role: isClient ? 'client' : 'worker',
        requested_by: pending.requested_by,
        at: nowIso,
      });

      // The original time stays the effective one — the schedule is NOT touched.
      await base44.asServiceRole.entities.Task.update(taskId, {
        schedule_change_request: null,
        schedule_change_history: history,
      });

      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'schedule_change_declined',
          user_ids: [pending.requested_by],
          task_id: taskId,
          variables: {
            task_title: task.title || '',
            task_id: taskId,
            old_when: pending.old?.iso ? formatOccurrenceHe(new Date(pending.old.iso)) : '',
            new_when: formatOccurrenceHe(new Date(pending.proposed.iso)),
          },
        });
      } catch (notifyErr) {
        console.log('[rescheduleTask] declined notification failed:', notifyErr.message);
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'unknown_action', action }, { status: 400 });
  } catch (error) {
    console.error('[rescheduleTask] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}