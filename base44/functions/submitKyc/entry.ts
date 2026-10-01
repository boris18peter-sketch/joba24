import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getAuthenticatedUser, unauthorized } from '../../shared/internalAuth.ts';

// ── submitKyc (UH-2) ───────────────────────────────────────────────────────
// The single authoritative way a user submits KYC data.
//
// TRUST BOUNDARY — the whole point of this function:
//
//   USER-SUBMITTED DATA      full_name, phone, id_number, id_photo_url
//   SERVER-OWNED VERDICT     kyc_status, is_verified
//
// The request body may carry ONLY the submitted data. Any verdict the client
// tries to send is ignored entirely — this function ALWAYS writes
// `kyc_status: 'pending'` + `is_verified: false`. Only an admin, through
// `adminUpdateVerification`, may ever set a verdict.
//
// UX is unchanged: the modal still shows "pending" immediately after submit.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getAuthenticatedUser(base44);
    if (!user) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const { full_name, phone, id_number, id_photo_url } = body;

    const updates = {
      // ── server-owned verdict — never taken from the request ──
      kyc_status: 'pending',
      is_verified: false,
    };

    // ── user-submitted data — accepted, trimmed, nothing else ──
    if (typeof full_name === 'string' && full_name.trim()) updates.full_name = full_name.trim();
    if (typeof phone === 'string' && phone.trim()) updates.phone = phone.trim();
    if (typeof id_number === 'string' && id_number.trim()) updates.id_number = id_number.trim();
    if (typeof id_photo_url === 'string' && id_photo_url.trim()) updates.id_photo_url = id_photo_url.trim();

    await base44.asServiceRole.entities.User.update(user.id, updates);

    return Response.json({ success: true, kyc_status: 'pending', is_verified: false });
  } catch (error) {
    console.error('[submitKyc] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});