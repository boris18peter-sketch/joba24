import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SIGNUP_BONUS = 100;

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

    // Use service role to update credits reliably
    await base44.asServiceRole.entities.User.update(user.id, { worker_credits: SIGNUP_BONUS });

    // Log the transaction
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: SIGNUP_BONUS,
      type: 'Signup_Bonus',
      balance_after: SIGNUP_BONUS,
      note: 'בונוס הצטרפות - 100 ג\'ובות במתנה',
    });

    console.log(`✅ Signup bonus granted to user ${user.id}`);
    return Response.json({ success: true, credits: SIGNUP_BONUS });
  } catch (error) {
    console.error('❌ grantSignupBonus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});