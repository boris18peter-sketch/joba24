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