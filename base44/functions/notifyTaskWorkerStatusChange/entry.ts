import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STATUS_MESSAGES = {
  on_the_way: { title: 'העובד יוצא אליך 🏃', body: (t) => `העובד בדרך למשימה "${t}"` },
  arrived: { title: 'העובד הגיע 📍', body: (t) => `העובד הגיע ליעד של "${t}"` },
  done: { title: 'העובד סיים ✅', body: (t) => `העובד סיים את "${t}" — אפשר לאשר` },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event, old_data } = await req.json();

    const newStatus = data?.worker_status;
    const oldStatus = old_data?.worker_status;

    // Guard: only fire when worker_status actually changed to a notifiable value
    // Without this check, any Task update that happens to include worker_status in the payload
    // (e.g. location ping, price update) would send a duplicate push
    if (!newStatus || !STATUS_MESSAGES[newStatus] || newStatus === oldStatus) {
      return Response.json({ sent: 0, reason: 'No status change or unnotifiable status' });
    }

    if (!data.client_id || !data.title) {
      return Response.json({ sent: 0, reason: 'Missing client or title' });
    }

    // ── THE STATUS IN THE EVENT IS A CLAIM; THE RECORD IS THE TRUTH ─────────
    // A Task update triggers this through a workflow, and the workflow queue can
    // hand the event over tens of seconds late. By then the worker has often
    // moved on again, so "arrived" would be pushed AFTER "done" — or after the
    // task was already completed, which is exactly the burst of obsolete
    // notifications that appeared around completion.
    //
    // The stored record is read here and compared with the event's own status:
    //   • the task is already terminal and this is not its final stage → skip;
    //   • the record has moved PAST this stage → skip (a newer stage owns the
    //     conversation, and sending this one would break the chronology).
    // Nothing is silently discarded: every skip names its reason, and a
    // notification that is still the CURRENT stage is always sent.
    const STAGE_ORDER = { on_the_way: 1, arrived: 2, done: 3 };
    const taskId = data.id || event?.entity_id;
    let current = null;
    if (taskId) {
      const page = await base44.asServiceRole.entities.Task
        .filter({ id: taskId }, { limit: 1 })
        .catch(() => ({ items: [] }));
      current = (page?.items || [])[0] || null;
    }
    if (current) {
      const terminal = ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(current.status);
      const liveStage = STAGE_ORDER[current.worker_status] || 0;
      const eventStage = STAGE_ORDER[newStatus] || 0;
      if (terminal && newStatus !== 'done') {
        return Response.json({ sent: 0, skipped: 'task_terminal', status: current.status, stage: newStatus });
      }
      if (liveStage > eventStage) {
        return Response.json({ sent: 0, skipped: 'superseded_by_newer_status', current_stage: current.worker_status });
      }
    }

    // ── AT MOST ONE PUSH PER (TASK, STAGE), WHATEVER ASKS FOR IT ────────────
    // Two paths can now carry the same stage to this function: the fast lane
    // (an awaited call from whichever button performed the transition) and the
    // entity workflow that still fires for the same write. The cooldown inside
    // notificationManager cannot answer this: it is keyed per user+event and
    // only applies when a cooldown is configured, and the workflow can arrive
    // minutes later — past any cooldown. The (task, stage) pair is the real
    // identity of this notification, and a stage happens once per task, so a
    // 'sent' log row for it is final proof that it must not be sent again.
    //
    // This is also what makes the fast lane SAFE TO FAIL: if it never reached
    // the send, no row was written and the workflow still delivers it later.
    if (taskId) {
      const sentBefore = await base44.asServiceRole.entities.NotificationLog
        .filter({ task_id: taskId, event_key: `worker_status_${newStatus}`, status: 'sent' }, { limit: 1 })
        .catch(() => null);
      const rows = Array.isArray(sentBefore) ? sentBefore : (sentBefore?.items || []);
      if (rows.length) {
        return Response.json({
          sent: 0,
          skipped: 'already_sent_for_task_stage',
          stage: newStatus,
          task_id: taskId,
        });
      }
    }

    // Get client's tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.client_id });
    const client = users[0];
    if (!client || !client.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    const msg = STATUS_MESSAGES[newStatus];
    const eventKey = `worker_status_${newStatus}`; // on_the_way | arrived | done

    // ── Route through NotificationManager ──
    await base44.asServiceRole.functions.invoke('notificationManager', {
      event_key: eventKey,
      user_ids: [data.client_id],
      task_id: data.id || event?.entity_id,
      variables: {
        task_title: data.title || '',
        task_id: data.id || event?.entity_id || '',
      },
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});