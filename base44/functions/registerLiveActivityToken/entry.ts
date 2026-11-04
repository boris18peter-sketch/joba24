import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { planTokenRegistration } from '../../shared/liveActivityAuth.ts';

/**
 * registerLiveActivityToken — the ONLY way a Live Activity token enters the
 * system.
 *
 * ── SECURITY MODEL ─────────────────────────────────────────────────────────
 *  • The recipient is `base44.auth.me()`. A `user_id` in the body is treated as
 *    a claim and refused when it does not match the session.
 *  • Tokens belong to the account they were first seen for. A token already
 *    registered to somebody else is never moved.
 *  • When the client binds the token to a task, the task is re-read from the
 *    database and the role is authorized against `client_id` / `worker_id`, so a
 *    token can never be attached to another user's task.
 *  • Storage is separate from FCM: this writes LiveActivityToken only.
 *
 * Writing a token has no effect on any task, notification or subscription: it
 * records a destination and nothing else.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) return Response.json({ error: 'invalid_token' }, { status: 400 });

    // Read the rows for this exact token with service role ONLY to detect a
    // token that already belongs to another account (RLS would hide it). The
    // caller's own identity remains the only identity used for any write.
    const tokenPage = await base44.asServiceRole.entities.LiveActivityToken
      .filter({ token }, { limit: 5 })
      .catch(() => ({ items: [] }));

    // ── THE DEVICE'S OTHER TOKENS, SO OLD ONES ARE ACTUALLY RETIRED ─────────
    // The planner retires a device's superseded tokens by comparing `device_id`
    // — but it was only ever handed the rows of the SAME token, so `row.token
    // !== token` could never be true and nothing was ever retired. A device that
    // started an activity for five tasks therefore accumulated five "active"
    // tokens, and a dispatch would fan out to four activities that no longer
    // exist. The caller's own rows (their RLS allows exactly those) are read here
    // so the retirement rule can finally see them.
    const ownPage = await base44.entities.LiveActivityToken
      .filter({ user_id: user.id }, { limit: 50 })
      .catch(() => ({ items: [] }));

    const seenIds = new Set();
    const existingTokens = [...(tokenPage?.items || []), ...(ownPage?.items || [])]
      .filter((row) => row && row.id && !seenIds.has(row.id) && seenIds.add(row.id));

    // The task is read as the CALLER: their RLS decides what they may see, and a
    // task that is not theirs simply does not come back.
    let task = null;
    if (body?.task_id) {
      task = await base44.entities.Task.get(String(body.task_id))
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    }

    const plan = planTokenRegistration({ user, body, existingTokens, task });
    if (!plan.ok) {
      return Response.json({ error: plan.reason, detail: plan.detail || null }, { status: plan.status });
    }

    const nowIso = new Date().toISOString();
    let savedId = plan.existingId;

    if (plan.action === 'create') {
      const created = await base44.entities.LiveActivityToken.create(plan.record);
      savedId = created?.id || null;
    } else {
      const updated = await base44.entities.LiveActivityToken.update(plan.existingId, {
        environment: plan.record.environment,
        bundle_id: plan.record.bundle_id,
        device_id: plan.record.device_id,
        timezone: plan.record.timezone,
        app_version: plan.record.app_version,
        status: 'active',
        invalidated_at: null,
        invalidated_reason: null,
        failure_count: 0,
        last_seen_at: plan.record.last_seen_at,
      });
      savedId = updated?.id || plan.existingId;
    }

    // A device that re-registers after a rotation retires its previous tokens.
    // Bounded and best-effort: a failure here never fails the registration.
    if (plan.retireTokenIds.length) {
      await Promise.allSettled(plan.retireTokenIds.map((id) => base44.entities.LiveActivityToken.update(id, {
        status: 'invalid',
        invalidated_at: nowIso,
        invalidated_reason: 'superseded_by_new_token',
      })));
    }

    return Response.json({
      ok: true,
      action: plan.action,
      token_id: savedId,
      environment: plan.record.environment,
      timezone: plan.record.timezone,
      tracking: plan.taskRole ? { task_id: task?.id || null, role: plan.taskRole } : null,
      retired: plan.retireTokenIds.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});