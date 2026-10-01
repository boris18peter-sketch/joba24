import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireInternalOperator } from '../../shared/internalAuth.ts';

// ── adminUpdateVerification (UH-2) ─────────────────────────────────────────
// The ONLY authoritative writer of the KYC verdict pair:
//     is_verified  +  kyc_status
//
// The user-facing submission path is `submitKyc`, which can only ever write
// `kyc_status: 'pending'` + `is_verified: false`. A VERDICT is set here, by an
// admin (or another backend function with service authority) — never by the
// user whose record it is.
//
// UH-2 changes (behaviour-preserving):
//   • `isVerified` / `kycStatus` are now individually optional, so the
//     simulator's "remove verification" (is_verified only) and the dashboard's
//     "pending" path route here instead of writing the entity directly;
//   • the rejection push now fires ONLY for an actual rejection, so routing the
//     "pending" path through here cannot send a wrong notification;
//   • `silent` suppresses the push for internal tooling (demo mode).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const guard = await requireInternalOperator(base44, req);
    if (guard) return guard;

    const { userId, isVerified, kycStatus, silent } = await req.json().catch(() => ({}));

    if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 });
    if (isVerified === undefined && kycStatus === undefined) {
      return Response.json({ error: 'isVerified or kycStatus is required' }, { status: 400 });
    }
    if (isVerified !== undefined && typeof isVerified !== 'boolean') {
      return Response.json({ error: 'isVerified must be a boolean' }, { status: 400 });
    }
    if (kycStatus !== undefined && kycStatus !== null &&
        !['pending', 'approved', 'rejected'].includes(kycStatus)) {
      return Response.json({ error: 'kycStatus must be pending, approved, rejected or null' }, { status: 400 });
    }

    const updates = {};
    if (isVerified !== undefined) updates.is_verified = isVerified;
    if (kycStatus !== undefined) updates.kyc_status = kycStatus;

    const updated = await base44.asServiceRole.entities.User.update(userId, updates);

    // ── Notification — identical behaviour for the paths that had one ──
    if (!silent) {
      try {
        if (isVerified === true) {
          // Gold badge takes priority over green — determined server-side.
          const updatedUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
          const u = updatedUsers[0];
          const hasSocial = !!(u?.instagram_verified || u?.facebook_verified || u?.tiktok_verified);
          await base44.asServiceRole.functions.invoke('notificationManager', {
            event_key: hasSocial ? 'verification_approved_gold' : 'verification_approved_green',
            user_ids: [userId],
            force: true,
            variables: {},
          });
        } else if (kycStatus === 'rejected') {
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