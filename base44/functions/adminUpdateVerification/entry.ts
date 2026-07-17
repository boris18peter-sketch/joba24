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

    // Send push notification via the existing sendPushNotification function
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_ids: [userId],
        title: isVerified ? '✅ האימות אושר' : '❌ האימות נדחה',
        body: isVerified
          ? 'האימות שלך אושר! עכשיו יש לך ווי ירוק 🔥'
          : 'האימות שלך נדחה. ניתן לעדכן את הפרטים ולשלוח שוב.',
        url: '/profile',
        tag: 'verification_update',
      });
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