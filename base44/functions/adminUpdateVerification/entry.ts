import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { userId, isVerified, kycStatus } = await req.json();

    if (!userId || typeof isVerified !== 'boolean' || !kycStatus) {
      return Response.json({ error: 'Missing required fields: userId, isVerified, kycStatus' }, { status: 400 });
    }

    // Update the user's verification status
    const updated = await base44.asServiceRole.entities.User.update(userId, {
      is_verified: isVerified,
      kyc_status: kycStatus,
    });

    // ── Send notification via NotificationManager ──
    // Determines green vs gold based on social verification status
    try {
      // Re-fetch user to check if they also have social verification (gold badge)
      const updatedUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
      const updatedUser = updatedUsers[0];
      const hasSocial = !!(updatedUser?.instagram_verified || updatedUser?.facebook_verified || updatedUser?.tiktok_verified);

      if (isVerified) {
        // Gold badge takes priority — send gold notification
        const eventKey = hasSocial ? 'verification_approved_gold' : 'verification_approved_green';
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: eventKey,
          user_ids: [userId],
          force: true, // Verification events should always send
          variables: {},
        });
      } else {
        // Rejection — use a simple inline push (not a managed event)
        await base44.functions.invoke('sendPushNotification', {
          user_ids: [userId],
          title: '❌ האימות נדחה',
          body: 'האימות שלך נדחה. ניתן לעדכן את הפרטים ולשלוח שוב.',
          url: '/profile',
          tag: 'verification_update',
        });
      }
    } catch (pushErr) {
      console.log('[adminUpdateVerification] Push notification failed:', pushErr.message);
    }

    return Response.json({
      success: true,
      userId: updated.id,
      is_verified: updated.is_verified,
      kyc_status: updated.kyc_status,
    });
  } catch (error) {
    console.error('[adminUpdateVerification] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});