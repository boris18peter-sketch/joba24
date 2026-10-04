import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    // Only fire on transition TO cancelled — old_data guard prevents re-firing on subsequent updates
    if (data?.status !== 'CANCELLED' || old_data?.status === 'CANCELLED') {
      return Response.json({ sent: 0, reason: 'Not a new cancellation' });
    }

    // The cancellation update nulls `worker_id`, so the assigned worker has to be
    // recovered from the previous state. A full status patch carries no title
    // either — read the persisted task so the push names the real task.
    const taskId = data.id || event?.entity_id;
    const tasks = taskId
      ? await base44.asServiceRole.entities.Task.filter({ id: taskId })
      : [];
    const task = tasks?.[0] || null;

    const workerId = data.worker_id || old_data?.worker_id || task?.worker_id;
    if (!workerId) {
      return Response.json({ sent: 0, reason: 'No worker assigned' });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const worker = users[0];
    if (!worker || !worker.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    // ── Route through NotificationManager ──
    await base44.asServiceRole.functions.invoke('notificationManager', {
      event_key: 'task_cancelled',
      user_ids: [workerId],
      task_id: taskId,
      variables: {
        task_title: data.title || task?.title || old_data?.title || '',
        task_id: taskId || '',
      },
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});