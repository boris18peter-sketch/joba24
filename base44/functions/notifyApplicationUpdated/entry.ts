import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || !data.task_id || !data.worker_id || !data.status) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Only notify on approved status — rejected/revoked is handled exclusively by notifyApplicationRevoked
    // This prevents duplicate pushes when an approved application gets rejected (revoked)
    if (data.status !== 'approved') {
      return Response.json({ sent: false, reason: `Status ${data.status} not notifiable here` });
    }

    // Get worker's FCM tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.worker_id });
    const worker = users[0];
    if (!worker || !worker.fcm_tokens || !worker.fcm_tokens.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    const isApproved = data.status === 'approved';
    const title = isApproved ? 'התקבלת למשימה! 🎉' : 'הבקשה לא אושרה 😔';
    const body = isApproved
      ? `הבקשה שלך למשימה "${data.task_title || ''}" אושרה!`
      : `הבקשה שלך למשימה "${data.task_title || ''}" לא אושרה`;

    const result = await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [data.worker_id],
      title,
      body,
      url: isApproved ? `/task/${data.task_id}` : '/',
      tag: `app_status_${data.task_id}_${data.worker_id}`,
    });

    return Response.json({ sent: true, result: result?.data ?? null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});