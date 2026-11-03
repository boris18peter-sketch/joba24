import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { completeTaskCore } from '../../shared/taskCompletion.ts';

/**
 * completeTask — the HTTP entry point of the publisher's completion workflow.
 *
 * ── UNCHANGED BEHAVIOUR, ONE IMPLEMENTATION ────────────────────────────────
 * Everything that made completion what it is — the owner check, the
 * `client_confirmed` idempotency guard, the worker's `tasks_completed` counter,
 * rejecting and refunding the remaining applications through the credit ledger,
 * rebuilding the applicant projection — now lives in `shared/taskCompletion.ts`,
 * because the Lock Screen approval must run EXACTLY the same workflow.
 *
 * This file keeps only what is HTTP-specific: who is calling, and how the result
 * is serialized. The in-app banner's "אשר סיום עבודה" button is untouched and
 * still calls this function.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();

    const result = await completeTaskCore(base44, user, taskId);
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error('❌ completeTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});