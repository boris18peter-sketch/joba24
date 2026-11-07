/**
 * reviewSubmission — the ONE implementation of "a participant rated this task".
 *
 * ── WHY IT IS SHARED ───────────────────────────────────────────────────────
 * A rating can now be given in two places: the in-app review sheet
 * (`submitReview`, a session) and a star tapped on the Lock Screen
 * (`liveActivityAction`, a capability token and no session). Both must write
 * exactly the same review, in the same direction, with the same running average
 * on the reviewee — otherwise the two doors would produce different records for
 * the same gesture, and a person's rating would depend on where they tapped.
 *
 * ── THE TRUST BOUNDARY IS UNCHANGED ───────────────────────────────────────
 * The caller supplies a TASK, a REVIEWER id and a star count. Who is reviewed and
 * which direction the review runs are derived from the persisted Task and that
 * id — never from the request. A caller that is not one of the task's two people
 * is refused here, and in the Lock Screen's case the caller is also re-authorized
 * against the Task before this function is reached.
 */
import { grantLoyaltyForTask } from './loyaltyReward.ts';

/**
 * Write the review, update the reviewee's rating, and settle the 5-star bonus.
 *
 * @returns `{ ok, duplicate, role, revieweeId, isOwner, new_rating }`
 */
export async function submitTaskReviewCore(base44, input: any) {
  const { task, reviewerId, rating, comment = '', extras = {} } = input || ({} as any);

  if (!task?.id) return { ok: false, reason: 'task_missing' };
  if (!reviewerId) return { ok: false, reason: 'no_reviewer' };

  const value = Math.round(Number(rating));
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    return { ok: false, reason: 'invalid_rating' };
  }

  // ── Who this review is about, derived — never taken from the request ──────
  const isOwner = task.client_id === reviewerId;    // the caller posted the task
  const isWorker = task.worker_id === reviewerId;   // the caller was assigned it
  if (!isOwner && !isWorker) return { ok: false, reason: 'not_participant' };

  const role = isOwner ? 'client' : 'worker';
  const revieweeId = isOwner ? task.worker_id : task.client_id;
  if (!revieweeId) return { ok: false, reason: 'no_counterpart' };

  // ── One review per participant per task ──────────────────────────────────
  // A repeat is not an error: it is the same answer given twice (a double tap on
  // the Lock Screen, or the in-app sheet opened after the card). The bonus is
  // still re-checked, because a first attempt may have failed to grant it.
  const existingRows = await base44.asServiceRole.entities.Review.filter({
    task_id: task.id,
    reviewer_id: reviewerId,
  });
  const existingReview = Array.isArray(existingRows) ? existingRows[0] : (existingRows?.items || [])[0];
  if (existingReview) {
    if (isOwner && task.worker_id) {
      await grantLoyaltyForTask(base44, { task })
        .catch((err) => console.warn('⚠️ grantLoyaltyForTask retry failed:', err?.message));
    }
    return {
      ok: true,
      duplicate: true,
      role,
      revieweeId,
      isOwner,
      rating: existingReview.rating ?? value,
      new_rating: null,
    };
  }

  await base44.asServiceRole.entities.Review.create({
    task_id: task.id,
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating: value,
    comment: comment || '',
    role,
    // Trusted Brand attribution, derived server-side from the persisted Task.
    surface_brand_id: task.origin_brand_id || null,
    ...extras,
  });

  // The worker's side of the completion: the client's side is set by completeTask.
  if (!isOwner) {
    await base44.asServiceRole.entities.Task.update(task.id, { worker_confirmed: true });
  }

  // ── The reviewee's rating, kept as a running average (O(1)) ──────────────
  const revieweeRows = await base44.asServiceRole.entities.User.filter({ id: revieweeId });
  const revieweeUser = Array.isArray(revieweeRows) ? revieweeRows[0] : (revieweeRows?.items || [])[0];
  const oldCount = revieweeUser?.rating_count || 0;
  const oldRating = revieweeUser?.rating || 0;
  const newCount = oldCount + 1;
  const newAvg = oldCount === 0 ? value : (oldRating * oldCount + value) / newCount;

  // on_time_rate and repeat_hires need a targeted query, and only for the
  // direction that carries those questions (the worker reviewing the client).
  let onTimeRate = null;
  let repeatHires = revieweeUser?.repeat_hires || 0;
  if (role === 'client' || isOwner) {
    const clientReviews = await base44.asServiceRole.entities.Review.filter({
      reviewee_id: revieweeId,
      role: 'client',
    });
    const list = Array.isArray(clientReviews) ? clientReviews : (clientReviews?.items || []);
    const withOnTime = list.filter((r) => r.arrived_on_time !== null && r.arrived_on_time !== undefined);
    if (withOnTime.length >= 2) {
      onTimeRate = Math.round((withOnTime.filter((r) => r.arrived_on_time === true).length / withOnTime.length) * 100);
    }
    repeatHires = list.filter((r) => r.would_hire_again === true).length;
  }

  const userUpdate: Record<string, any> = {
    rating: Math.round(newAvg * 10) / 10,
    rating_count: newCount,
  };
  if (onTimeRate !== null) userUpdate.on_time_rate = onTimeRate;
  if (isOwner) userUpdate.repeat_hires = repeatHires;

  await base44.asServiceRole.entities.User.update(revieweeId, userUpdate);
  console.log(`✅ Review saved. Reviewee ${revieweeId} new rating: ${userUpdate.rating} (${userUpdate.rating_count} reviews)`);

  // ── The 5-star professionalism bonus ─────────────────────────────────────
  // Only the CLIENT's review can earn it, and only the persisted 5 stars can:
  // every rule is re-read inside the shared core, so an early or partial write
  // can never pay out.
  if (isOwner && task.worker_id) {
    try {
      await grantLoyaltyForTask(base44, { task });
    } catch (err) {
      console.warn('⚠️ grantLoyaltyForTask failed:', err?.message);
    }
  }

  return {
    ok: true,
    duplicate: false,
    role,
    revieweeId,
    isOwner,
    rating: value,
    new_rating: userUpdate.rating,
  };
}