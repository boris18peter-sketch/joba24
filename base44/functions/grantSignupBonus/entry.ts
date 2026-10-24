import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getJobaSettings } from '../../shared/jobaSettings.ts';
import { applyCreditDeltas } from '../../shared/userCredits.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Re-fetch user via service role to get the CURRENT credits value (not the stale JWT claim)
    const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const freshUser = freshUsers[0];
    if (!freshUser) return Response.json({ error: 'User not found' }, { status: 404 });

    // Idempotency guard: only grant if credits field is genuinely null/undefined
    if (freshUser.worker_credits !== undefined && freshUser.worker_credits !== null) {
      return Response.json({ message: 'Bonus already granted', credits: freshUser.worker_credits });
    }

    // Load configurable bonuses
    const settings = await getJobaSettings(base44);

    // NEVER INVENT A BONUS. When the settings read fails, the numbers in
    // `settings` are the hardcoded fallbacks (60/40), not what the admin
    // configured — and granting those is exactly how a new account once received
    // 60 Jobas while the live setting said 25. Refusing is safe: the grant is
    // idempotent and the client re-attempts on the next login, because
    // worker_credits is still null.
    if (settings.settings_source === 'error') {
      return Response.json({ error: 'Settings unavailable — bonus not granted' }, { status: 503 });
    }

    const isReferred = !!(freshUser.referred_by_agent_code);
    const baseBonus = settings.signup_bonus;
    const referralBonus = isReferred ? settings.referral_signup_bonus : 0;
    const totalBonus = baseBonus + referralBonus;

    // ── THE BONUS IS A DELTA, NEVER AN ABSOLUTE ─────────────────────────────
    // This used to write `worker_credits: totalBonus` — an absolute value read
    // from a user record fetched earlier in the request. Any credit that landed
    // in between (a profile-completion bonus, a refund) was not "added to", it
    // was ERASED, because the write replaced the whole balance with a stale
    // figure. applyCreditDeltas re-reads the balance immediately before writing
    // and applies the bonus as a delta — the app's single sanctioned way to move
    // a balance (see shared/userCredits.ts).
    const balances = await applyCreditDeltas(base44.asServiceRole, [
      { id: user.id, delta: totalBonus },
    ]);
    const newBalance = balances[user.id];

    // Log the transaction
    const noteParts = [`בונוס הצטרפות - ${baseBonus} ג'ובות במתנה`];
    if (isReferred && referralBonus > 0) {
      noteParts.push(`+ ${referralBonus} בונוס הפניה דרך סוכן`);
    }
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: totalBonus,
      type: 'Signup_Bonus',
      balance_after: newBalance,
      note: noteParts.join(' '),
    });

    console.log(`✅ Signup bonus granted to user ${user.id} (referred=${isReferred}, total=${totalBonus})`);
    return Response.json({ success: true, credits: totalBonus, base_bonus: baseBonus, referral_bonus: referralBonus, is_referred: isReferred });
  } catch (error) {
    console.error('❌ grantSignupBonus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});