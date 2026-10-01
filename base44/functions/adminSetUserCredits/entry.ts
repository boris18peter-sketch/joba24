import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireInternalOperator } from '../../shared/internalAuth.ts';

// ── adminSetUserCredits (UH-1) ─────────────────────────────────────────────
// The authoritative admin/service-role credit mutation for internal tooling.
// Replaces every direct CLIENT write of `worker_credits` (admin dashboard,
// QA simulator), so `worker_credits` can be locked with field-level
// rls.write:false without breaking legitimate admin tooling.
//
// Supports either an absolute balance (`setBalance`) or a relative change
// (`delta`). Always writes the matching CreditTransaction, so the ledger stays
// complete — the client never writes a balance or a transaction itself.
//
// Caller must be an admin, or another backend function with service authority.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const guard = await requireInternalOperator(base44, req);
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    const { userId, setBalance, delta, type, note } = body;

    if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 });

    const hasSet = setBalance !== undefined && setBalance !== null;
    const hasDelta = delta !== undefined && delta !== null;
    if (!hasSet && !hasDelta) {
      return Response.json({ error: 'setBalance or delta is required' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const target = users[0];
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const current = target.worker_credits ?? 0;
    let newBalance;
    let amount;

    if (hasSet) {
      newBalance = Number(setBalance);
      if (!Number.isFinite(newBalance)) {
        return Response.json({ error: 'setBalance must be a number' }, { status: 400 });
      }
      amount = newBalance - current;
    } else {
      amount = Number(delta);
      if (!Number.isFinite(amount) || amount === 0) {
        return Response.json({ error: 'delta must be a non-zero number' }, { status: 400 });
      }
      newBalance = current + amount;
    }

    await base44.asServiceRole.entities.User.update(userId, { worker_credits: newBalance });

    if (amount !== 0) {
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: userId,
        amount,
        type: type || (amount > 0 ? 'Loyalty_Reward' : 'Application_Fee'),
        note: note || `🧪 עדכון מנהל: ${amount > 0 ? '+' : ''}${amount}`,
        balance_after: newBalance,
      });
    }

    return Response.json({ success: true, newBalance, amount });
  } catch (error) {
    console.error('[adminSetUserCredits] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});