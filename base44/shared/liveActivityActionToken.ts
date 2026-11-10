/**
 * liveActivityActionToken — the ONLY credential a Lock Screen action carries.
 *
 * ── THE PROBLEM THIS SOLVES ────────────────────────────────────────────────
 * A Live Activity button is pressed by an Apple App Intent, which runs in the
 * WIDGET EXTENSION process: no WebView, no Capacitor bridge, no user session.
 * It has to reach the backend, and it must do so without the app being open.
 *
 * ── THE SMALLEST SAFE SOLUTION ─────────────────────────────────────────────
 * A bearer session token in a widget would be far too much authority: it would
 * act as the user everywhere, for as long as it lives. So the app asks the
 * server for a NARROW CAPABILITY instead, at the moment it starts or refreshes
 * an activity:
 *
 *   • bound to ONE user, ONE task and ONE role;
 *   • listing only the action ids that role may ever perform on that task;
 *   • expiring on its own (24h), and never renewable from the device;
 *   • signed with HMAC-SHA256 under a server-only secret, so it cannot be
 *     forged, edited or extended by anyone who reads it.
 *
 * The token is NOT a credential to the app: it cannot read data, it cannot act
 * on any other task, and it cannot be used for anything except submitting one of
 * the listed actions. Every call re-derives authorization from the database, so
 * a token minted while a task was open cannot approve a task that has since been
 * cancelled, reassigned or completed by someone else.
 *
 * ── WHAT IT IS NEVER USED FOR ──────────────────────────────────────────────
 * It is not placed in the Live Activity content-state, in a push payload, in a
 * log line or in a URL. It lives in the app's own App Group storage, readable
 * only by the app and its own widget extension.
 *
 * ── WHY IT LIVES IN shared/ ────────────────────────────────────────────────
 * Both the minting function and the verifying function must agree byte for byte,
 * and the tests sign and verify with the same code. One implementation, imported
 * by both — never a copy.
 */

export const ACTION_TOKEN_VERSION = 1;

/**
 * Hard ceiling on a token's life. A caller may ask for less, never more.
 *
 * ── WHY 7 DAYS AND NOT 24 HOURS ────────────────────────────────────────────
 * A task can legitimately outlive a day: a babysitting evening that runs late, a
 * plumbing job waiting on a part, a multi-day engagement. With a flat 24h life the
 * worker's and the publisher's Lock Screen buttons simply stopped working partway
 * through a live task, with no way to renew them from the extension.
 *
 * The ceiling is therefore a week — and, in practice, `ttlForTask()` below gives a
 * token exactly as long as the task's own horizon plus a margin, never more. The
 * authority a longer token grants is small by construction: it names ONE task,
 * ONE role and that role's single action, and every use is re-authorized against
 * the live record, so an expired task, a reassignment or a cancellation still
 * refuses the action no matter how long the token lives.
 */
export const ACTION_TOKEN_MAX_TTL_SECONDS = 7 * 24 * 60 * 60;

/** The default life. A caller that asks for nothing gets a day. */
export const ACTION_TOKEN_DEFAULT_TTL_SECONDS = 24 * 60 * 60;

/** How far past a task's own horizon a capability may reach. */
const TASK_HORIZON_MARGIN_SECONDS = 12 * 60 * 60;

/**
 * The life a capability should get for THIS task.
 *
 * ── THE RENEWAL PROBLEM, AND WHY THIS IS THE ANSWER ────────────────────────
 * Only the app can mint (it is the only process with a session), and a running
 * activity's next tap may happen while the app is closed. So the capability must
 * already be long enough when it is minted: it is sized to the task's own
 * `expires_at` / `scheduled_time` plus a margin, with a one-day floor and the
 * weekly ceiling above. A task with no horizon keeps the plain 24h.
 */
/**
 * The absolute URL a card's tap posts to.
 *
 * ONE constant, shared by the server that hands the capability out and by the
 * clients that store it: the App Intent on iOS and the broadcast receiver on
 * Android both call this exact endpoint. A native shell has no https origin of its
 * own (`capacitor://localhost`), which is why only an absolute public URL works
 * from both.
 */
export const ACTION_ENDPOINT = 'https://joba24.com/functions/liveActivityAction';

export function ttlForTask(task, now = Date.now()) {
  const base = ACTION_TOKEN_DEFAULT_TTL_SECONDS;
  if (!task) return base;
  const nowMs = Number(now);
  const horizons = [task.expires_at, task.scheduled_time]
    .map((value) => Date.parse(String(value || '')))
    .filter((ms) => Number.isFinite(ms) && ms > nowMs);
  if (!horizons.length) return base;
  const seconds = Math.ceil((Math.max(...horizons) - nowMs) / 1000) + TASK_HORIZON_MARGIN_SECONDS;
  return Math.max(base, Math.min(seconds, ACTION_TOKEN_MAX_TTL_SECONDS));
}

const encoder = new TextEncoder();

/* ── base64url (no padding), usable in Deno and Node alike ─────────────────── */

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.length % 4 === 0 ? value : value + '='.repeat(4 - (value.length % 4));
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** A comparison whose duration does not depend on where the first difference is. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacBase64url(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64url(new Uint8Array(signature));
}

export type ActionTokenClaims = {
  v: number;
  sub: string;
  /** Absent on a USER-scoped capability, which names no task. */
  tid?: string;
  /** Absent on a USER-scoped capability. */
  role?: 'publisher' | 'worker';
  /**
   * 'user' marks a capability minted for the INSTALL rather than for one card.
   * See `signUserActionToken` for why it exists and what bounds it.
   */
  scope?: 'user';
  actions: string[];
  iat: number;
  exp: number;
};

/**
 * How long an INSTALL-scoped capability may live.
 *
 * ── THE PROBLEM ────────────────────────────────────────────────────────────
 * A card started by a Push-to-Start push appears while the app is CLOSED, so no
 * session ever existed to mint the per-card capability the button needs. The
 * button would then be dead until the user happened to open the app — for every
 * new task.
 *
 * ── THE BOUNDED ANSWER ─────────────────────────────────────────────────────
 * The app also mints ONE capability per install, whenever it runs, that names no
 * task and carries only the two action ids a card can offer. When a tap uses it,
 * the request must ALSO carry the card's own task and role, and the endpoint
 * re-derives ownership from that record before anything happens — so this token
 * is not a key to a task, it is permission to ASK about a task as one user.
 *
 * Its life is deliberately much shorter than a per-task capability's (twelve
 * hours, not a week): it is refreshed on every app launch, so a long window buys
 * nothing, and a stolen value stops being usable the same day. It grants no
 * reads, no lookups and no other action id, and it is never put in a push
 * payload — only in the app's own App Group.
 */
export const USER_SCOPE_TTL_SECONDS = 12 * 60 * 60;

/**
 * Mint a capability token.
 *
 * `actions` is an allow-list of action ids; it is NOT a statement that the action
 * is currently allowed — the executing function re-checks that against the task.
 */
export async function signActionToken(input: {
  secret: string;
  userId: string;
  taskId: string;
  role: 'publisher' | 'worker';
  actions: string[];
  ttlSeconds?: number;
  now?: number;
}): Promise<{ ok: boolean; token?: string; claims?: ActionTokenClaims; reason?: string }> {
  const { secret, userId, taskId, role, actions } = input || ({} as any);
  if (!secret) return { ok: false, reason: 'no_secret' };
  if (!userId || !taskId) return { ok: false, reason: 'missing_binding' };
  if (!Array.isArray(actions) || !actions.length) return { ok: false, reason: 'missing_actions' };

  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  // No request = the plain day. A request is clamped to the weekly ceiling.
  const requested = Number(input.ttlSeconds) || ACTION_TOKEN_DEFAULT_TTL_SECONDS;
  const ttl = Math.max(60, Math.min(requested, ACTION_TOKEN_MAX_TTL_SECONDS));

  const claims: ActionTokenClaims = {
    v: ACTION_TOKEN_VERSION,
    sub: String(userId),
    tid: String(taskId),
    role,
    actions: actions.map(String),
    iat: nowSeconds,
    exp: nowSeconds + ttl,
  };

  const payload = base64url(encoder.encode(JSON.stringify(claims)));
  const signature = await hmacBase64url(secret, payload);
  return { ok: true, token: `v${ACTION_TOKEN_VERSION}.${payload}.${signature}`, claims };
}

/**
 * Mint an INSTALL-scoped capability: one user, no task, the given action ids.
 *
 * The signature and the expiry rules are the per-task token's own — this is the
 * same format and the same secret, with `scope: 'user'` and no `tid`, so the
 * verifier can refuse a call that names no task instead of guessing one.
 */
export async function signUserActionToken(input: {
  secret: string;
  userId: string;
  actions: string[];
  ttlSeconds?: number;
  now?: number;
}): Promise<{ ok: boolean; token?: string; claims?: ActionTokenClaims; reason?: string }> {
  const { secret, userId, actions } = input || ({} as any);
  if (!secret) return { ok: false, reason: 'no_secret' };
  if (!userId) return { ok: false, reason: 'missing_binding' };
  if (!Array.isArray(actions) || !actions.length) return { ok: false, reason: 'missing_actions' };

  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  // No request = the install default; a request is clamped to that same ceiling,
  // never above it, so no caller can mint a longer-lived install capability.
  const requested = Number(input.ttlSeconds) || USER_SCOPE_TTL_SECONDS;
  const ttl = Math.max(60, Math.min(requested, USER_SCOPE_TTL_SECONDS));

  const claims: ActionTokenClaims = {
    v: ACTION_TOKEN_VERSION,
    sub: String(userId),
    scope: 'user',
    actions: actions.map(String),
    iat: nowSeconds,
    exp: nowSeconds + ttl,
  };

  const payload = base64url(encoder.encode(JSON.stringify(claims)));
  const signature = await hmacBase64url(secret, payload);
  return { ok: true, token: `v${ACTION_TOKEN_VERSION}.${payload}.${signature}`, claims };
}

/**
 * Verify a token. Never throws; every failure is a named reason so the caller can
 * answer honestly instead of failing open.
 */
export async function verifyActionToken(input: {
  secret: string;
  token: string;
  now?: number;
}): Promise<{ ok: boolean; claims?: ActionTokenClaims; reason?: string }> {
  const secret = input?.secret;
  const token = typeof input?.token === 'string' ? input.token.trim() : '';
  if (!secret) return { ok: false, reason: 'no_secret' };
  if (!token) return { ok: false, reason: 'missing_token' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [prefix, payload, signature] = parts;
  if (prefix !== `v${ACTION_TOKEN_VERSION}`) return { ok: false, reason: 'unsupported_version' };

  const expected = await hmacBase64url(secret, payload);
  if (!timingSafeEqual(expected, signature)) return { ok: false, reason: 'bad_signature' };

  let claims: ActionTokenClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!claims || claims.v !== ACTION_TOKEN_VERSION) return { ok: false, reason: 'unsupported_version' };
  // An install-scoped capability names NO task: the card's own task arrives with
  // the request and is authorized against the record. Everything else must carry
  // its task binding, exactly as before.
  const userScope = claims.scope === 'user';
  if (!claims.sub) return { ok: false, reason: 'malformed' };
  if (!userScope && (!claims.tid || (claims.role !== 'publisher' && claims.role !== 'worker'))) {
    return { ok: false, reason: 'malformed' };
  }
  if (!Array.isArray(claims.actions) || !claims.actions.length) return { ok: false, reason: 'malformed' };

  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  if (!Number.isFinite(claims.exp) || claims.exp <= nowSeconds) return { ok: false, reason: 'expired' };
  // A token issued in the future is not ours to trust: clocks drift by seconds,
  // never by minutes, so anything beyond that is a tampered payload.
  if (Number.isFinite(claims.iat) && claims.iat > nowSeconds + 120) return { ok: false, reason: 'not_yet_valid' };

  return { ok: true, claims };
}