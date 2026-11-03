import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig } from '../../shared/liveActivityConfig.ts';
import { dispatchRecipient, DISPATCH_ROLES } from '../../shared/liveActivitySend.ts';

/**
 * liveActivityDispatch — compute (and, only when explicitly unlocked, send) one
 * recipient's Live Activity update.
 *
 * ── NOT CONNECTED TO ANYTHING ──────────────────────────────────────────────
 * No task function calls this, no workflow triggers it on a task event. It is
 * reachable only by an admin, or by the refresh pass which calls the SAME shared
 * sender directly (never over HTTP). Stage 1 cannot emit a push as a side effect
 * of ordinary app usage.
 *
 * ── THE WORK ITSELF LIVES IN shared/liveActivitySend.ts ────────────────────
 * The read → build → plan → send → audit → commit sequence is shared with
 * liveActivityContentRefresh, so a wording refresh and an on-demand dispatch can
 * never send two different things for the same task. This file is only the HTTP
 * surface: authenticate, validate the request, load the authoritative task.
 *
 * ── THREE LOCKS BEFORE ANY NETWORK CALL ────────────────────────────────────
 *   1. mode === 'dispatch'            (default is 'plan')
 *   2. config.enabled === true
 *   3. config.dry_run === false       (and the APNs credentials must exist)
 * With any one of them closed the function still reports exactly what WOULD be
 * sent, and never contacts Apple.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    const recipientId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';
    const role = DISPATCH_ROLES.includes(body?.role) ? body.role : '';
    const mode = body?.mode === 'dispatch' ? 'dispatch' : 'plan';

    if (!taskId || !recipientId || !role) {
      return Response.json({ error: 'task_id, user_id and role are required' }, { status: 400 });
    }

    // ── Configuration (flag first: a disabled system does no work at all) ──
    const configPage = await base44.asServiceRole.entities.LiveActivityConfig
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const config = normalizeConfig((configPage?.items || [])[0]);

    if (!config.enabled) {
      return Response.json({
        enabled: false,
        mode,
        decision: 'disabled',
        contactedApns: false,
        note: 'Live Activities are disabled. Nothing was built, written or sent.',
      });
    }

    // ── Authoritative task (never the request payload) ─────────────────────
    const task = await base44.asServiceRole.entities.Task.get(taskId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!task) return Response.json({ error: 'task_not_found' }, { status: 404 });

    const result = await dispatchRecipient({
      base44,
      config,
      task,
      role,
      recipientId,
      mode,
      eventRevision: body?.event_revision ?? null,
    });

    if (result.decision === 'unauthorized') {
      return Response.json({ error: 'unauthorized_recipient', detail: result.reason }, { status: 403 });
    }

    if (result.kind === 'none' || result.decision === 'no_active_tokens') {
      return Response.json({
        enabled: true,
        mode,
        decision: result.decision,
        reason: result.reason || null,
        revision: result.revision || 0,
        contactedApns: false,
      });
    }

    return Response.json({
      enabled: true,
      mode,
      decision: result.decision,
      event: result.event,
      revision: result.revision,
      phase: result.phase || null,
      tokens: result.tokens,
      sent: result.sent,
      dryRun: result.dryRun,
      failed: result.failed,
      invalidated: result.invalidated,
      contactedApns: result.contactedApns,
      credentialsMissing: result.credentialsMissing || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});