import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { forbidden } from '../../shared/internalAuth.ts';
import { submitTaskReviewCore } from '../../shared/reviewSubmission.ts';

/**
 * submitReview — the in-app review sheet's endpoint.
 *
 * ── WHAT IT DOES NOW ──────────────────────────────────────────────────────
 * Authorization only. The review itself — the direction, the running average on
 * the reviewee, the worker's confirmation flag and the 5-star loyalty bonus —
 * lives in `shared/reviewSubmission.ts`, because the SAME review can be given by
 * a star tapped on the Lock Screen (`liveActivityAction`). One gesture must never
 * produce two different records depending on where it was made.
 *
 * ── Trust boundary (Package #3.1D) ────────────────────────────────────────
 * The client supplies only the task identifier, the rating and the review text.
 * WHO is reviewed and WHICH direction the review runs are derived server-side
 * from the persisted Task and the authenticated caller. `revieweeId` and `role`
 * are not accepted from the request body.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      taskId, rating, comment,
      arrivedOnTime, professional, goodCommunication, fairPricing, wouldHireAgain,
    } = await req.json();

    if (!taskId || !rating) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    const result = await submitTaskReviewCore(base44, {
      task,
      reviewerId: user.id,
      rating,
      comment,
      extras: {
        arrived_on_time: arrivedOnTime ?? null,
        professional: professional ?? null,
        good_communication: goodCommunication ?? null,
        fair_pricing: fairPricing ?? null,
        would_hire_again: wouldHireAgain ?? null,
      },
    });

    if (!result.ok) {
      // A caller who is neither party to this task has no review relationship at
      // all — the one refusal that is about permission rather than input.
      if (result.reason === 'not_participant') {
        return forbidden('Only the task client or the assigned worker can review this task');
      }
      if (result.reason === 'no_counterpart') {
        return Response.json({ error: 'Task has no counterpart to review' }, { status: 400 });
      }
      if (result.reason === 'invalid_rating') {
        return Response.json({ error: 'Invalid rating' }, { status: 400 });
      }
      return Response.json({ error: result.reason || 'review_failed' }, { status: 400 });
    }

    if (result.duplicate) {
      return Response.json({ success: true, note: 'Already reviewed' });
    }

    return Response.json({ success: true, new_rating: result.new_rating });
  } catch (error) {
    console.error('❌ submitReview error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});