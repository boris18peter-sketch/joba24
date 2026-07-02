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

    return Response.json({
      user: {
        id: targetUser.id,
        full_name: targetUser.full_name,
        profile_photo: targetUser.profile_photo,
        is_verified: targetUser.is_verified,
        is_phone_verified: targetUser.is_phone_verified,
        rating: targetUser.rating,
        rating_count: targetUser.rating_count,
        tasks_completed: targetUser.tasks_completed,
        bio: targetUser.bio,
        phone: revealPhone ? targetUser.phone : undefined,
        profession: targetUser.profession,
        preferred_categories: targetUser.preferred_categories,
        preferred_cities: targetUser.preferred_cities,
        certificates: targetUser.certificates,
        certificate_files: targetUser.certificate_files,
        repeat_hires: targetUser.repeat_hires,
        avg_response_minutes: targetUser.avg_response_minutes,
        on_time_rate: targetUser.on_time_rate,
        instagram_username: targetUser.instagram_verified ? targetUser.instagram_username : undefined,
        instagram_verified: targetUser.instagram_verified || false,
        facebook_username: targetUser.facebook_verified ? targetUser.facebook_username : undefined,
        facebook_verified: targetUser.facebook_verified || false,
        tiktok_username: targetUser.tiktok_verified ? targetUser.tiktok_username : undefined,
        tiktok_verified: targetUser.tiktok_verified || false,
        created_date: targetUser.created_date,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});