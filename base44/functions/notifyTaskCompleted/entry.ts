import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    if (!data?.worker_id) {
      return Response.json({ sent: 0, reason: 'No worker' });
    }

    const justCompleted = old_data?.status !== 'COMPLETED' && data?.status === 'COMPLETED';
    if (!justCompleted) {
      return Response.json({ sent: 0, reason: 'Not a new completion transition' });
    }

    const taskId = data.id || event?.entity_id;
    const taskTitle = data.title || 'המשימה';
    const price = data.price || 0;

    // Fetch worker + client
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: data.worker_id });
    const worker = workerUsers[0];

    let client = null;
    if (data.client_id) {
      const clientUsers = await base44.asServiceRole.entities.User.filter({ id: data.client_id });
      client = clientUsers[0];
    }

    // ── Push notification to worker via NotificationManager ──
    if (worker?.fcm_tokens?.length) {
      await base44.asServiceRole.functions.invoke('notificationManager', {
        event_key: 'task_completed',
        user_ids: [data.worker_id],
        task_id: taskId,
        variables: {
          task_title: taskTitle,
          task_id: taskId,
        },
      });
    }

    // ── Email to worker (retained — only NotificationConfig.send_email controls email via manager) ──
    if (worker?.email) {
      const workerName = worker.full_name || 'עובד';
      await base44.integrations.Core.SendEmail({
        to: worker.email,
        template_name: 'TaskCompletedWorker',
        variables: {
          first_name: workerName,
          task_title: taskTitle,
          price,
          task_url: `https://joba24.com/task/${taskId}`,
        },
      });
    }

    // ── Email to client ──
    if (client?.email) {
      const clientName = client.full_name || 'לקוח';
      const workerName = worker?.full_name || 'העובד';
      await base44.integrations.Core.SendEmail({
        to: client.email,
        template_name: 'TaskCompletedClient',
        variables: {
          first_name: clientName,
          worker_name: workerName,
          task_title: taskTitle,
          price,
          task_url: `https://joba24.com/task/${taskId}`,
        },
      });
    }

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});