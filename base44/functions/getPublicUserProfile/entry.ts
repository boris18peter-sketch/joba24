import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, taskId } = body;
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    // Fetch the target user with service role (bypasses built-in User RLS)
    const users = await base44.asServiceRole.entities.User.filter({ id: userId }, '-created_date', 1);
    const targetUser = users[0];
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });

    // Determine if phone should be revealed:
    // Caller must be the task's client, and the target user must be the approved worker for that task
    let revealPhone = false;
    if (taskId) {
      const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId }, '-created_date', 1);
      const task = tasks[0];
      if (task && task.client_id === user.id && task.worker_id === userId) {
        revealPhone = true;
      }
    }

    // Compute rating + completed-task count from LIVE data (service role) so the
    // public profile never depends on denormalized User fields that can drift
    // (e.g. wiped by the new-user simulator). Falls back to stored values.
    const reviews = await base44.asServiceRole.entities.Review.filter({ reviewee_id: userId }, '-created_date', 200);
    const reviewRatings = reviews.map(r => r.rating).filter(r => typeof r === 'number' && r > 0);
    const computedRating = reviewRatings.length > 0
      ? reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length
      : (targetUser.rating || 0);
    const computedRatingCount = reviews.length || targetUser.rating_count || 0;
    const completedTasks = await base44.asServiceRole.entities.Task.filter({ worker_id: userId, status: 'COMPLETED' }, '-created_date', 200);
    const computedTasksCompleted = completedTasks.length || targetUser.tasks_completed || 0;

    return Response.json({
      user: {
        id: targetUser.id,
        full_name: targetUser.full_name,
        profile_photo: targetUser.profile_photo,
        is_verified: targetUser.is_verified,
        is_phone_verified: targetUser.is_phone_verified,
        kyc_status: targetUser.kyc_status,
        rating: computedRating,
        rating_count: computedRatingCount,
        tasks_completed: computedTasksCompleted,
        bio: targetUser.bio,
        intro_video_url: targetUser.intro_video_url,
        phone: revealPhone ? targetUser.phone : undefined,
        profession: targetUser.profession,
        preferred_categories: targetUser.preferred_categories,
        preferred_cities: targetUser.preferred_cities,
        certificates: targetUser.certificates,
        certificate_files: targetUser.certificate_files,
        profile_media: targetUser.profile_media,
        repeat_hires: targetUser.repeat_hires,
        avg_response_minutes: targetUser.avg_response_minutes,
        on_time_rate: targetUser.on_time_rate,
        instagram_username: targetUser.instagram_username || undefined,
        instagram_verified: targetUser.instagram_verified || false,
        facebook_username: targetUser.facebook_username || undefined,
        facebook_verified: targetUser.facebook_verified || false,
        tiktok_username: targetUser.tiktok_username || undefined,
        tiktok_verified: targetUser.tiktok_verified || false,
        created_date: targetUser.created_date,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});