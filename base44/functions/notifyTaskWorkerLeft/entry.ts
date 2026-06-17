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

    // Get client's tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.client_id });
    const client = users[0];
    if (!client || !client.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    // Determine who left: usually old_data.worker_id or data.worker_id (should be null now)
    const workerName = old_data?.worker_name || data?.worker_name || 'העובד';

    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [data.client_id],
      title: `${workerName} עזב את המשימה 😕`,
      body: `${workerName} ביטל את הקבלת המשימה "${data.title || ''}" — אתה יכול לבחור עובד חדש`,
      url: `/task/${data.id || event?.entity_id}`,
      tag: `worker_left_${data.id}`,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});