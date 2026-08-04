import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getJobaSettings } from '../../shared/jobaSettings.ts';

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
    const isReferred = !!(freshUser.referred_by_agent_code);
    const baseBonus = settings.signup_bonus;
    const referralBonus = isReferred ? settings.referral_signup_bonus : 0;
    const totalBonus = baseBonus + referralBonus;

    // Use service role to update credits reliably
    await base44.asServiceRole.entities.User.update(user.id, { worker_credits: totalBonus });

    // Log the transaction
    const noteParts = [`בונוס הצטרפות - ${baseBonus} ג'ובות במתנה`];
    if (isReferred && referralBonus > 0) {
      noteParts.push(`+ ${referralBonus} בונוס הפניה דרך סוכן`);
    }
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: totalBonus,
      type: 'Signup_Bonus',
      balance_after: totalBonus,
      note: noteParts.join(' '),
    });

    console.log(`✅ Signup bonus granted to user ${user.id} (referred=${isReferred}, total=${totalBonus})`);
    return Response.json({ success: true, credits: totalBonus, base_bonus: baseBonus, referral_bonus: referralBonus, is_referred: isReferred });
  } catch (error) {
    console.error('❌ grantSignupBonus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});