import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getAuthenticatedUser, unauthorized, forbidden } from '../../shared/internalAuth.ts';
import { grantLoyaltyForTask } from '../../shared/loyaltyReward.ts';

/**
 * grantLoyaltyReward — the 5-star professionalism bonus, by request.
 *
 * ── WHY IT IS A THIN WRAPPER NOW ──────────────────────────────────────────
 * The same bonus is settled automatically the moment a review is written
 * (`shared/reviewSubmission.ts`), including a rating given on the Lock Screen
 * where there is no session to call this function with. The RULES therefore live
 * in `shared/loyaltyReward.ts` — one copy — and this endpoint keeps only what is
 * its own: the authorization.
 *
 * Payload: { taskId }
 *
 * ── Trust boundary (Package #3.1C) ────────────────────────────────────────
 * The client supplies ONLY the task identifier. Everything that determines the
 * reward — who the owner is, what the persisted rating is, which worker is
 * rewarded, and what the task is called — is derived server-side from persisted
 * records, so none of it can be forged.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // The caller must be a signed-in user AND the task's own client.
    const caller = await getAuthenticatedUser(base44);
    if (!caller) return unauthorized();

    const { taskId } = await req.json();
    if (!taskId) {
      return Response.json({ error: 'taskId required' }, { status: 400 });
    }

    // The Task is the only source of truth for ownership, the assigned worker
    // and the title.
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    if (task.client_id !== caller.id) {
      return forbidden('Only the task owner can grant a loyalty reward');
    }

    const result = await grantLoyaltyForTask(base44, { task });
    if (result.note === 'worker_missing') {
      return Response.json({ error: 'Worker not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      bonus: result.bonus,
      new_balance: result.new_balance,
      note: result.note,
    });
  } catch (error) {
    console.error('❌ grantLoyaltyReward error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});