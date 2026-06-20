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

    // Get client's tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.client_id });
    const client = users[0];
    if (!client || !client.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    const msg = STATUS_MESSAGES[newStatus];

    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [data.client_id],
      title: msg.title,
      body: msg.body(data.title),
      url: `/task/${data.id || event?.entity_id}`,
      tag: `worker_status_${data.id}_${newStatus}`,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});