import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireInternalOperator } from '../../shared/internalAuth.ts';

// ── adminSetUserFields (UH-3 / UH-4) ───────────────────────────────────────
// The authoritative admin/service-role writer for every PROTECTED User field
// that is neither a credit balance (adminSetUserCredits owns that) nor a KYC
// verdict (adminUpdateVerification owns is_verified / kyc_status).
//
// Only a STRICT WHITELIST can be written — anything else in `values` is
// dropped and reported back, so this can never write an arbitrary field.
//
// Used by:
//   • AdminDashboard — approve/revoke access, block/unblock, agent role,
//     commission rate, agent code, referral attribution
//   • the QA simulator — verification + reputation resets
//   • demo mode — entering/leaving the "new user" preview
//
// Caller must be an admin, or another backend function with service authority.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const guard = await requireInternalOperator(base44, req);
    if (guard) return guard;

    const { userId, values } = await req.json().catch(() => ({}));
    if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 });
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      return Response.json({ error: 'values must be an object' }, { status: 400 });
    }

    // Strict whitelist — protected, admin-settable fields only.
    const ALLOWED = new Set([
      // access / authorization
      'is_approved', 'is_blocked', 'role',
      // agent / referral / commercial
      'agent_code', 'agent_id', 'commission_rate', 'referred_by_agent_code',
      // reputation / statistics
      'rating', 'rating_count', 'tasks_completed', 'repeat_hires',
      'on_time_rate', 'score_tasks', 'avg_response_minutes', 'trust_score',
      // social verification results
      'instagram_verified', 'facebook_verified', 'tiktok_verified',
      // KYC artefacts (demo-mode reset only — never a verdict)
      'id_number', 'id_photo_url',
    ]);

    const updates = {};
    const rejected = [];
    for (const [key, value] of Object.entries(values)) {
      if (ALLOWED.has(key)) updates[key] = value;
      else rejected.push(key);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No permitted fields supplied', rejected }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.User.update(userId, updates);

    return Response.json({
      success: true,
      userId: updated.id,
      updated: Object.keys(updates),
      rejected,
    });
  } catch (error) {
    console.error('[adminSetUserFields] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});