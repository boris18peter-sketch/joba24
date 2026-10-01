import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { forbidden } from '../../shared/internalAuth.ts';

/**
 * submitReview — Creates a review and updates the reviewee's rating, trust score,
 * and on_time_rate on their profile. Also triggers loyalty bonus for 5-star worker reviews.
 *
 * ── Trust boundary (Package #3.1D) ────────────────────────────────────────
 * The client supplies only the task identifier, the rating and the review text.
 * WHO is reviewed and WHICH direction the review runs are derived server-side
 * from the persisted Task and the authenticated caller. `revieweeId` and `role`
 * are no longer accepted from the request body.
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

    // Fetch task for context
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // ── Review relationship is derived server-side (Package #3.1D) ─────────
    // Who is being reviewed, and in which direction, is determined exclusively
    // by the persisted Task and the authenticated caller. The request body no
    // longer carries `revieweeId` or `role`, so neither can be forged to aim a
    // review at an unrelated user or to flip the review direction.
    const isOwner = task.client_id === user.id;    // caller is the task's client
    const isWorker = task.worker_id === user.id;   // caller is the assigned worker

    if (!isOwner && !isWorker) {
      // Caller is neither party to this task — no review relationship exists.
      return forbidden('Only the task client or the assigned worker can review this task');
    }

    // Direction and counterpart, both derived — never taken from the client.
    const role = isOwner ? 'client' : 'worker';
    const revieweeId = isOwner ? task.worker_id : task.client_id;

    if (!revieweeId) {
      // The task has no legitimate counterpart for this review direction.
      return Response.json({ error: 'Task has no counterpart to review' }, { status: 400 });
    }

    // Prevent duplicate reviews — but retry loyalty bonus if it was missed on first attempt
    const existing = await base44.asServiceRole.entities.Review.filter({ task_id: taskId, reviewer_id: user.id });
    if (existing.length > 0) {
      const existingReview = existing[0];
      // Retry: if the existing review was 5-star from the client, ensure the bonus was granted
      if (isOwner && existingReview.rating === 5 && task.worker_id) {
        // Only the task id is sent — the reward is derived server-side from the
        // persisted review and task (Package #3.1C).
        await base44.functions.invoke('grantLoyaltyReward', { taskId })
          .catch(err => console.warn('⚠️ grantLoyaltyReward retry failed:', err?.message));
      }
      return Response.json({ success: true, note: 'Already reviewed' });
    }

    // Create the review
    await base44.asServiceRole.entities.Review.create({
      task_id: taskId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment || '',
      role,
      // Trusted Brand attribution, derived server-side from the persisted Task.
      surface_brand_id: task.origin_brand_id || null,
      arrived_on_time: arrivedOnTime ?? null,
      professional: professional ?? null,
      good_communication: goodCommunication ?? null,
      fair_pricing: fairPricing ?? null,
      would_hire_again: wouldHireAgain ?? null,
    });

    // Mark worker_confirmed on task (worker's side only — client_confirmed is set by completeTask)
    if (!isOwner) {
      await base44.asServiceRole.entities.Task.update(taskId, { worker_confirmed: true });
    }

    // Update reviewee's rating using running average (O(1)) instead of fetching all reviews
    // Fetch current user stats to compute incremental update
    const revieweeUsers = await base44.asServiceRole.entities.User.filter({ id: revieweeId });
    const revieweeUser = revieweeUsers[0];
    const oldCount = revieweeUser?.rating_count || 0;
    const oldRating = revieweeUser?.rating || 0;
    const newCount = oldCount + 1;
    const newAvg = oldCount === 0 ? rating : (oldRating * oldCount + rating) / newCount;

    // For on_time_rate and repeat_hires we still need a targeted query, but only for client-role reviews
    let onTimeRate = null;
    let repeatHires = revieweeUser?.repeat_hires || 0;
    if (role === 'client' || isOwner) {
      const clientRevs = await base44.asServiceRole.entities.Review.filter({ reviewee_id: revieweeId, role: 'client' });
      const withOnTime = clientRevs.filter(r => r.arrived_on_time !== null && r.arrived_on_time !== undefined);
      if (withOnTime.length >= 2) {
        onTimeRate = Math.round((withOnTime.filter(r => r.arrived_on_time === true).length / withOnTime.length) * 100);
      }
      repeatHires = clientRevs.filter(r => r.would_hire_again === true).length;
    }

    const userUpdate = {
      rating: Math.round(newAvg * 10) / 10,
      rating_count: newCount,
    };
    if (onTimeRate !== null) userUpdate.on_time_rate = onTimeRate;
    if (isOwner) userUpdate.repeat_hires = repeatHires;

    await base44.asServiceRole.entities.User.update(revieweeId, userUpdate);
    console.log(`✅ Review saved. Reviewee ${revieweeId} new rating: ${userUpdate.rating} (${userUpdate.rating_count} reviews)`);

    // Loyalty bonus for 5-star worker review — awaited (not fire-and-forget) for reliability
    if (isOwner && rating === 5 && task.worker_id) {
      try {
        // Only the task id is sent — the reward is derived server-side from the
        // persisted review and task (Package #3.1C).
        await base44.functions.invoke('grantLoyaltyReward', { taskId });
      } catch (err) {
        console.warn('⚠️ grantLoyaltyReward failed:', err?.message);
      }
    }

    return Response.json({ success: true, new_rating: userUpdate.rating });

  } catch (error) {
    console.error('❌ submitReview error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});