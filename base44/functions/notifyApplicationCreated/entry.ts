import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || !data.task_id || !data.worker_id) {
      return Response.json({ sent: 0, reason: 'Missing task_id or worker_id' });
    }

    // Get task to find the client
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: data.task_id });
    const task = tasks[0];
    if (!task || !task.client_id) {
      return Response.json({ sent: 0, reason: 'Task or client not found' });
    }

    // Don't notify if worker is the same as client
    if (data.worker_id === task.client_id) {
      return Response.json({ sent: 0, reason: 'Worker is the client' });
    }

    // Get client's FCM tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: task.client_id });
    const client = users[0];
    if (!client || !client.fcm_tokens || !client.fcm_tokens.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    // Call sendPushNotification
    const result = await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [task.client_id],
      title: 'בקשה חדשה! 🔔',
      body: `${data.worker_name || 'עובד'} הגיש בקשה למשימה "${task.title}"`,
      url: `/task/${task.id}`,
      tag: `application_${data.task_id}_${data.worker_id}`,
    });

    return Response.json({ sent: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});