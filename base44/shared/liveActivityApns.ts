/**
 * liveActivityApns — provider-token auth and the one HTTP call, and nothing else.
 *
 * ── WHY THIS FILE IS SO SMALL ──────────────────────────────────────────────
 * It is the only place in the pipeline that touches the network, which is what
 * makes "no dispatch while disabled" a property of ONE call site: if this
 * function is not invoked, no request exists. The dispatch function reaches it
 * only after both locks (enabled, not dry_run) are lifted, and only for a token
 * that already passed the recipient's own authorization.
 *
 * ── CREDENTIALS ────────────────────────────────────────────────────────────
 * Token-based (p8) auth, read from environment secrets at call time — never
 * stored in the database, never logged, never returned to a client:
 *   APNS_KEY_ID        the 10-character key id from Apple
 *   APNS_TEAM_ID       the Apple developer team id
 *   APNS_PRIVATE_KEY   the .p8 contents (PKCS#8 PEM)
 *   APNS_BUNDLE_ID     the app bundle id the topic is derived from
 * A missing credential is a normal, reported outcome: the push is skipped with
 * `missing_credentials` and nothing is attempted.
 */

const TOKEN_TTL_MS = 50 * 60 * 1000; // Apple rejects provider tokens older than 1h.
let cache = { key: '', jwt: '', at: 0 };

/** Test seam: forget the cached JWT. */
export function resetProviderTokenCache() {
  cache = { key: '', jwt: '', at: 0 };
}

function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToB64url(value) {
  return bytesToB64url(new TextEncoder().encode(value));
}

function pemToPkcs8(pem) {
  const body = String(pem)
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** The ES256 JWT APNs expects, reused for up to 50 minutes. */
export async function buildProviderToken(input) {
  const { keyId, teamId, privateKeyPem, now = Date.now() } = input || {};
  if (!keyId || !teamId || !privateKeyPem) throw new Error('missing APNs credentials');

  const cacheKey = `${teamId}:${keyId}`;
  if (cache.jwt && cache.key === cacheKey && now - cache.at < TOKEN_TTL_MS) return cache.jwt;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(privateKeyPem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const header = stringToB64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = stringToB64url(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) }));
  const signingInput = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${bytesToB64url(new Uint8Array(signature))}`;
  cache = { key: cacheKey, jwt, at: now };
  return jwt;
}

export function apnsHostFor(environment) {
  return environment === 'production' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com';
}

/** Live Activity pushes use their own topic suffix. */
export function apnsTopicFor(bundleId) {
  const base = String(bundleId || '').trim();
  return base.endsWith('.push-type.liveactivity') ? base : `${base}.push-type.liveactivity`;
}

/**
 * The ActivityKit payload.
 *
 * `content-state` is the frozen Stage 0 snapshot: the iOS widget decodes exactly
 * the fields the contract defines, so no presentation decision is made here.
 * `joba` carries the ordering metadata the app-side reconciler uses.
 */
export function buildLiveActivityPush(input) {
  const {
    snapshot,
    event = 'update',
    now = Date.now(),
    staleAfterMinutes = 30,
    dismissalAfterMinutes = 240,
  } = input || {};

  const aps: any = {
    timestamp: Math.floor(now / 1000),
    event,
    'content-state': snapshot,
  };

  if (event === 'end') {
    aps['dismissal-date'] = Math.floor((now + dismissalAfterMinutes * 60000) / 1000);
  } else {
    aps['stale-date'] = Math.floor((now + staleAfterMinutes * 60000) / 1000);
  }

  return {
    aps,
    joba: {
      taskId: snapshot?.id || '',
      role: snapshot?.role || '',
      revision: snapshot?.revision || 0,
      contractVersion: snapshot?.contractVersion || 0,
    },
  };
}

/** Read APNs' answer without ever throwing on an unexpected body. */
export function classifyApnsResponse(status, bodyText = '') {
  let reason = '';
  try {
    reason = JSON.parse(bodyText || '{}')?.reason || '';
  } catch {
    reason = '';
  }

  if (status === 200) return { ok: true, category: 'ok', reason, retryable: false, invalidateToken: false };

  if (status === 400 && (reason === 'BadDeviceToken' || reason === 'DeviceTokenNotForTopic')) {
    return { ok: false, category: 'invalid_token', reason, retryable: false, invalidateToken: true };
  }
  if (status === 410) {
    return { ok: false, category: 'invalid_token', reason: reason || 'Unregistered', retryable: false, invalidateToken: true };
  }
  if (status === 403 && reason === 'ExpiredProviderToken') {
    return { ok: false, category: 'expired_provider_token', reason, retryable: true, invalidateToken: false };
  }
  if (status === 403) {
    return { ok: false, category: 'auth_error', reason, retryable: false, invalidateToken: false };
  }
  if (status === 429) {
    return { ok: false, category: 'rate_limited', reason, retryable: true, invalidateToken: false };
  }
  if (status >= 500) {
    return { ok: false, category: 'server_error', reason, retryable: true, invalidateToken: false };
  }
  if (status === 404) {
    return { ok: false, category: 'bad_payload', reason, retryable: false, invalidateToken: false };
  }
  return { ok: false, category: 'bad_payload', reason, retryable: false, invalidateToken: false };
}

/**
 * Send one Live Activity push. Never throws — a failure is a described result,
 * because a notification problem must never surface as an app or task error.
 */
export async function sendLiveActivityPush(input) {
  const {
    token,
    environment = 'development',
    bundleId,
    credentials,
    payload,
    fetchImpl = fetch,
    timeoutMs = 8000,
    now = Date.now(),
  } = input || {};

  if (!credentials || !credentials.keyId || !credentials.teamId || !credentials.privateKeyPem) {
    return { ok: false, category: 'missing_credentials', status: null, apnsId: null, retryable: false, invalidateToken: false };
  }
  if (credentials.dryRun) {
    return { ok: true, dryRun: true, category: 'dry_run', status: null, apnsId: null, retryable: false, invalidateToken: false };
  }
  if (!token || !bundleId) {
    return { ok: false, category: 'bad_payload', status: null, apnsId: null, retryable: false, invalidateToken: false };
  }

  try {
    const jwt = await buildProviderToken({
      keyId: credentials.keyId,
      teamId: credentials.teamId,
      privateKeyPem: credentials.privateKeyPem,
      now,
    });

    const response = await fetchImpl(`${apnsHostFor(environment)}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': apnsTopicFor(bundleId),
        'apns-push-type': 'liveactivity',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const bodyText = typeof response.text === 'function' ? await response.text().catch(() => '') : '';
    const verdict = classifyApnsResponse(response.status, bodyText);
    return {
      ...verdict,
      status: response.status,
      apnsId: response.headers?.get?.('apns-id') || null,
    };
  } catch (error) {
    const name = error?.name || '';
    const category = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network_error';
    return { ok: false, category, status: null, apnsId: null, retryable: true, invalidateToken: false };
  }
}