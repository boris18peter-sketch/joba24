import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SIGNUP_BONUS = 100;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only grant bonus if user doesn't have credits yet (first time)
  if (user.worker_credits !== undefined && user.worker_credits !== null) {
    return Response.json({ message: 'Bonus already granted', credits: user.worker_credits });
  }

  // Grant 100 signup bonus credits
  await base44.auth.updateMe({ worker_credits: SIGNUP_BONUS });

  // Log the transaction
  await base44.entities.CreditTransaction.create({
    user_id: user.id,
    amount: SIGNUP_BONUS,
    type: 'Signup_Bonus',
    balance_after: SIGNUP_BONUS,
    note: 'בונוס הצטרפות - 100 ג\'ובות במתנה',
  });

  return Response.json({ success: true, credits: SIGNUP_BONUS });
});