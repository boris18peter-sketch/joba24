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
import { buildPushToStartPayload } from './liveActivityPushToStart.ts';
import { isTrackedRecipient, mayContactApnsFor } from './liveActivityConfig.ts';

export const DISPATCH_ROLES = ['publisher', 'worker'];

/* ══════════════════════════════════════════════════════════════════════════
   THE AUDIT — every outcome, not only the ones that reached Apple
   ══════════════════════════════════════════════════════════════════════════
   A dispatch that decided "skip" used to leave no trace at all: the early
   returns (no token, not tracked, unauthorized, duplicate, stale) wrote nothing,
   so the audit table showed a healthy history while a card silently received
   nothing. That is unreadable as evidence — the one question an operator asks
   ("why didn't this update arrive?") had no row to answer it.

   Every outcome is recorded now, with the reason and a timestamp. The row never
   contains a token: `token_id` is the row's id, never the hex value itself.
   Never throws — an audit failure must not fail a dispatch.
*/
const AUDIT_EVENTS = ['start', 'update', 'end'];
const AUDIT_ENVIRONMENTS = ['development', 'production'];

export async function recordDispatchOutcome(base44, input) {
  const {
    recipientId,
    taskId,
    role,
    event = 'update',
    revision = 0,
    phase = '',
    decision = '',
    status = 'skipped',
    reason = '',
    environment = '',
    apnsStatus = null,
    apnsId = '',
    errorCategory = '',
    tokenId = '',
    attempts = 0,
  } = input || {};

  if (!recipientId || !taskId || !role) return null;

  const row: any = {
    user_id: recipientId,
    task_id: taskId,
    role,
    revision: Number(revision) || 0,
    event: AUDIT_EVENTS.includes(event) ? event : 'update',
    phase: phase || '',
    status,
    decision: decision || '',
    reason: String(reason || '').slice(0, 200),
    error_category: errorCategory || '',
    attempts,
    dispatched_at: new Date().toISOString(),
  };
  if (AUDIT_ENVIRONMENTS.includes(environment)) row.environment = environment;
  if (tokenId) row.token_id = tokenId;
  if (apnsStatus != null) row.apns_status = apnsStatus;
  if (apnsId) row.apns_id = apnsId;

  return base44.asServiceRole.entities.LiveActivityDispatch.create(row).catch(() => null);
}

/* ══════════════════════════════════════════════════════════════════════════
   THE REVISION CLAIM — one push per revision, whoever gets there first
   ══════════════════════════════════════════════════════════════════════════
   Dispatch is triggered by Task entity events, and one task write often raises
   two events in the same second (the status change, then the applicant
   projection). Both dispatches read the state row before either had committed,
   both decided "send", and both pushed — the audit table is full of pairs 20ms
   apart, which is the opposite of the "one revision is never dispatched twice"
   guarantee.

   A start was already claimed; a CONTENT UPDATE and an END were not. This claims
   them the same way, with a compare-and-set that needs no extra infrastructure:

     · the runner writes its own random `claim_id` together with the target
       revision, and the write is FILTERED on the previous revision — so the
       second runner's update matches nothing;
     · it then re-reads the row: whoever's `claim_id` survived owns the revision,
       and everyone else backs off without touching APNs.

   A claim that delivered nothing (no token, no credentials, a failed send, a dry
   run) is RELEASED back to the previous revision, so a failure never swallows
   the next legitimate update — and a later event simply claims the next revision,
   which the device accepts because revisions are monotonic.
*/
export const CLAIM_TTL_MS = 120000;

export async function claimDispatchRevision(base44, input) {
  const {
    state = null,
    recipientId,
    taskId,
    role,
    taskStatus = '',
    targetRevision,
    now = Date.now(),
  } = input || {};

  const claimId = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const at = new Date(now).toISOString();
  const previous = Math.max(0, Math.floor(Number(state?.revision) || 0));

  // A claim another run is still holding is respected — for a bounded time, so a
  // crashed dispatch can never block this pair for good.
  if (state?.claim_id) {
    const heldSince = Date.parse(state.claim_at || '') || 0;
    if (now - heldSince < CLAIM_TTL_MS) {
      return { claimed: false, claimId, previous, reason: 'claim_in_flight' };
    }
  }

  if (state?.id) {
    const claimed = await base44.asServiceRole.entities.LiveActivityState.updateMany(
      { id: state.id, revision: previous },
      {
        $set: {
          revision: targetRevision,
          claim_id: claimId,
          claim_at: at,
          last_decision: 'send_claimed',
        },
      },
    ).catch(() => null);

    // ── THE WRITE IS THE VERDICT; THE READ-BACK IS ONLY A SECOND CHECK ─────
    // The filter carries the revision this run expects, so the datastore
    // evaluates it as part of the write: once one run has moved the revision, a
    // second run's condition no longer matches and its write reports
    // `updated: 0`. Measured on this app's own datastore — four simultaneous
    // conditional updates on one row returned exactly one `updated: 1` and three
    // `updated: 0` — so the refusal happens at the write, not afterwards.
    //
    // That distinction is the whole point: a read-back alone cannot prove
    // exclusivity, because a lagging read may answer with this run's own claim
    // id and let two runs both push. The write result cannot be stale.
    if (!claimed || Number(claimed.updated) === 0) {
      return { claimed: false, claimId, previous, reason: 'concurrent_dispatch' };
    }
  } else {
    await base44.asServiceRole.entities.LiveActivityState.create({
      user_id: recipientId,
      task_id: taskId,
      role,
      revision: targetRevision,
      claim_id: claimId,
      claim_at: at,
      phase: '',
      content_key: '',
      task_status: taskStatus || '',
      terminal: false,
      last_event_at: at,
      last_decision: 'send_claimed',
    }).catch(() => null);
  }

  const page = await base44.asServiceRole.entities.LiveActivityState
    .filter({ user_id: recipientId, task_id: taskId, role }, { limit: 10 })
    .catch(() => ({ items: [] }));
  const rows = page?.items || [];
  const mine = rows.find((row) => row?.claim_id === claimId);
  if (!mine) return { claimed: false, claimId, previous, reason: 'concurrent_dispatch' };

  // Two runs that both found no row each created one. The oldest row wins (the
  // same deterministic tie-break the start claim uses) and the newcomer removes
  // its own row rather than leaving a second state behind.
  if (!state?.id && rows.length > 1) {
    const oldest = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
    if (oldest?.id !== mine.id) {
      await base44.asServiceRole.entities.LiveActivityState.delete(mine.id).catch(() => null);
      return { claimed: false, claimId, previous, reason: 'concurrent_dispatch' };
    }
  }

  return { claimed: true, claimId, previous, stateId: mine.id, state: mine };
}

/** Give a claim back: nothing was delivered, so the revision is free again. */
async function releaseDispatchClaim(base44, input) {
  const { stateId, claimId, previousRevision, now = Date.now() } = input || {};
  if (!stateId || !claimId) return;
  await base44.asServiceRole.entities.LiveActivityState.updateMany(
    { id: stateId, claim_id: claimId },
    {
      $set: {
        revision: Math.max(0, Math.floor(Number(previousRevision) || 0)),
        claim_id: '',
        claim_at: '',
        last_decision: 'claim_released',
        last_event_at: new Date(now).toISOString(),
      },
    },
  ).catch(() => null);
}

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

/**
 * The category chain (service → root) that resolveStatusFlow needs.
 *
 * ── ONE READ INSTEAD OF ONE PER LEVEL ──────────────────────────────────────
 * This walked the tree with a query PER LEVEL (up to six), and it ran for every
 * recipient of every dispatch. The Task already stores `parent_category_key`, so
 * the service and its parent — the only two levels that carry wording in
 * practice — are fetched together in a single read. A deeper parent is still
 * resolved, but only when it is genuinely missing from that first read.
 *
 * This is the largest single reduction in the dispatch path: six sequential
 * round-trips became one.
 */
export async function loadCategoryChain(base44, categoryKey, parentKey = '') {
  const keys = [...new Set([categoryKey, parentKey].filter(Boolean))];
  if (!keys.length) return [];

  const page = await base44.asServiceRole.entities.GlobalCategory
    .filter({ category_key: { $in: keys } }, { limit: 8 })
    .catch(() => ({ items: [] }));
  const byKey = new Map((page?.items || []).map((row) => [row.category_key, row]));

  const rows = [];
  const seen = new Set();
  let current = categoryKey;
  for (let depth = 0; depth < 6 && current && !seen.has(current); depth += 1) {
    seen.add(current);
    let row = byKey.get(current);
    if (!row) {
      const one = await base44.asServiceRole.entities.GlobalCategory
        .filter({ category_key: current }, { limit: 1 })
        .catch(() => ({ items: [] }));
      row = (one?.items || [])[0];
    }
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
  const {
    task,
    role = '',
    recipientId,
    config,
    categories: preloaded = null,
    settings: preloadedSettings = null,
  } = input || {};

  const tokenPage = await base44.asServiceRole.entities.LiveActivityToken
    .filter({ user_id: recipientId }, { limit: 50 })
    .catch(() => ({ items: [] }));

  // ── ADDRESS THIS CARD, NOT EVERY CARD THIS USER HAS ──────────────────────
  // A phone can show the publisher's card and the worker's card at once (and a
  // second job alongside either), so an activity token is selected by the card
  // it belongs to — (task, role) — never by "any active token of this user".
  const tokens = eligibleTokens(tokenPage?.items || [], {
    userId: recipientId,
    environment: config?.environment,
    limit: config?.max_tokens_per_dispatch,
    taskId: task?.id || '',
    role,
  });
  // The install's Push-to-Start tokens, from the same read. Only a `start` push
  // goes here; every update and end stays on the activity tokens above. A start
  // token belongs to the install rather than to a card, so it is not scoped.
  const startTokens = eligibleTokens(tokenPage?.items || [], {
    userId: recipientId,
    environment: config?.environment,
    limit: config?.max_tokens_per_dispatch,
    kind: 'start',
  });

  // ── NO TOKEN, NO SNAPSHOT ────────────────────────────────────────────────
  // A recipient holding neither an activity nor a start token cannot be reached
  // by anything, yet the category chain and the platform settings — the two most
  // expensive reads in the whole pipeline — used to be fetched for them anyway,
  // on EVERY task event, before the dispatcher discovered there was nothing to
  // address. That is the steady state of a phone that has not registered yet,
  // and it ran for both sides of every task.
  if (!tokens.length && !startTokens.length) {
    return {
      tokens: [],
      startTokens: [],
      timeZone: undefined,
      bundleId: readApnsCredentials().bundleId,
      categories: [],
      settings: {},
    };
  }

  const [categories, settingsPage] = await Promise.all([
    preloaded
      ? Promise.resolve(preloaded)
      : loadCategoryChain(base44, task?.category, task?.parent_category_key || ''),
    preloadedSettings
      ? Promise.resolve({ items: [preloadedSettings] })
      : base44.asServiceRole.entities.JobaSettings.list({ sort: '-updated_date', limit: 1 }).catch(() => ({ items: [] })),
  ]);

  const firstToken = tokens[0] || startTokens[0];
  return {
    tokens,
    startTokens,
    timeZone: firstToken?.timezone || undefined,
    bundleId: firstToken?.bundle_id || readApnsCredentials().bundleId,
    categories,
    settings: (settingsPage?.items || [])[0] || {},
  };
}

/** The stored state row for one (user, task, role). */
async function readState(base44, { recipientId, taskId, role }) {
  const page = await base44.asServiceRole.entities.LiveActivityState
    // Newest first: if a pair ever ends up with more than one row, the one that
    // was actually committed is the authority, never an older claim.
    .filter({ user_id: recipientId, task_id: taskId, role }, { limit: 1, sort: '-updated_date' })
    .catch(() => ({ items: [] }));
  return (page?.items || [])[0] || null;
}

/**
 * CLAIM the right to start this pair, before anything is sent.
 *
 * ── WHY A CLAIM AND NOT JUST A READ ────────────────────────────────────────
 * A task is usually written more than once within a second (create, then its
 * translations, then a price bump), and each write triggers a dispatch. Both runs
 * would read "no state yet", both would push `event: "start"`, and iOS would show
 * TWO cards for one job — which is exactly what must not happen.
 *
 * So a start takes a slot first: revision 1, `last_decision: 'start_claimed'`.
 * The second run's pre-read sees it and backs off. If two runs still manage to
 * claim at the same instant, the tie is broken deterministically by row id — the
 * lower id wins and the other deletes its own claim — so exactly one card is ever
 * pushed, whatever the interleaving.
 *
 * A claim is NOT a delivery: `start_released` (or revision 0) is written back when
 * nothing was actually sent, so a failed attempt never blocks the next one.
 */
async function claimStartState(base44, { recipientId, taskId, role, taskStatus, now }) {
  const existing = await readState(base44, { recipientId, taskId, role });
  if (existing) {
    const revision = Number(existing.revision) || 0;
    if (revision > 0 || existing.terminal) return { claimed: false, revision };
    // ── A RELEASED SLOT IS FREE AGAIN ──────────────────────────────────────
    // `start_released` writes revision 0 precisely so the pair is startable
    // again. Treating that row as "already claimed" would make one failed
    // attempt permanent, so it is taken over instead.
    const at = new Date(now).toISOString();
    const taken = await base44.asServiceRole.entities.LiveActivityState.update(existing.id, {
      revision: 1,
      terminal: false,
      task_status: taskStatus || '',
      last_decision: 'start_claimed',
      last_event_at: at,
    }).catch(() => null);
    if (!taken?.id) return { claimed: false, revision: 0 };
    return { claimed: true, state: { ...existing, ...taken } };
  }

  const created = await base44.asServiceRole.entities.LiveActivityState.create({
    user_id: recipientId,
    task_id: taskId,
    role,
    revision: 1,
    phase: '',
    content_key: '',
    task_status: taskStatus || '',
    terminal: false,
    last_event_at: new Date(now).toISOString(),
    last_decision: 'start_claimed',
  }).catch(() => null);

  if (!created?.id) return { claimed: false, revision: 0 };

  // ── The tie-break: one winner, decided the same way by every caller ──────
  const page = await base44.asServiceRole.entities.LiveActivityState
    .filter({ user_id: recipientId, task_id: taskId, role }, { limit: 10 })
    .catch(() => ({ items: [] }));
  const claims = (page?.items || [])
    .filter((row) => row?.last_decision === 'start_claimed')
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  if (claims.length > 1 && claims[0].id !== created.id) {
    // This run lost the race: give the slot back and let the winner start it.
    await base44.asServiceRole.entities.LiveActivityState.delete(created.id).catch(() => null);
    return { claimed: false, revision: 1 };
  }

  return { claimed: true, state: created };
}

/** Hand a start claim back: nothing was delivered, so the pair may start again. */
async function releaseStartClaim(base44, state, now) {
  if (!state?.id) return;
  await base44.asServiceRole.entities.LiveActivityState.update(state.id, {
    revision: 0,
    last_decision: 'start_released',
    last_event_at: new Date(now).toISOString(),
  }).catch(() => null);
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
    // A device-applied revision settles any dispatch claim in flight: the
    // dispatcher's post-claim read no longer finds its own id and backs off
    // rather than pushing a revision the phone has already moved past.
    claim_id: '',
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
    claim_id: '',
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
    settings: preloadedSettings = null,
  } = input || {};

  // ── WHERE THE TIME GOES, MEASURED ────────────────────────────────────────
  // The run duration of the calling workflow is not the same thing as the time
  // until Apple is contacted, and the two were being read as one. These two
  // probes separate "our reads" from "the push" from "everything after it", so a
  // slow dispatch can be attributed instead of guessed at.
  const startedAt = Date.now();

  // ── WHO THIS RUN IS FOR ───────────────────────────────────────────────────
  // A recipient the configuration does not cover is refused before any read, so
  // the real-task test allowlist can never widen what production already does.
  if (!isTrackedRecipient(config, recipientId)) {
    await recordDispatchOutcome(base44, {
      recipientId,
      taskId: task?.id,
      role,
      decision: 'disabled',
      status: 'skipped',
      reason: 'recipient_not_tracked',
      environment: config?.environment,
    });
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
      const reason = role === 'worker' ? 'not_assigned' : 'not_owner';
      await recordDispatchOutcome(base44, {
        recipientId, taskId: task.id, role, event: 'end',
        decision: 'unauthorized', status: 'skipped', reason,
        environment: config?.environment,
      });
      return { kind: 'none', decision: 'unauthorized', reason, contactedApns: false };
    }
  } else {
    const auth = authorizeDispatch({ task, role, userId: recipientId });
    if (!auth.ok) {
      await recordDispatchOutcome(base44, {
        recipientId, taskId: task.id, role,
        decision: 'unauthorized', status: 'skipped', reason: auth.reason,
        environment: config?.environment,
      });
      return { kind: 'none', decision: 'unauthorized', reason: auth.reason, contactedApns: false };
    }
  }

  const state = await readState(base44, { recipientId, taskId: task.id, role });
  const { tokens, startTokens, timeZone, bundleId, categories, settings } = await loadSnapshotInputs(base44, {
    task,
    role,
    recipientId,
    config,
    categories: preloadedCategories,
    settings: preloadedSettings,
  });
  const readsDoneAt = Date.now();

  // The one outcome reachable with no snapshot work at all, audited exactly like
  // every other: without it, "why did nothing arrive on my Lock Screen" has no
  // row to answer it.
  if (!tokens.length && !startTokens.length) {
    await recordDispatchOutcome(base44, {
      recipientId,
      taskId: task.id,
      role,
      revision: state?.revision || 0,
      decision: 'no_active_tokens',
      status: 'skipped',
      reason: 'no_tokens_of_any_kind',
      environment: config?.environment,
    });
    return { kind: 'none', decision: 'no_active_tokens', revision: state?.revision || 0, contactedApns: false };
  }

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
    // Recorded, not silent: "duplicate", "stale_revision", "terminal_already_sent"
    // and "disabled" are the answers to most support questions about a card that
    // did not move.
    await recordDispatchOutcome(base44, {
      recipientId,
      taskId: task.id,
      role,
      revision: state?.revision || 0,
      phase: snapshot?.phase || '',
      decision: plan.decision,
      status: 'skipped',
      reason: plan.reason || '',
      environment: config?.environment,
    });
    return {
      kind: 'none',
      decision: plan.decision,
      reason: plan.reason || null,
      revision: state?.revision || 0,
      contactedApns: false,
    };
  }

  // ── REMOTE START: THE ONLY WAY A CARD CAN APPEAR WITH THE APP CLOSED ────
  // Every condition below is required:
  //  • the planner decided this is a CONTENT push (never for an `end`);
  //  • the operator armed Push-to-Start;
  //  • this (user, task, role) has NEVER committed a revision. The state row is
  //    the server's memory of "a card already exists for this pair", so a pair is
  //    started exactly once and every later event is an update. It is also what
  //    makes a LOCAL start and a REMOTE start mutually exclusive: the app's
  //    `begin` writes the row first, after which the server can no longer start
  //    it, and a remote start commits the row, after which the app finds a
  //    running card to update instead of requesting a second one;
  //  • the recipient has a start token — iOS 17.2+ only. An older install never
  //    registers one, so its behaviour is exactly what it was before.
  const remoteStart = plan.kind === 'send'
    && config?.push_to_start === true
    && !(Number(state?.revision) > 0)
    && startTokens.length > 0;

  const targetTokens = remoteStart ? startTokens : tokens;
  if (!targetTokens.length) {
    // ── THE TOKEN RACE, RECORDED ───────────────────────────────────────────
    // This is the case that hid the most: a progress event dispatched while the
    // card's token was still travelling to the server. Nothing is claimed and no
    // revision is consumed, so the reconciliation triggered by the token
    // registration itself (see registerLiveActivityToken) pushes the CURRENT
    // state as soon as the token exists. The row below is what makes that
    // visible instead of looking like the event never happened.
    await recordDispatchOutcome(base44, {
      recipientId,
      taskId: task.id,
      role,
      revision: state?.revision || 0,
      phase: plan.snapshot?.phase || '',
      decision: 'no_active_tokens',
      status: 'skipped',
      reason: remoteStart ? 'no_start_token' : 'no_activity_token',
      environment: config?.environment,
    });
    return { kind: plan.kind, decision: 'no_active_tokens', revision: state?.revision || 0, contactedApns: false };
  }

  const credentials = readApnsCredentials();
  const maySend = mode === 'dispatch' && mayContactApnsFor(config, recipientId) && credentials.missing.length === 0;
  const event = plan.kind === 'end' ? 'end' : (remoteStart ? 'start' : 'update');
  const payload = event === 'start'
    ? buildPushToStartPayload({ snapshot: plan.snapshot, now })
    : buildLiveActivityPush({ snapshot: plan.snapshot || { id: task.id, role, revision: plan.revision }, event });

  // A start payload that cannot be built safely is not sent half-formed: the
  // device starts the card itself the next time the app runs.
  if (!payload) {
    await recordDispatchOutcome(base44, {
      recipientId, taskId: task.id, role, event,
      revision: state?.revision || 0,
      decision: 'no_snapshot', status: 'skipped',
      reason: 'start_payload_unavailable',
      environment: config?.environment,
    });
    return {
      kind: 'none',
      decision: 'no_snapshot',
      reason: 'start_payload_unavailable',
      revision: state?.revision || 0,
      contactedApns: false,
    };
  }

  // ── ONE PUSH PER REVISION: THE SLOT IS TAKEN BEFORE APPLE IS CONTACTED ──
  // A start already claims its own slot below. A CONTENT UPDATE and an END did
  // not, which is why the audit table holds pairs of identical pushes 20ms
  // apart: the status change and the applicant projection raise two Task events,
  // both dispatches read the state row before either committed, and both sent.
  // The claim closes that window; the loser records "duplicate" and sends nothing.
  let revisionClaim = null;
  if (!remoteStart && (plan.kind === 'send' || plan.kind === 'end')) {
    revisionClaim = await claimDispatchRevision(base44, {
      state,
      recipientId,
      taskId: task.id,
      role,
      taskStatus: task.status,
      targetRevision: plan.revision,
      now,
    });
    if (!revisionClaim.claimed) {
      await recordDispatchOutcome(base44, {
        recipientId, taskId: task.id, role, event,
        revision: revisionClaim.previous,
        phase: plan.snapshot?.phase || '',
        decision: 'duplicate', status: 'skipped',
        reason: revisionClaim.reason || 'concurrent_dispatch',
        environment: config?.environment,
      });
      return {
        kind: 'none',
        decision: 'duplicate',
        reason: revisionClaim.reason || 'concurrent_dispatch',
        revision: revisionClaim.previous,
        contactedApns: false,
      };
    }
  }

  // ── ONE START PER PAIR: THE SLOT IS TAKEN BEFORE ANYTHING IS SENT ───────
  // A task is often written several times within a second (create, translations,
  // price), and each write triggers a dispatch. Without this, both runs would
  // read "no state yet" and both would push a start — two cards for one job.
  let startClaim = null;
  if (remoteStart) {
    const claim = await claimStartState(base44, {
      recipientId,
      taskId: task.id,
      role,
      taskStatus: task.status,
      now,
    });
    if (!claim.claimed) {
      return {
        kind: 'none',
        decision: 'start_claimed',
        reason: 'another_dispatch_is_starting_it',
        revision: claim.revision || 0,
        contactedApns: false,
      };
    }
    startClaim = claim.state;
  }

  const results = [];
  for (const tokenRow of targetTokens) {
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

  const afterSendAt = Date.now();
  const sent = results.filter((r) => r.result.ok && !r.result.dryRun).length;
  const committed = sent > 0;

  // ── A CLAIM THAT DELIVERED NOTHING IS GIVEN BACK ─────────────────────────
  // A dry run, a missing credential or a failed send must not consume the
  // revision: the next event would then look like a duplicate of something no
  // phone ever received. Releasing restores the previous revision, and the next
  // legitimate update claims it again — so a failure delays a card, it never
  // silences it.
  if (revisionClaim?.claimed && !committed) {
    await releaseDispatchClaim(base44, {
      stateId: revisionClaim.stateId,
      claimId: revisionClaim.claimId,
      previousRevision: revisionClaim.previous,
      now,
    });
  }

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

  // Commit the revision only when something was actually delivered. A start
  // commits onto the row it already claimed, so the pair never ends up with two
  // state rows.
  const committedState = startClaim || (revisionClaim?.claimed ? revisionClaim.state : state);
  const planned = stateAfterPlan({ plan, task, committed, sent, now });
  // The claim is settled by the commit, whichever path produced it.
  const stateFields = planned ? { ...planned, claim_id: '' } : null;
  if (stateFields) {
    if (committedState?.id) {
      await base44.asServiceRole.entities.LiveActivityState.update(committedState.id, stateFields).catch(() => null);
    } else {
      await base44.asServiceRole.entities.LiveActivityState.create({
        user_id: recipientId,
        task_id: task.id,
        role,
        ...stateFields,
      }).catch(() => null);
    }
  }

  // A start that took the slot but delivered nothing gives it back, so the next
  // event can try again instead of the pair being stuck un-startable.
  if (startClaim && !committed) {
    await releaseStartClaim(base44, startClaim, now);
  }

  // One line per dispatch, with the phases separated: `readsMs` is our own
  // datastore work before Apple is contacted, `pushMs` is the APNs call itself,
  // `afterMs` is the audit rows and the revision commit. A workflow run that
  // takes 100s while `pushMs` is 200ms is not a slow dispatch.
  console.info('[liveActivity] dispatch timings', {
    task: task.id,
    role,
    event,
    tokens: targetTokens.length,
    sent,
    readsMs: readsDoneAt - startedAt,
    pushMs: afterSendAt - readsDoneAt,
    afterMs: Date.now() - afterSendAt,
    totalMs: Date.now() - startedAt,
  });

  return {
    kind: plan.kind,
    decision: plan.decision,
    event,
    // True only when this attempt was addressed to the install's start tokens.
    remoteStart,
    revision: plan.revision,
    phase: plan.snapshot?.phase || null,
    tokens: targetTokens.length,
    sent,
    dryRun: results.every((r) => r.result.dryRun),
    failed: results.filter((r) => !r.result.ok).length,
    invalidated: results.filter((r) => shouldInvalidateToken(r.result)).length,
    contactedApns: maySend,
    credentialsMissing: credentials.missing,
  };
}