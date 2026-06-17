import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || !data.task_id || !data.sender_id || !data.content) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get task to find both client and worker
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: data.task_id });
    const task = tasks[0];
    if (!task) {
      return Response.json({ sent: 0, reason: 'Task not found' });
    }

    // Determine who to notify: if sender is client → notify worker, if sender is worker → notify client
    const isSenderClient = data.sender_id === task.client_id;
    const targetUserId = isSenderClient ? task.worker_id : task.client_id;

    if (!targetUserId) {
      return Response.json({ sent: 0, reason: 'No recipient' });
    }

    // Don't notify if no other party (e.g., task has no worker yet)
    if (targetUserId === data.sender_id) {
      return Response.json({ sent: 0, reason: 'Self message' });
    }

    // Get recipient's FCM tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
    const recipient = users[0];
    if (!recipient || !recipient.fcm_tokens || !recipient.fcm_tokens.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    const preview = data.content.length > 80 ? data.content.substring(0, 80) + '...' : data.content;

    const result = await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [targetUserId],
      title: `הודעה חדשה 💬`,
      body: `${data.sender_name || 'מישהו'}: ${preview}`,
      url: `/chat/${data.task_id}`,
      tag: `chat_${data.task_id}`,
    });

    return Response.json({ sent: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});