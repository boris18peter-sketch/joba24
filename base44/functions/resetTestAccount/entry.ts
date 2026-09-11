import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Resets the hello@joba24.com test account to a fresh state.
//
// Called in two scenarios:
// 1. Immediately after login with code starting with "2424" (frontend invoke)
// 2. By a scheduled workflow every hour — if 12h passed since last reset
//
// The function deletes ALL user data (tasks, applications, reviews, credits,
// chat messages, etc.) and resets the User record to a clean state, then
// grants the signup bonus so the account is ready for a fresh test session.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { force } = body || {};

    // Authenticate — must be the test account
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isTestAccount = user.email?.toLowerCase() === 'hello@joba24.com';
    const isAdmin = user.role === 'admin';

    if (!isTestAccount && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Target user: hello@joba24.com (admin can force-reset via force=true + target email)
    const targetEmail = (isAdmin && body?.target_email) || user.email;
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: targetEmail }, '-created_date', 1);
    const targetUser = targetUsers?.[0];
    if (!targetUser) return Response.json({ error: 'Test account not found' }, { status: 404 });

    // If called from workflow (no user session / admin), check if 12h passed
    if (!force && targetUser.test_account_reset_at) {
      const lastReset = new Date(targetUser.test_account_reset_at).getTime();
      const hoursSince = (Date.now() - lastReset) / 3600000;
      if (hoursSince < 12) {
        return Response.json({ skipped: true, hours_remaining: Math.round(12 - hoursSince) });
      }
    }

    const userId = targetUser.id;

    // ── Delete all user data ──
    // Tasks created by this user (as client)
    try {
      await base44.asServiceRole.entities.Task.deleteMany({ client_id: userId });
    } catch {}
    // Tasks taken by this user (as worker)
    try {
      await base44.asServiceRole.entities.Task.updateMany(
        { worker_id: userId },
        { $unset: { worker_id: '', worker_name: '', worker_status: '', worker_confirmed: '', worker_rating: '', worker_verified: '', on_the_way_at: '', arrived_at: '', completed_at: '', completion_photo: '', completion_photos: '', completion_video_url: '', worker_lat: '', worker_lng: '' }, $set: { status: 'OPEN', payment_held: false } }
      );
    } catch {}
    // Applications by this user
    try {
      await base44.asServiceRole.entities.TaskApplication.deleteMany({ worker_id: userId });
    } catch {}
    // Reviews by or about this user
    try {
      await base44.asServiceRole.entities.Review.deleteMany({ $or: [{ reviewer_id: userId }, { reviewee_id: userId }] });
    } catch {}
    // Credit transactions
    try {
      await base44.asServiceRole.entities.CreditTransaction.deleteMany({ user_id: userId });
    } catch {}
    // Chat messages
    try {
      await base44.asServiceRole.entities.ChatMessage.deleteMany({ sender_id: userId });
    } catch {}
    // Transactions
    try {
      await base44.asServiceRole.entities.Transaction.deleteMany({ user_id: userId });
    } catch {}
    // Support messages
    try {
      await base44.asServiceRole.entities.SupportMessage.deleteMany({ user_id: userId });
    } catch {}
    // Notification logs
    try {
      await base44.asServiceRole.entities.NotificationLog.deleteMany({ user_id: userId });
    } catch {}
    // IAP purchases
    try {
      await base44.asServiceRole.entities.IosPurchase.deleteMany({ user_id: userId });
    } catch {}
    // Tranzila payments
    try {
      await base44.asServiceRole.entities.TranzilaPayment.deleteMany({ user_id: userId });
    } catch {}
    // User presence
    try {
      await base44.asServiceRole.entities.UserPresence.deleteMany({ user_id: userId });
    } catch {}

    // ── Reset User record to fresh state ──
    await base44.asServiceRole.entities.User.update(userId, {
      worker_credits: 0,
      rating: 0,
      rating_count: 0,
      score_tasks: 0,
      tasks_completed: 0,
      repeat_hires: 0,
      preferred_categories: [],
      preferred_cities: [],
      profession: '',
      bio: '',
      profile_photo: '',
      intro_video_url: '',
      profile_media: [],
      certificates: [],
      certificate_files: [],
      id_number: '',
      id_photo_url: '',
      kyc_status: null,
      is_verified: false,
      is_approved: false,
      verified_celebration_shown: false,
      instagram_username: '',
      instagram_verified: false,
      facebook_username: '',
      facebook_verified: false,
      tiktok_username: '',
      tiktok_verified: false,
      test_account_reset_at: new Date().toISOString(),
    });

    // ── Grant signup bonus for fresh session ──
    try {
      await base44.asServiceRole.functions.invoke('grantSignupBonus', { user_id: userId });
    } catch {}

    return Response.json({ ok: true, reset_at: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}