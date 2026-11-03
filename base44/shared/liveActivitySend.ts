/**
 * liveActivitySend — the ONE place a Live Activity push is built and delivered.
 *
 * ── WHY IT IS SHARED ───────────────────────────────────────────────────────
 * Two different callers need to send the same thing:
 *   • liveActivityDispatch       — one recipient, on demand (admin/operator).
 *   • liveActivityContentRefresh — many recipients, after a category's wording
 *                                  changed.
 * If each had its own copy of the "read state → build snapshot → plan → send →
 * audit → commit revision" sequence, the two would drift and one of them would
 * eventually push something the other never would. So the sequence lives here,
 * once, and both functions are thin wrappers around it.
 *
 * ── WHAT IT CANNOT DO ──────────────────────────────────────────────────────
 * It never reads or writes a Task. It takes the STORED task as an argument (the
 * caller loads it), and every write it performs is to LiveActivityState,
 * LiveActivityToken (retiring a rejected token) or LiveActivityDispatch (audit).
 * Task state, payments, credits and notifications are out of its reach by
 * construction — there is no entity reference to them in this file.
 *
 * ── THE THREE LOCKS ARE UNCHANGED ──────────────────────────────────────────
 * mode === 'dispatch' AND config.enabled AND config.dry_run === false, plus
 * credentials that actually exist. Anything less and it reports the plan and
 * never contacts Apple.
 */
import { buildBackendSnapshot } from './liveActivitySnapshot.ts';
import { planLiveActivityDispatch, stateAfterPlan, shouldInvalidateToken, nextRevision } from './liveActivityDispatch.ts';
import { authorizeDispatch, eligibleTokens } from './liveActivityAuth.ts';
import { buildLiveActivityPush, sendLiveActivityPush } from './liveActivityApns.ts';
import { willContactApns } from './liveActivityConfig.ts';

export const DISPATCH_ROLES = ['publisher', 'worker'];

/** The APNs credentials, plus exactly which ones are absent. */
export function readApnsCredentials() {
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
export async function loadCategoryChain(base44, categoryKey) {
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

/**
 * Dispatch one recipient's Live Activity.
 *
 * @param base44        service-role client
 * @param config        normalized LiveActivityConfig
 * @param task          the STORED task — the authority, never a request copy
 * @param role          'publisher' | 'worker'
 * @param recipientId   the user whose device shows the card
 * @param mode          'plan' (default) | 'dispatch'
 * @param eventRevision optional revision from an event; older ones are refused
 */
export async function dispatchRecipient(input) {
  const {
    base44,
    config,
    task,
    role,
    recipientId,
    mode = 'plan',
    eventRevision = null,
    now = Date.now(),
    categories: preloadedCategories = null,
  } = input || {};

  const auth = authorizeDispatch({ task, role, userId: recipientId });
  if (!auth.ok) {
    return { kind: 'none', decision: 'unauthorized', reason: auth.reason, contactedApns: false };
  }

  const statePage = await base44.asServiceRole.entities.LiveActivityState
    .filter({ user_id: recipientId, task_id: task.id, role }, { limit: 1 })
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

  const [categories, settingsPage] = await Promise.all([
    preloadedCategories
      ? Promise.resolve(preloadedCategories)
      : loadCategoryChain(base44, task.category),
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
    now,
  });

  const plan = planLiveActivityDispatch({
    task,
    role,
    userId: recipientId,
    config,
    state,
    snapshot,
    eventRevision,
    now,
  });

  if (plan.kind === 'none') {
    return {
      kind: 'none',
      decision: plan.decision,
      reason: plan.reason || null,
      revision: state?.revision || 0,
      contactedApns: false,
    };
  }

  if (!tokens.length) {
    return { kind: plan.kind, decision: 'no_active_tokens', revision: state?.revision || 0, contactedApns: false };
  }

  const credentials = readApnsCredentials();
  const maySend = mode === 'dispatch' && willContactApns(config) && credentials.missing.length === 0;
  const event = plan.kind === 'end' ? 'end' : 'update';
  const payload = buildLiveActivityPush({ snapshot: plan.snapshot || { id: task.id, role, revision: plan.revision }, event });

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

  // Audit trail — one row per attempt, free of token content.
  const dispatchedAt = new Date().toISOString();
  await Promise.allSettled(results.map(({ tokenRow, result }) => base44.asServiceRole.entities.LiveActivityDispatch.create({
    user_id: recipientId,
    task_id: task.id,
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

  // Commit the revision only when something was actually delivered.
  const stateFields = stateAfterPlan({ plan, task, committed, sent, now });
  if (stateFields) {
    if (state?.id) {
      await base44.asServiceRole.entities.LiveActivityState.update(state.id, stateFields).catch(() => null);
    } else {
      await base44.asServiceRole.entities.LiveActivityState.create({
        user_id: recipientId,
        task_id: task.id,
        role,
        ...stateFields,
      }).catch(() => null);
    }
  }

  return {
    kind: plan.kind,
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
  };
}