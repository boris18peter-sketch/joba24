import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getJobaSettings } from '../../shared/jobaSettings.ts';
import { getAuthenticatedUser, unauthorized } from '../../shared/internalAuth.ts';
import { applyCreditDeltas } from '../../shared/userCredits.ts';

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

    // Idempotency — the guard asks about THIS bonus, not about the type.
    // A rating reward is also a 'Loyalty_Reward', but it always carries a
    // task_id; the profile bonus never does. Matching on the type alone meant a
    // worker who had ever earned a rating bonus could never receive the profile
    // completion bonus they were owed.
    const existing = await base44.asServiceRole.entities.CreditTransaction.filter({
      user_id: user.id,
      type: 'Loyalty_Reward',
    });
    const rows = Array.isArray(existing) ? existing : (existing?.items || []);
    if (rows.some((t) => !t.task_id)) return Response.json({ granted: false, reason: 'already_granted' });

    // ── THE BALANCE IS RE-READ AT THE WRITE, NOT AT THE TOP ─────────────────
    // `fresh` was fetched before the settings read and the idempotency check, so
    // by the time the balance was written it could already be stale — and an
    // absolute write from a stale read does not "add" a bonus, it REPLACES the
    // balance with whatever it saw plus the bonus.
    //
    // That is exactly what happened to a real account: a 25-Joba signup bonus was
    // followed minutes later by a 5-Joba profile bonus, and the second write
    // turned 25 into 5. The publisher did nothing wrong and lost 25 Jobas.
    //
    // applyCreditDeltas re-reads the balance immediately before writing and
    // applies the bonus as a DELTA — the app's single sanctioned way to move a
    // balance (see shared/userCredits.ts) — so a bonus can never again overwrite
    // credits it did not create.
    const balances = await applyCreditDeltas(base44.asServiceRole, [
      { id: user.id, delta: bonus },
    ]);
    const newBalance = balances[user.id];
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