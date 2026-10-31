import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    // Only trigger on TAKEN → OPEN transition with worker leaving
    if (old_data?.status !== 'TAKEN' || data?.status !== 'OPEN') {
      return Response.json({ sent: 0, reason: 'Not a worker leave transition' });
    }

    // Get client
    if (!data.client_id) {
      return Response.json({ sent: 0, reason: 'No client' });
    }

    // ── WHO ENDED IT ────────────────────────────────────────────────────────
    // TAKEN → OPEN does not mean the worker left. The PUBLISHER reopening the
    // task (cancelApprovedWorker / a no-show report) produces the very same
    // transition — and the publisher was then told "the worker cancelled the
    // task" about their own action.
    //
    // The application record already carries the answer, written before the task
    // itself is updated: a worker who walks away marks their own application
    // 'cancelled', while the publisher removing them marks it 'rejected'. So the
    // notification is sent only for a genuine walk-away.
    const previousWorkerId = old_data?.worker_id;
    if (previousWorkerId) {
      const apps = await base44.asServiceRole.entities.TaskApplication.filter({
        task_id: data.id,
        worker_id: previousWorkerId,
      });
      const latest = apps.sort(
        (a, b) => new Date(b.updated_date || 0).getTime() - new Date(a.updated_date || 0).getTime()
      )[0];
      // Only an application touched in the same breath as this transition can
      // describe it — an old record must never decide today's notification.
      const REMOVAL_WINDOW_MS = 3 * 60 * 1000;
      const appliedJustNow = latest?.updated_date &&
        (Date.now() - new Date(latest.updated_date).getTime()) < REMOVAL_WINDOW_MS;
      if (appliedJustNow && latest.status === 'rejected') {
        return Response.json({ sent: 0, reason: 'removed_by_publisher' });
      }
    }

    // Get client's tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.client_id });
    const client = users[0];
    if (!client || !client.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    // Determine who left: usually old_data.worker_id or data.worker_id (should be null now)
    const workerName = old_data?.worker_name || data?.worker_name || 'העובד';

    // ── Route through NotificationManager ──
    await base44.asServiceRole.functions.invoke('notificationManager', {
      event_key: 'worker_left_task',
      user_ids: [data.client_id],
      task_id: data.id || event?.entity_id,
      variables: {
        worker_name: workerName,
        task_title: data.title || '',
        task_id: data.id || event?.entity_id || '',
      },
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});