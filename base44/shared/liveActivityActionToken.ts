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

/** Hard ceiling on a token's life. A caller may ask for less, never more. */
export const ACTION_TOKEN_MAX_TTL_SECONDS = 24 * 60 * 60;

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
  tid: string;
  role: 'publisher' | 'worker';
  actions: string[];
  iat: number;
  exp: number;
};

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
  const requested = Number(input.ttlSeconds) || ACTION_TOKEN_MAX_TTL_SECONDS;
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
  if (!claims.sub || !claims.tid || (claims.role !== 'publisher' && claims.role !== 'worker')) {
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