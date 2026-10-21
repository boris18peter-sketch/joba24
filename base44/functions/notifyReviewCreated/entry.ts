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

    // ── EVERY LABEL IS WRITTEN FROM THE RECIPIENT'S SIDE ──────────────────
    // `data.role` is the REVIEWER's role — the person who LEFT the rating. The
    // notification goes to the REVIVEE, so both labels must be expressed from
    // the reviewee's point of view.
    //
    // These two were inverted, so a publisher was told "מפרסם המשימה דירג
    // אותך" — the publisher being informed that the publisher had rated them.
    // The worker's side happened to read correctly, which is why it went
    // unnoticed: the bug was only ever visible to the publisher.
    const reviewerIsWorker = data.role === 'worker';
    const whoLabel = reviewerIsWorker ? 'העובד' : 'המפרסם';        // who rated YOU
    const revieweeLabel = reviewerIsWorker ? 'מפרסם' : 'עובד';      // what YOU are
    const reviewBody = data.comment
      ? `"${data.comment.substring(0, 100)}"`
      : `${whoLabel} השאיר דירוג של ${data.rating} כוכבים — כ${revieweeLabel}`;

    // ── Route through NotificationManager ──
    await base44.asServiceRole.functions.invoke('notificationManager', {
      event_key: 'review_created',
      user_ids: [data.reviewee_id],
      task_id: data.task_id,
      variables: {
        who_label: whoLabel,
        stars: stars,
        review_body: reviewBody,
        task_id: data.task_id || '',
        reviewee_id: data.reviewee_id,
      },
    });

    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});