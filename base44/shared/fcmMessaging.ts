/**
 * fcmMessaging — Firebase Cloud Messaging (HTTP v1) as a shared module.
 *
 * ── WHY IT IS A MODULE AND NOT PART OF A FUNCTION ───────────────────────────
 * `sendPushNotification` already talks to FCM, but its JWT / OAuth2 plumbing
 * lives inside that function's entry file and cannot be imported by anything
 * else. Android Live Updates need the SAME transport with a different payload
 * shape — data-only, so the device builds the ongoing notification itself — so
 * the transport is extracted here and imported by the new sender.
 *
 * `sendPushNotification` is deliberately NOT rewritten to use this module. It
 * works, it is on the critical path of every notification in the app, and
 * sharing forty lines of JWT code is not worth touching a working push path.
 *
 * ── NO SDK ─────────────────────────────────────────────────────────────────
 * Service-account JWT + OAuth2 token exchange with WebCrypto, exactly as the
 * existing function does it: lightweight, no firebase-admin, no Deno
 * compatibility problems.
 */

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const OAUTH_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** Read one secret from whichever runtime this module is running in. */
function envGet(name: string): string {
  const deno = (globalThis as any).Deno;
  if (deno?.env?.get) return String(deno.env.get(name) || '');
  const proc = (globalThis as any).process;
  return String(proc?.env?.[name] || '');
}

function base64url(data: any): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createJwt(privateKeyPem: string, clientEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: FCM_SCOPE,
    aud: OAUTH_ENDPOINT,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signInput = `${encodedHeader}.${encodedPayload}`;

  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signInput),
  );

  return `${signInput}.${base64url(new Uint8Array(signature))}`;
}

// Access tokens live an hour; cached for 50 minutes, as the existing sender does.
let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

/**
 * The service-account credentials, plus exactly which ones are absent — the same
 * shape `readApnsCredentials()` returns, so a caller can report a missing secret
 * without ever logging one.
 */
export function readFcmCredentials(): any {
  const projectId = envGet('FIREBASE_PROJECT_ID');
  const clientEmail = envGet('FIREBASE_CLIENT_EMAIL');
  const privateKey = envGet('FIREBASE_PRIVATE_KEY');

  // The stored key arrives with escaped newlines (and sometimes without the
  // leading dashes). Both are normalised here, exactly as the existing sender
  // does, so a key that works for one sender works for both.
  let cleanKey = privateKey;
  if (cleanKey && !cleanKey.startsWith('-----')) cleanKey = '-----' + cleanKey;
  cleanKey = cleanKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  const missing: string[] = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');

  return { projectId, clientEmail, privateKey: cleanKey, missing };
}

async function accessTokenFor(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiry - 60) return cachedToken as string;

  const jwt = await createJwt(credentials.privateKey, credentials.clientEmail);
  const res = await fetch(OAUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = now + (Number(data.expires_in) || 3600);
  return cachedToken as string;
}

/**
 * Classify a refusal. The only category that RETIRES a token is "this token no
 * longer exists"; a malformed payload must never be mistaken for one, because
 * dropping a valid device token silently unsubscribes a working phone.
 */
export function classifyFcmFailure(status: number, body: string): string {
  const text = String(body || '');
  if (text.includes('UNREGISTERED') || status === 404 || text.includes('NOT_FOUND')) return 'invalid_token';
  if (status === 429 || text.includes('QUOTA_EXCEEDED')) return 'rate_limited';
  if (status === 401 || status === 403) return 'expired_provider_token';
  if (status >= 500) return 'server_error';
  return 'bad_payload';
}

/**
 * Send ONE message to ONE token.
 *
 * `data` is always string → string (FCM's own requirement). No `notification`
 * block is ever added: a data-only message is handed to the app's own service,
 * which is what lets the device choose between a promoted Live Update and an
 * ordinary ongoing notification instead of FCM drawing a plain one.
 *
 * Never throws: a push failure is reported as a value, so a dispatch can record
 * it and move on.
 */
export async function sendFcmMessage(input: any): Promise<any> {
  const { token, credentials, data = {}, priority = 'high', collapseKey = '', ttlSeconds = 0 } = input || {};

  if (!token) return { ok: false, dryRun: false, status: null, category: 'missing_token', invalidateToken: false };
  if (!credentials || (credentials.missing && credentials.missing.length)) {
    return { ok: false, dryRun: false, status: null, category: 'missing_credentials', invalidateToken: false };
  }

  try {
    const accessToken = await accessTokenFor(credentials);
    const android: any = { priority };
    if (collapseKey) android.collapse_key = collapseKey;
    if (ttlSeconds) android.ttl = `${Math.max(0, Math.floor(ttlSeconds))}s`;

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: { token, data, android } }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      const category = classifyFcmFailure(res.status, text);
      return {
        ok: false,
        dryRun: false,
        status: res.status,
        category,
        invalidateToken: category === 'invalid_token',
        retryable: category === 'rate_limited' || category === 'server_error',
      };
    }

    const body = await res.json().catch(() => null);
    return { ok: true, dryRun: false, status: res.status, messageId: body?.name || '', category: '', invalidateToken: false };
  } catch (error: any) {
    return {
      ok: false,
      dryRun: false,
      status: null,
      category: 'network_error',
      invalidateToken: false,
      retryable: true,
      detail: String(error?.message || '').slice(0, 120),
    };
  }
}