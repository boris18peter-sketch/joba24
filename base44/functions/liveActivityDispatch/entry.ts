import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig, willContactApns } from '../../shared/liveActivityConfig.ts';
import { buildBackendSnapshot } from '../../shared/liveActivitySnapshot.ts';
import { planLiveActivityDispatch, stateAfterPlan, shouldInvalidateToken, nextRevision } from '../../shared/liveActivityDispatch.ts';
import { authorizeDispatch, eligibleTokens } from '../../shared/liveActivityAuth.ts';
import { buildLiveActivityPush, sendLiveActivityPush } from '../../shared/liveActivityApns.ts';

/**
 * liveActivityDispatch — compute (and, only when explicitly unlocked, send) one
 * recipient's Live Activity update.
 *
 * ── NOT CONNECTED TO ANYTHING ──────────────────────────────────────────────
 * No task function calls this, no workflow triggers it, no entity subscription
 * invokes it. It is reachable only by an admin, on purpose, so Stage 1 cannot
 * emit a push as a side effect of ordinary app usage.
 *
 * ── THREE LOCKS BEFORE ANY NETWORK CALL ────────────────────────────────────
 *   1. mode === 'dispatch'            (default is 'plan')
 *   2. config.enabled === true
 *   3. config.dry_run === false       (and the APNs credentials must exist)
 * With any one of them closed the function still reports exactly what WOULD be
 * sent, and never contacts Apple.
 */
const ROLES = ['publisher', 'worker'];

function readApnsCredentials() {
  const keyId = Deno.env.get('APNS_KEY_ID') || '';
  const teamId = Deno.env.get('APNS_TEAM_ID') || '';
  const privateKeyPem = Deno.env.get('APNS_PRIVATE_KEY') || '';
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') || '';
  const missing = [];
  if (!keyId) missing.push('APNS_KEY_ID');
  if (!teamId) missing.push('APNS_TEAM_ID');
  if (!privateKeyPem) missing.push('APNS_PRIVATE_KEY');
  if (!bundleId) missing.push('APNS_BUNDLE_ID');
  return { keyId, teamId, privateKeyPem, bundleId, missing };
}

/** The category chain (service → root) that resolveStatusFlow needs. */
async function loadCategoryChain(base44, categoryKey) {
  const rows = [];
  let current = categoryKey;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const page = await base44.asServiceRole.entities.GlobalCategory
      .filter({ category_key: current }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const row = (page?.items || [])[0];
    if (!row) break;
    rows.push(row);
    current = row.parent_key || '';
  }
  return rows;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    const recipientId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';
    const role = ROLES.includes(body?.role) ? body.role : '';
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

    // ── Authoritative task + recipient authorization ───────────────────────
    const task = await base44.asServiceRole.entities.Task.get(taskId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!task) return Response.json({ error: 'task_not_found' }, { status: 404 });

    const auth = authorizeDispatch({ task, role, userId: recipientId });
    if (!auth.ok) {
      return Response.json({ error: 'unauthorized_recipient', detail: auth.reason }, { status: 403 });
    }

    const statePage = await base44.asServiceRole.entities.LiveActivityState
      .filter({ user_id: recipientId, task_id: taskId, role }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const state = (statePage?.items || [])[0] || null;

    const tokenPage = await base44.asServiceRole.entities.LiveActivityToken
      .filter({ user_id: recipientId }, { limit: 50 })
      .catch(() => ({ items: [] }));
    const tokens = eligibleTokens(tokenPage?.items || [], {
      userId: recipientId,
      environment: config.environment,
      limit: config.max_tokens_per_dispatch,
    });
    const timeZone = tokens[0]?.timezone || undefined;
    const bundleId = tokens[0]?.bundle_id || readApnsCredentials().bundleId;

    // ── Snapshot from the stored task (never from the request) ─────────────
    const [categories, settingsPage] = await Promise.all([
      loadCategoryChain(base44, task.category),
      base44.asServiceRole.entities.JobaSettings.list({ sort: '-updated_date', limit: 1 }).catch(() => ({ items: [] })),
    ]);
    const settings = (settingsPage?.items || [])[0] || {};

    const snapshot = buildBackendSnapshot({
      task,
      role,
      userId: recipientId,
      categories,
      settings,
      timeZone,
      revision: nextRevision(state),
    });

    const plan = planLiveActivityDispatch({
      task,
      role,
      userId: recipientId,
      config,
      state,
      snapshot,
      eventRevision: body?.event_revision ?? null,
    });

    if (plan.kind === 'none') {
      return Response.json({
        enabled: true,
        mode,
        decision: plan.decision,
        reason: plan.reason || null,
        revision: state?.revision || 0,
        contactedApns: false,
      });
    }

    if (!tokens.length) {
      return Response.json({
        enabled: true,
        mode,
        decision: 'no_active_tokens',
        revision: state?.revision || 0,
        contactedApns: false,
      });
    }

    // ── Dispatch ───────────────────────────────────────────────────────────
    const credentials = readApnsCredentials();
    const maySend = mode === 'dispatch' && willContactApns(config) && credentials.missing.length === 0;
    const event = plan.kind === 'end' ? 'end' : 'update';
    const payload = buildLiveActivityPush({ snapshot: plan.snapshot || { id: taskId, role, revision: plan.revision }, event });

    const results = [];
    for (const tokenRow of tokens) {
      const result = maySend
        ? await sendLiveActivityPush({
            token: tokenRow.token,
            environment: tokenRow.environment,
            bundleId: tokenRow.bundle_id || bundleId,
            credentials,
            payload,
          })
        : {
            ok: true,
            dryRun: true,
            category: maySend ? 'dry_run' : (mode === 'dispatch' ? 'missing_credentials' : 'dry_run'),
            status: null,
            apnsId: null,
            invalidateToken: false,
            retryable: false,
          };

      results.push({ tokenRow, result });

      // Retire a token Apple rejected. This touches the token row only.
      if (shouldInvalidateToken(result)) {
        await base44.asServiceRole.entities.LiveActivityToken.update(tokenRow.id, {
          status: 'invalid',
          invalidated_at: new Date().toISOString(),
          invalidated_reason: result.category === 'invalid_token' ? 'apns_rejected' : 'dispatch_failed',
        }).catch(() => null);
      }
    }

    const sent = results.filter((r) => r.result.ok && !r.result.dryRun).length;
    const committed = sent > 0;

    // ── Audit trail (one row per attempt, free of token content) ───────────
    const dispatchedAt = new Date().toISOString();
    await Promise.allSettled(results.map(({ tokenRow, result }) => base44.asServiceRole.entities.LiveActivityDispatch.create({
      user_id: recipientId,
      task_id: taskId,
      role,
      revision: plan.revision,
      event,
      phase: plan.snapshot?.phase || (event === 'end' ? 'terminal' : ''),
      status: result.ok ? (result.dryRun ? 'dry_run' : 'sent') : 'failed',
      decision: plan.decision,
      reason: result.category || '',
      environment: tokenRow.environment,
      token_id: tokenRow.id,
      apns_status: result.status ?? null,
      apns_id: result.apnsId || '',
      error_category: result.ok ? '' : (result.category || ''),
      attempts: result.dryRun ? 0 : 1,
      dispatched_at: dispatchedAt,
    })));

    // ── Commit the revision (only when something was actually delivered) ──
    const stateFields = stateAfterPlan({ plan, task, committed, sent: committed, now: Date.now() });
    if (stateFields) {
      if (state?.id) {
        await base44.asServiceRole.entities.LiveActivityState.update(state.id, stateFields).catch(() => null);
      } else {
        await base44.asServiceRole.entities.LiveActivityState.create({
          user_id: recipientId,
          task_id: taskId,
          role,
          ...stateFields,
        }).catch(() => null);
      }
    }

    return Response.json({
      enabled: true,
      mode,
      decision: plan.decision,
      event,
      revision: plan.revision,
      phase: plan.snapshot?.phase || null,
      tokens: tokens.length,
      sent,
      dryRun: results.every((r) => r.result.dryRun),
      failed: results.filter((r) => !r.result.ok).length,
      invalidated: results.filter((r) => shouldInvalidateToken(r.result)).length,
      contactedApns: maySend,
      credentialsMissing: credentials.missing,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});