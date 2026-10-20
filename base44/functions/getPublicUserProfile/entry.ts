import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

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

    // Canonical category attribution for each review, resolved from its Task.
    // Presentation surfaces use it to keep a review's real category inside a
    // Brand that offers it, and to fall back to a neutral "General" outside it.
    // The stored Review is never rewritten — this is read-only context.
    // ── Only the tasks the REVIEWS actually reference are read ──────────────
    // This used to pull the user's 300 tasks as worker AND 300 as client purely
    // to build a taskId → category map for the reviews it was already holding:
    // up to 600 task records transferred to decorate at most 200 reviews.
    //
    // That matters because this endpoint is called ONCE PER APPLICANT every time
    // a publisher opens the applicants list. On a popular task that was tens of
    // thousands of records for one screen — and it is the publisher's most-used
    // screen during exactly the moment many workers are applying at once.
    // The reviews name their own tasks, so only those are fetched.
    const reviewTaskIds = [...new Set(reviews.map(r => r.task_id).filter(Boolean))].slice(0, 200);
    const reviewTasks = reviewTaskIds.length
      ? await base44.asServiceRole.entities.Task.filter({ id: { $in: reviewTaskIds } }, '-created_date', 200)
      : [];
    const categoryByTaskId: Record<string, string> = {};
    for (const tk of reviewTasks || []) {
      categoryByTaskId[tk.id] = tk.category_details?.brand_category_key || tk.category || '';
    }

    const reviewRatings = reviews.map(r => r.rating).filter(r => typeof r === 'number' && r > 0);
    const computedRating = reviewRatings.length > 0
      ? reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length
      : (targetUser.rating || 0);
    const computedRatingCount = reviews.length || targetUser.rating_count || 0;

    // ── The two "completed tasks" figures are COUNTED, not downloaded ───────
    // Each was fetched as up to 200 full task records and then measured with
    // .length — 400 records per profile view for two numbers. count() returns
    // the number itself, so the records never travel at all.
    const [completedAsWorker, completedAsClient] = await Promise.all([
      base44.asServiceRole.entities.Task.count({ worker_id: userId, status: 'COMPLETED' }),
      base44.asServiceRole.entities.Task.count({ client_id: userId, status: 'COMPLETED' }),
    ]);
    const computedTasksCompleted = completedAsWorker || targetUser.tasks_completed || 0;
    const computedTasksPosted = completedAsClient || 0;

    return Response.json({
      user: {
        id: targetUser.id,
        // The name the user chose to be shown under (custom `display_name`),
        // falling back to their account name. The built-in `full_name` itself
        // cannot be changed — see src/lib/displayName.js.
        full_name: (targetUser.display_name || '').trim() || targetUser.full_name,
        profile_photo: targetUser.profile_photo,
        profile_photos: targetUser.profile_photos,
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
          task_category: categoryByTaskId[r.task_id] || '',
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