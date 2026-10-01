import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getJobaSettings } from '../../shared/jobaSettings.ts';
import { getAuthenticatedUser, unauthorized } from '../../shared/internalAuth.ts';

// ── grantProfileCompletionBonus (UH-1) ─────────────────────────────────────
// The single authoritative way the worker profile-completion bonus is granted.
//
// TRUST BOUNDARY (ADR-25 / ADR-28):
//   • the user comes from the authenticated session — never from the request;
//   • eligibility is derived from the PERSISTED profile, never from the client;
//   • the amount comes from JobaSettings — the client never supplies it;
//   • the balance is read and written server-side;
//   • idempotent — a second call can never grant twice.
//
// Credit economics are unchanged: the same amount, at the same moment, with the
// same CreditTransaction shape (type 'Loyalty_Reward' + note) the client used to
// write, and the same "any existing Loyalty_Reward wins" idempotency guard.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getAuthenticatedUser(base44);
    if (!user) return unauthorized();

    const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const fresh = freshUsers[0];
    if (!fresh) return Response.json({ error: 'User not found' }, { status: 404 });

    // Eligibility — the same "profile complete" definition the app uses
    // everywhere (categories AND cities present).
    const complete =
      (fresh.preferred_categories?.length ?? 0) > 0 &&
      (fresh.preferred_cities?.length ?? 0) > 0;
    if (!complete) return Response.json({ granted: false, reason: 'profile_incomplete' });

    const settings = await getJobaSettings(base44);
    const bonus = Number(settings.profile_completion_bonus) || 0;
    if (bonus <= 0) return Response.json({ granted: false, reason: 'bonus_disabled' });

    // Idempotency — unchanged guard, now authoritative.
    const existing = await base44.asServiceRole.entities.CreditTransaction.filter({
      user_id: user.id,
      type: 'Loyalty_Reward',
    });
    if (existing.length > 0) return Response.json({ granted: false, reason: 'already_granted' });

    const currentCredits = fresh.worker_credits ?? 0;
    const newBalance = currentCredits + bonus;

    await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: bonus,
      type: 'Loyalty_Reward',
      note: 'בונוס השלמת פרופיל',
      balance_after: newBalance,
    });

    console.log(`✅ Profile completion bonus ${bonus} granted to ${user.id}`);
    return Response.json({ granted: true, amount: bonus, balance: newBalance });
  } catch (error) {
    console.error('[grantProfileCompletionBonus] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});