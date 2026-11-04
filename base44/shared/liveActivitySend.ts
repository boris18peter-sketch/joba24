/**
 * liveActivitySend — the ONE place a Live Activity push is built and delivered.
 *
 * ── WHY IT IS SHARED ───────────────────────────────────────────────────────
 * Three different callers need to send the same thing:
 *   • liveActivityDispatch       — one recipient, on demand (admin/operator).
 *   • liveActivityContentRefresh — many recipients, after a category's wording
 *                                  changed.
 *   • liveActivityTaskEvent      — the REAL task lifecycle, allowlist only.
 * …plus the device-side session helpers below (begin / sync / close), which keep
 * the revision the phone starts and updates with inside the same sequence.
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
import {
  planLiveActivityDispatch, stateAfterPlan, shouldInvalidateToken, nextRevision, TERMINAL_TASK_STATUSES,
} from './liveActivityDispatch.ts';
import { authorizeDispatch, eligibleTokens } from './liveActivityAuth.ts';
import { buildLiveActivityPush, sendLiveActivityPush } from './liveActivityApns.ts';
import { isTrackedRecipient, mayContactApnsFor } from './liveActivityConfig.ts';

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
 * Everything a snapshot needs that is not the task itself.
 *
 * ONE read path, used by the sender and by the device-session helpers below, so
 * a started activity, a locally applied update and a pushed update can never be
 * composed from different inputs (different timezone, different category chain).
 */
export async function loadSnapshotInputs(base44, input) {
  const { task, recipientId, config, categories: preloaded = null } = input || {};

  const tokenPage = await base44.asServiceRole.entities.LiveActivityToken
    .filter({ user_id: recipientId }, { limit: 50 })
    .catch(() => ({ items: [] }));
  const tokens = eligibleTokens(tokenPage?.items || [], {
    userId: recipientId,
    environment: config?.environment,
    limit: config?.max_tokens_per_dispatch,
  });

  const [categories, settingsPage] = await Promise.all([
    preloaded ? Promise.resolve(preloaded) : loadCategoryChain(base44, task?.category),
    base44.asServiceRole.entities.JobaSettings.list({ sort: '-updated_date', limit: 1 }).catch(() => ({ items: [] })),
  ]);

  return {
    tokens,
    timeZone: tokens[0]?.timezone || undefined,
    bundleId: tokens[0]?.bundle_id || readApnsCredentials().bundleId,
    categories,
    settings: (settingsPage?.items || [])[0] || {},
  };
}

/** The stored state row for one (user, task, role). */
async function readState(base44, { recipientId, taskId, role }) {
  const page = await base44.asServiceRole.entities.LiveActivityState
    .filter({ user_id: recipientId, task_id: taskId, role }, { limit: 1 })
    .catch(() => ({ items: [] }));
  return (page?.items || [])[0] || null;
}

/**
 * Open (or adopt) the server-side state for an activity the DEVICE is starting.
 *
 * ── WHY THE DEVICE ASKS FIRST ──────────────────────────────────────────────
 * The server owns the revision sequence. If the device started at revision 1
 * while the server had already pushed revision 5, the very next push would be
 * refused as stale by the widget. So the device asks for the revision it must
 * start with: 1 for a fresh (user, task, role), or the revision already
 * committed if an earlier activity for it existed (app restart, second device).
 *
 * `content_key` is deliberately NOT written here. The server does not know what
 * the device actually rendered, and pretending it does would let the dedupe
 * suppress the first corrective push.
 */
export async function beginRecipientState(base44, input) {
  const { task, role, recipientId, now = Date.now() } = input || {};
  const auth = authorizeDispatch({ task, role, userId: recipientId });
  if (!auth.ok) return { ok: false, decision: 'unauthorized', reason: auth.reason };

  const existing = await readState(base44, { recipientId, taskId: task.id, role });
  if (existing) {
    return {
      ok: true,
      decision: 'existing',
      revision: Math.max(1, Math.floor(Number(existing.revision) || 1)),
      terminal: existing.terminal === true,
    };
  }

  await base44.asServiceRole.entities.LiveActivityState.create({
    user_id: recipientId,
    task_id: task.id,
    role,
    revision: 1,
    phase: '',
    content_key: '',
    task_status: task.status || '',
    terminal: false,
    last_event_at: new Date(now).toISOString(),
    last_decision: 'device_start',
  }).catch(() => null);

  return { ok: true, decision: 'created', revision: 1, terminal: false };
}

/**
 * Allocate the revision for an update the DEVICE is about to apply itself.
 *
 * Used when the app is open and the card must move without waiting for a push
 * (including a dry run, where no push is sent at all). The revision advances
 * exactly as a real push would advance it, so the two paths stay in one
 * sequence and neither can overwrite the other.
 */
export async function syncRecipientState(base44, input) {
  const { task, role, recipientId, now = Date.now() } = input || {};
  const auth = authorizeDispatch({ task, role, userId: recipientId });
  if (!auth.ok) return { ok: false, decision: 'unauthorized', reason: auth.reason };

  const existing = await readState(base44, { recipientId, taskId: task.id, role });
  const revision = nextRevision(existing);
  const at = new Date(now).toISOString();
  const fields = {
    revision,
    task_status: task.status || '',
    terminal: false,
    last_event_at: at,
    last_decision: 'device_sync',
  };

  if (existing?.id) {
    await base44.asServiceRole.entities.LiveActivityState.update(existing.id, fields).catch(() => null);
  } else {
    await base44.asServiceRole.entities.LiveActivityState.create({
      user_id: recipientId,
      task_id: task.id,
      role,
      phase: '',
      content_key: '',
      ...fields,
    }).catch(() => null);
  }

  return { ok: true, decision: 'synced', revision };
}

/**
 * Record that the DEVICE itself closed the activity.
 *
 * Marks the state terminal so a late duplicate event cannot push a second
 * "end" for work that is already off the Lock Screen. Ownership is checked
 * against the stored record; a terminal task is still owned by its two people.
 */
export async function closeRecipientState(base44, input) {
  const { task, role, recipientId, now = Date.now() } = input || {};
  if (!task?.id) return { ok: false, decision: 'task_missing' };
  const owns = role === 'worker' ? task.worker_id === recipientId : task.client_id === recipientId;
  if (!owns) return { ok: false, decision: 'unauthorized', reason: 'not_owner' };

  const existing = await readState(base44, { recipientId, taskId: task.id, role });
  if (existing?.terminal) {
    return { ok: true, decision: 'already_terminal', revision: Math.max(1, Math.floor(Number(existing.revision) || 1)) };
  }

  const revision = nextRevision(existing);
  const at = new Date(now).toISOString();
  const fields = {
    revision,
    terminal: true,
    terminal_at: at,
    task_status: task.status || '',
    last_event_at: at,
    last_decision: 'device_end',
  };

  if (existing?.id) {
    await base44.asServiceRole.entities.LiveActivityState.update(existing.id, fields).catch(() => null);
  } else {
    await base44.asServiceRole.entities.LiveActivityState.create({
      user_id: recipientId,
      task_id: task.id,
      role,
      phase: 'terminal',
      content_key: '',
      ...fields,
    }).catch(() => null);
  }

  return { ok: true, decision: 'closed', revision };
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

  // ── WHO THIS RUN IS FOR ───────────────────────────────────────────────────
  // A recipient the configuration does not cover is refused before any read, so
  // the real-task test allowlist can never widen what production already does.
  if (!isTrackedRecipient(config, recipientId)) {
    return { kind: 'none', decision: 'disabled', reason: 'recipient_not_tracked', contactedApns: false };
  }

  // ── A FINISHED TASK MUST STILL BE CLOSEABLE ─────────────────────────────
  // `authorizeActivity` only authorizes LIVE tracking, so gating everything on
  // it made the planner's terminal branch unreachable through this path: the
  // one push that matters most — "this is over, take the card down" — could
  // never be sent. Ownership is therefore verified directly against the record
  // for a terminal task (the same rule the planner applies), and live tasks keep
  // using the shared authorization unchanged.
  const terminalTask = TERMINAL_TASK_STATUSES.includes(task?.status);
  if (terminalTask) {
    const owns = role === 'worker' ? task.worker_id === recipientId : task.client_id === recipientId;
    if (!owns) {
      return {
        kind: 'none',
        decision: 'unauthorized',
        reason: role === 'worker' ? 'not_assigned' : 'not_owner',
        contactedApns: false,
      };
    }
  } else {
    const auth = authorizeDispatch({ task, role, userId: recipientId });
    if (!auth.ok) {
      return { kind: 'none', decision: 'unauthorized', reason: auth.reason, contactedApns: false };
    }
  }

  const state = await readState(base44, { recipientId, taskId: task.id, role });
  const { tokens, timeZone, bundleId, categories, settings } = await loadSnapshotInputs(base44, {
    task,
    recipientId,
    config,
    categories: preloadedCategories,
  });

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
    // Planning runs for a tracked recipient even while the GLOBAL flag is off:
    // that is what the allowlist means. The APNs decision below is still the
    // real configuration's, per recipient.
    config: { ...config, enabled: true },
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
  const maySend = mode === 'dispatch' && mayContactApnsFor(config, recipientId) && credentials.missing.length === 0;
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