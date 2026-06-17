import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || !data.reviewee_id || !data.reviewer_id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Don't notify self-review
    if (data.reviewee_id === data.reviewer_id) {
      return Response.json({ sent: 0, reason: 'Self review' });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: data.reviewee_id });
    const reviewee = users[0];
    if (!reviewee || !reviewee.fcm_tokens?.length) {
      return Response.json({ sent: 0, reason: 'No device tokens' });
    }

    const stars = '⭐'.repeat(data.rating || 0);
    const roleLabel = data.role === 'worker' ? 'עובד' : 'מפרסם';
    const whoLabel = data.role === 'worker' ? 'המפרסם' : 'העובד';

    await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: [data.reviewee_id],
      title: `${whoLabel} דירג אותך ${stars}`,
      body: data.comment
        ? `"${data.comment.substring(0, 100)}"`
        : `${whoLabel} השאיר דירוג של ${data.rating} כוכבים — כ${roleLabel}`,
      url: '/profile',
      tag: `review_${data.task_id}_${data.reviewee_id}`,
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});