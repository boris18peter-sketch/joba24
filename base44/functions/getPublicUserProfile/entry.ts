import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userId, taskId } = body;
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    // ── Demo user: if userId starts with 'demo_', look up DemoUser entity ──
    if (userId.startsWith('demo_')) {
      const demoUsers = await base44.asServiceRole.entities.DemoUser.filter({ demo_id: userId }, '-created_date', 1);
      const demoUser = demoUsers[0];
      if (!demoUser) return Response.json({ error: 'Demo user not found' }, { status: 404 });

      // Fetch reviews and tasks for this demo user (will be empty but keeps the response shape consistent)
      const postedTasks = await base44.asServiceRole.entities.Task.filter({ client_id: userId, status: 'OPEN' }, '-created_date', 20);

      return Response.json({
        user: {
          id: demoUser.demo_id,
          full_name: demoUser.full_name,
          profile_photo: demoUser.profile_photo,
          is_verified: demoUser.is_verified,
          is_phone_verified: false,
          kyc_status: demoUser.is_verified ? 'approved' : undefined,
          rating: demoUser.rating || 0,
          rating_count: demoUser.rating_count || 0,
          tasks_completed: demoUser.tasks_completed || 0,
          tasks_posted: demoUser.tasks_posted || postedTasks.length,
          reviews: [],
          bio: demoUser.bio,
          intro_video_url: undefined,
          phone: undefined,
          profession: demoUser.profession,
          preferred_categories: demoUser.preferred_categories,
          preferred_cities: demoUser.preferred_cities,
          certificates: demoUser.certificates,
          certificate_files: demoUser.certificate_files,
          profile_media: demoUser.profile_media,
          repeat_hires: demoUser.repeat_hires,
          avg_response_minutes: demoUser.avg_response_minutes,
          on_time_rate: demoUser.on_time_rate,
          instagram_username: demoUser.instagram_username || undefined,
          instagram_verified: demoUser.instagram_verified || false,
          facebook_username: demoUser.facebook_username || undefined,
          facebook_verified: demoUser.facebook_verified || false,
          tiktok_username: demoUser.tiktok_username || undefined,
          tiktok_verified: demoUser.tiktok_verified || false,
          created_date: demoUser.created_date,
        },
      });
    }

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
    const postedTasks = await base44.asServiceRole.entities.Task.filter({ client_id: userId, status: 'COMPLETED' }, '-created_date', 200);
    const computedTasksPosted = postedTasks.length || 0;

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
        tasks_posted: computedTasksPosted,
        reviews: reviews.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          role: r.role,
          created_date: r.created_date,
          arrived_on_time: r.arrived_on_time,
          professional: r.professional,
          good_communication: r.good_communication,
          fair_pricing: r.fair_pricing,
          would_hire_again: r.would_hire_again,
        })),
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