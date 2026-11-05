/**
 * liveActivityAuth — every identity and authorization decision for the Live
 * Activity pipeline lives here.
 *
 * ── THE ONE RULE ───────────────────────────────────────────────────────────
 * The RECIPIENT IS THE AUTHENTICATED USER. A client may describe itself, its
 * token and its timezone; it may never nominate whose activity it is. Any
 * `user_id` in a request body is treated as a claim that must match the session,
 * and a mismatch is refused — never used, never "repaired".
 *
 * Task authorization is always re-derived from the stored Task record: the
 * publisher is `task.client_id`, the worker is `task.worker_id`. A role the
 * record does not support is rejected, so a token can never be bound to (or
 * dispatched for) somebody else's task.
 */
import { authorizeActivity } from './taskActivitySnapshot.ts';
import { isValidTimeZone, DEFAULT_TIMEZONE } from './liveActivityFlow.ts';

/** ActivityKit tokens are hex; the bound is generous but excludes junk. */
export const TOKEN_PATTERN = /^[0-9a-fA-F]{32,400}$/;
export const ENVIRONMENTS = ['development', 'production'];
export const ROLES = ['publisher', 'worker'];

/**
 * Which ActivityKit token an row holds.
 *
 *   activity — Apple's per-activity token, issued once a card exists. Updates and
 *              end go here. It cannot start anything.
 *   start    — the install's Push-to-Start token (iOS 17.2+). A `start` push makes
 *              a card APPEAR on a phone whose app is closed. It cannot update one.
 *
 * They are different values from different APIs, so they are kept apart at every
 * step: registration, retirement and dispatch. Mixing them is not a security bug
 * but a silent delivery failure — APNs rejects a token that is not the type its
 * payload assumes.
 */
export const TOKEN_KINDS = ['activity', 'start'];

/** Missing means `activity`, so every row written before start tokens existed keeps its meaning. */
export function normalizeTokenKind(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return TOKEN_KINDS.includes(value) ? value : 'activity';
}

/** The server-side recipient identity. Client-supplied ids are never used. */
export function resolveRecipient(user) {
  if (!user || typeof user.id !== 'string' || !user.id) return null;
  return { userId: user.id, role: user.role === 'admin' ? 'admin' : 'user' };
}

/** Normalize a client token string without trusting it. */
export function normalizeToken(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

export function validateEnvironment(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return ENVIRONMENTS.includes(value) ? value : null;
}

/**
 * Plan a token registration/rotation.
 *
 * Pure: it decides what the caller should write, given the authenticated user,
 * the request body, the token rows already stored and the task (loaded by the
 * server, never by the client). The caller performs the writes.
 */
export function planTokenRegistration(input) {
  const { user, body = {}, existingTokens = [], task = null } = input || {};

  const who = resolveRecipient(user);
  if (!who) return { ok: false, status: 401, reason: 'unauthenticated' };

  // A client-supplied identity is only ever a claim to be checked.
  const claimed = body.user_id ?? body.userId ?? body.claimed_user_id;
  if (claimed != null && String(claimed) !== who.userId) {
    return { ok: false, status: 403, reason: 'foreign_identity' };
  }

  const token = normalizeToken(body.token);
  if (!TOKEN_PATTERN.test(token)) return { ok: false, status: 400, reason: 'invalid_token' };

  // ── WHICH TOKEN IS THIS ─────────────────────────────────────────────────
  // Absent means `activity` (every client built before Push-to-Start). A value
  // that is present but not recognised is refused rather than coerced: silently
  // filing a start token as an activity token would make every update to it fail
  // at APNs with no clue why.
  if (body.kind != null && String(body.kind).trim() && !TOKEN_KINDS.includes(String(body.kind).trim().toLowerCase())) {
    return { ok: false, status: 400, reason: 'invalid_kind' };
  }
  const kind = normalizeTokenKind(body.kind);

  const environment = validateEnvironment(body.environment);
  if (!environment) return { ok: false, status: 400, reason: 'invalid_environment' };

  const rawZone = body.timezone;
  if (rawZone != null && String(rawZone).trim() && !isValidTimeZone(String(rawZone).trim())) {
    return { ok: false, status: 400, reason: 'invalid_timezone' };
  }
  const timezone = rawZone && String(rawZone).trim() ? String(rawZone).trim() : DEFAULT_TIMEZONE;

  // ── Optional task binding ───────────────────────────────────────────────
  // Registering "I am tracking this task" is authorized against the record.
  //
  // The binding is STORED, not merely validated. An ActivityKit token is issued
  // per CARD, so a token with no binding can only be addressed as "one of this
  // user's cards" — which is how a dispatch for one task was delivered to another
  // task's card on a device showing two. The pair (task_id, role) is the card's
  // identity from here on, and dispatch uses it to address exactly that card.
  let boundRole = null;
  let boundTaskId = '';
  if (body.task_id || body.taskId) {
    const taskId = String(body.task_id || body.taskId);
    boundRole = body.role;
    if (!ROLES.includes(boundRole)) return { ok: false, status: 400, reason: 'invalid_role' };
    if (!task || task.id !== taskId) return { ok: false, status: 404, reason: 'task_not_found' };

    const auth = authorizeActivity(task, boundRole, who.userId);
    if (!auth.ok) return { ok: false, status: 403, reason: 'unauthorized_task', detail: auth.reason };
    boundTaskId = taskId;
  }

  // ── Token ownership ─────────────────────────────────────────────────────
  // Matched on the SAME kind: the same hex value would never be issued for both,
  // and a mismatch here would let one kind overwrite the other's row.
  const owners = existingTokens.filter((row) => row
    && row.token === token
    && normalizeTokenKind(row.kind) === kind);
  const foreign = owners.find((row) => row.user_id && row.user_id !== who.userId);
  if (foreign) {
    // A token belongs to the device that Apple issued it to. Never move it.
    return { ok: false, status: 409, reason: 'token_owned_by_other_user' };
  }

  const own = owners.find((row) => row.user_id === who.userId) || null;
  let action = 'create';
  if (own) action = own.environment === environment ? 'refresh' : 'rotate';

  // A device that reports the same install id has superseded its older tokens —
  // of the SAME kind only. Rotating a start token must never retire the activity
  // token of a card that is on screen right now, and vice versa.
  const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
  // ── ROTATION IS SCOPED TO THE CARD, NOT THE INSTALL ────────────────────────
  // Retiring every active token of this kind on the install was correct only
  // while a phone could show ONE card. It now shows two at once (the publisher's
  // and the worker's, and a second job alongside either), so the publisher's app
  // starting a card retired the WORKER card's token of a different task — that
  // card then stopped updating although nothing was wrong with it.
  //
  // Only the previous incarnation of THIS card is retired: the same (task, role)
  // binding. A row with no binding predates binding entirely and is still
  // superseded by this install's newer token of the same kind.
  const sameCard = (row) => {
    const rowTask = String(row.task_id || '').trim();
    if (!rowTask) return true;
    if (!boundTaskId) return false;
    return rowTask === boundTaskId && String(row.role || '') === String(boundRole || '');
  };
  // ── A CARD HAS ONE TOKEN, WHOEVER REGISTERED IT ───────────────────────────
  // Matching on `device_id` retired a rotated token only when the client kept
  // the same install id, and a build that omitted it (or generated a new one)
  // left the previous token ACTIVE beside the new one. Both then received every
  // dispatch — two audit rows per push, twice the APNs traffic, and a stale token
  // kept "succeeding" long after the card it belonged to was gone.
  //
  // A token that is bound to a card is therefore superseded by ANY newer active
  // token of the same kind for that SAME card, whatever install id it carries.
  // An unbound token keeps the install-scoped rule, which is all it can be
  // matched on.
  const sameBoundCard = (row) => String(row.task_id || '').trim() === boundTaskId
    && String(row.role || '') === String(boundRole || '');

  const retire = existingTokens
    .filter((row) => row
      && row.user_id === who.userId
      && row.token !== token
      && normalizeTokenKind(row.kind) === kind
      && row.status === 'active'
      && (boundTaskId
        ? sameBoundCard(row)
        : (!!deviceId && row.device_id === deviceId && sameCard(row))))
    .map((row) => row.id);

  const platform = 'ios';
  const record = {
    user_id: who.userId,
    token,
    kind,
    // The card this token addresses. OMITTED — never written as an empty string
    // — when the client registered without a task (a legacy build, or a token
    // minted before a task existed), so the enum field is only ever given one of
    // its own values. An absent binding reads as "unbound".
    ...(boundTaskId ? { task_id: boundTaskId, role: boundRole } : {}),
    environment,
    bundle_id: typeof body.bundle_id === 'string' ? body.bundle_id.trim() : '',
    platform,
    device_id: deviceId,
    timezone,
    app_version: typeof body.app_version === 'string' ? body.app_version.trim() : '',
    status: 'active',
    failure_count: 0,
    last_seen_at: new Date(input.now || Date.now()).toISOString(),
  };

  return {
    ok: true,
    action,
    existingId: own?.id || null,
    retireTokenIds: retire,
    taskRole: boundRole,
    record,
  };
}

/**
 * The single dispatch-side authorization: the task record must still belong to
 * this recipient in this role. Re-checked on every dispatch, never assumed from
 * the registration that created the binding.
 */
export function authorizeDispatch({ task, role, userId }) {
  return authorizeActivity(task, role, userId);
}

/**
 * Which stored tokens may receive this dispatch: this recipient's own and active
 * — preferring those registered for the environment the configuration targets.
 * Never another user's token.
 *
 * ── WHY IT FALLS BACK INSTEAD OF RETURNING NOTHING ─────────────────────────
 * This used to drop every token whose environment differed from the single
 * configured value, so a config left on `development` while the testers ran a
 * TestFlight build (production tokens) produced `no_active_tokens` for EVERY
 * dispatch. That is indistinguishable, from the user's side, from "the Lock
 * Screen simply never updates" — and it was exactly the asymmetry that made the
 * worker's card move (their own taps update it locally) while the publisher's
 * did not (theirs can only arrive by push).
 *
 * The host is chosen PER TOKEN from the row's own `environment` when the push is
 * sent (`sendLiveActivityPush`), so a token is never delivered to the wrong APNs
 * host by including it here. A token Apple rejects is retired by the caller. So
 * when the configured environment matches nothing, this recipient's own active
 * tokens are used rather than silence.
 */
export function eligibleTokens(tokens, { userId, environment, limit = 20, kind = 'activity', taskId = '', role = '' }) {
  if (!Array.isArray(tokens) || !userId) return [];
  // Kind first: a `start` push addressed to an activity token (or the reverse)
  // is rejected by APNs, so the two sets are never allowed to mix.
  const own = tokens.filter((row) => row
    && row.status === 'active'
    && row.user_id === userId
    && normalizeTokenKind(row.kind) === kind);

  // ── ONE CARD, NOT EVERY CARD ──────────────────────────────────────────────
  // An activity token belongs to ONE card, and a phone can show two at the same
  // time. Selecting "every active activity token this user has" therefore pushed
  // task A's content-state to task B's card, which is exactly how the Lock
  // Screen and the app ended up disagreeing about the same job.
  //
  //   • a token bound to this (task, role) is the card being addressed;
  //   • a row with NO binding predates binding and is still eligible, so an
  //     install that has not re-registered keeps updating as before — but only
  //     when this card has no bound token of its own, so a bound card is never
  //     shadowed by a legacy row;
  //   • a token bound to a DIFFERENT task is never used, whatever else is found.
  let forCard = own;
  if (taskId && role) {
    const bound = own.filter((row) => String(row.task_id || '').trim() === taskId
      && String(row.role || '') === role);
    const unbound = own.filter((row) => !String(row.task_id || '').trim());
    forCard = bound.length > 0 ? bound : unbound;
  }

  const matched = environment ? forCard.filter((row) => row.environment === environment) : forCard;
  const chosen = matched.length > 0 ? matched : forCard;
  return chosen.slice(0, limit > 0 ? limit : 20);
}