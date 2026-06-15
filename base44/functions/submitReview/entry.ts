import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * submitReview — Creates a review and updates the reviewee's rating, trust score,
 * and on_time_rate on their profile. Also triggers loyalty bonus for 5-star worker reviews.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      taskId, revieweeId, rating, comment, role,
      arrivedOnTime, professional, goodCommunication, fairPricing, wouldHireAgain,
      // completeTask / worker_confirmed flag
      isOwner,
    } = await req.json();

    if (!taskId || !revieweeId || !rating || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch task for context
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Prevent duplicate reviews
    const existing = await base44.asServiceRole.entities.Review.filter({ task_id: taskId, reviewer_id: user.id });
    if (existing.length > 0) {
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
      arrived_on_time: arrivedOnTime ?? null,
      professional: professional ?? null,
      good_communication: goodCommunication ?? null,
      fair_pricing: fairPricing ?? null,
      would_hire_again: wouldHireAgain ?? null,
    });

    // Mark task completion side
    if (isOwner) {
      await base44.asServiceRole.entities.Task.update(taskId, {
        status: 'COMPLETED',
        client_confirmed: true,
        completed_at: new Date().toISOString(),
      });
      // Increment worker's completed tasks count
      const workerUsers = await base44.asServiceRole.entities.User.filter({ id: task.worker_id });
      const worker = workerUsers[0];
      if (worker) {
        const newCount = (worker.tasks_completed ?? 0) + 1;
        await base44.asServiceRole.entities.User.update(worker.id, { tasks_completed: newCount });
      }
    } else {
      await base44.asServiceRole.entities.Task.update(taskId, { worker_confirmed: true });
    }

    // Recalculate reviewee's rating stats
    const allReviews = await base44.asServiceRole.entities.Review.filter({ reviewee_id: revieweeId });
    const avg = allReviews.length > 0
      ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      : rating;

    const clientRevs = allReviews.filter(r => r.role === 'client');
    const withOnTime = clientRevs.filter(r => r.arrived_on_time !== null && r.arrived_on_time !== undefined);
    const onTimeRate = withOnTime.length >= 2
      ? Math.round((withOnTime.filter(r => r.arrived_on_time === true).length / withOnTime.length) * 100)
      : null;
    const repeatHires = clientRevs.filter(r => r.would_hire_again === true).length;

    const userUpdate = {
      rating: Math.round(avg * 10) / 10,
      rating_count: allReviews.length,
    };
    if (onTimeRate !== null) userUpdate.on_time_rate = onTimeRate;
    if (isOwner) userUpdate.repeat_hires = repeatHires;

    await base44.asServiceRole.entities.User.update(revieweeId, userUpdate);
    console.log(`✅ Review saved. Reviewee ${revieweeId} new rating: ${userUpdate.rating} (${userUpdate.rating_count} reviews)`);

    // Loyalty bonus for 5-star worker review
    if (isOwner && rating === 5 && task.worker_id) {
      base44.functions.invoke('grantLoyaltyReward', {
        taskId,
        workerId: task.worker_id,
        rating,
        taskTitle: task.title,
      }).catch(err => console.warn('⚠️ grantLoyaltyReward failed:', err?.message));
    }

    return Response.json({ success: true, new_rating: userUpdate.rating });

  } catch (error) {
    console.error('❌ submitReview error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});