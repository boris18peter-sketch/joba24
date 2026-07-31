import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    // Only trigger on approved → rejected (revocation)
    if (old_data?.status !== 'approved' || data?.status !== 'rejected') {
      return Response.json({ sent: 0, reason: 'Not a revocation' });
    }

    // Notify the worker
    if (!data.worker_id) {
      return Response.json({ sent: 0, reason: 'No worker' });
    }

    // Get worker's tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.worker_id });
    const worker = users[0];
    if (!worker || !worker.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    // ── Route through NotificationManager ──
    await base44.asServiceRole.functions.invoke('notificationManager', {
      event_key: 'application_revoked',
      user_ids: [data.worker_id],
      task_id: data.task_id,
      variables: {
        task_title: data.task_title || '',
        task_id: data.task_id,
        worker_id: data.worker_id,
      },
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});