import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, old_data, event } = await req.json();

    // Only trigger on APPROVED_PENDING_DEPARTURE → IN_PROGRESS or when client_confirmed changes
    if (!data?.worker_id) {
      return Response.json({ sent: 0, reason: 'No worker' });
    }

    // Check if client just marked task as approved (client_confirmed=true and status changes)
    const statusChanged = old_data?.status !== data?.status;
    const clientConfirmedTask = data?.status === 'IN_PROGRESS' || data?.status === 'COMPLETED';
    
    if (!clientConfirmedTask && !(old_data?.client_confirmed === false && data?.client_confirmed === true)) {
      return Response.json({ sent: 0, reason: 'Not a completion approval' });
    }

    // Get worker's tokens
    const users = await base44.asServiceRole.entities.User.filter({ id: data.worker_id });
    const worker = users[0];
    if (!worker || !worker.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    // Send push to worker
    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [data.worker_id],
      title: `המפרסם אישר את סיום המשימה ✅`,
      body: `המפרסם אישר שהשלמת את "${data.title || ''}" — בדוק את הדירוג שקיבלת`,
      url: `/task/${data.id || event?.entity_id}`,
      tag: `task_completed_${data.id}`,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});