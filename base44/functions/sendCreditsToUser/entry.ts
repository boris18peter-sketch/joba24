import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json();
    const { targetUserId, amount, note } = body;
    if (!targetUserId || !amount) return Response.json({ error: 'targetUserId and amount required' }, { status: 400 });

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      return Response.json({ error: 'amount must be a non-zero number' }, { status: 400 });
    }

    const targetUsers = await base44.asServiceRole.entities.User.filter({ id: targetUserId }, '-created_date', 1);
    const target = targetUsers[0];
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const currentCredits = target.worker_credits ?? 0;
    const newBalance = currentCredits + numericAmount;

    await base44.asServiceRole.entities.User.update(targetUserId, { worker_credits: newBalance });

    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: targetUserId,
      amount: numericAmount,
      type: numericAmount > 0 ? 'Loyalty_Reward' : 'Application_Fee',
      note: note || `קרדיטים ממנהל (${user.full_name || 'admin'}): ${numericAmount > 0 ? '+' : ''}${numericAmount}`,
      balance_after: newBalance,
    });

    return Response.json({ success: true, newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});