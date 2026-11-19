/**
 * pushSender — the ONE place that actually delivers a push to a device.
 *
 * ── WHY IT EXISTS ───────────────────────────────────────────────────────────
 * Every notification used to travel notify* → notificationManager →
 * sendPushNotification: three separate function invocations, one after another,
 * each paying its own cold start, SDK bootstrap and re-read of the same user
 * records before a single byte left for FCM. The visible cost was latency, and
 * the measured cost was worse: recent runs of "Push: Application Created" took
 * anywhere between 2.4 seconds and almost TEN MINUTES for one notification.
 *
 * The FCM call itself is small. So the transport lives here, and the two
 * functions that need it call it IN PROCESS:
 *   • notificationManager — the path every real notification takes;
 *   • sendPushNotification — the endpoint the admin dashboard and a few
 *     in-app actions call directly.
 *
 * ── AND WHY IT IS ALSO THE TIMEOUT ──────────────────────────────────────────
 * The FCM request had no timeout. A stalled socket therefore held the whole
 * notification (and the function that produced it) for as long as the platform
 * allowed — which is exactly how one push became a nine-minute wait. Every
 * outbound request here is bounded, so a slow Google is a fast failure that is
 * retried by the next trigger instead of a notification that arrives after the
 * user has stopped caring.
 */

const OAUTH_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REQUEST_TIMEOUT_MS = 8000;

const FCM_ENDPOINT = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

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
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
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

// Access tokens live an hour. Cached for the life of the instance, so a burst of
// notifications does not exchange a token for every single one.
let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

async function getAccessToken(privateKey: string, clientEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiry - 60) return cachedToken as string;

  const jwt = await createJwt(privateKey, clientEmail);
  const res = await fetch(OAUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

export function readPushCredentials() {
  const projectId = envGet('FIREBASE_PROJECT_ID');
  const clientEmail = envGet('FIREBASE_CLIENT_EMAIL');
  const privateKey = envGet('FIREBASE_PRIVATE_KEY');

  let cleanKey = privateKey;
  if (cleanKey && !cleanKey.startsWith('-----')) cleanKey = '-----' + cleanKey;
  cleanKey = cleanKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  return { projectId, clientEmail, privateKey: cleanKey };
}

/**
 * The payload, unchanged from the sender this replaces: data-only for web (the
 * service worker draws the notification), an explicit high-priority Android
 * block (so OEM builds actually show it) and an alert APNs block with priority
 * 10 (so Apple does not hold it for a low-power device).
 */
function buildMessage({ token, title, body, url, tag }: any) {
  return {
    message: {
      token,
      data: {
        title,
        body: body || '',
        url: url || '/',
        tag: tag || 'joba24',
        click_action: url || '/',
      },
      webpush: {
        fcmOptions: { link: url || '/' },
      },
      android: {
        priority: 'high',
        notification: {
          title,
          body: body || '',
          icon: 'ic_launcher',
          channelId: 'joba24',
          clickAction: 'FCM_PLUGIN_ACTIVITY',
          tag: tag || 'joba24',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'PUBLIC',
          notificationPriority: 'PRIORITY_HIGH',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: { title, body: body || '' },
            sound: 'default',
            'mutable-content': 1,
            'content-available': 1,
          },
          url: url || '/',
          tag: tag || 'joba24',
        },
      },
    },
  };
}

/**
 * Send one push to every device of the given users.
 *
 * Never throws: the outcome is a value, so a caller can log it and move on.
 * `sent` counts deliveries FCM accepted, which is what the notification log
 * reports — the same meaning it had before.
 */
export async function sendPushToUsers({ base44, userIds, title, body, url, tag }: any) {
  const ids = (userIds || []).filter(Boolean);
  if (!ids.length || !title) {
    return { sent: 0, failed: 0, totalTokens: 0, reason: 'missing_recipients' };
  }

  const creds = readPushCredentials();
  if (!creds.projectId || !creds.clientEmail || !creds.privateKey) {
    return { sent: 0, failed: 0, totalTokens: 0, reason: 'fcm_not_configured' };
  }

  const users = await base44.asServiceRole.entities.User.filter({
    id: { $in: ids },
    is_blocked: { $ne: true },
  });

  const allTokens: string[] = [];
  for (const u of users || []) {
    if (u.fcm_tokens?.length) allTokens.push(...u.fcm_tokens);
  }
  const uniqueTokens = [...new Set(allTokens)];
  if (!uniqueTokens.length) {
    return { sent: 0, failed: 0, totalTokens: 0, reason: 'no_device_tokens' };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(creds.privateKey, creds.clientEmail);
  } catch (error: any) {
    return {
      sent: 0,
      failed: uniqueTokens.length,
      totalTokens: uniqueTokens.length,
      reason: 'fcm_auth_failed',
      detail: String(error?.message || '').slice(0, 160),
    };
  }

  const endpoint = FCM_ENDPOINT(creds.projectId);

  const results = await Promise.allSettled(
    uniqueTokens.map(async (token) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildMessage({ token, title, body, url, tag })),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes('UNREGISTERED') || res.status === 404) {
          throw { code: 'messaging/registration-token-not-registered', token };
        }
        throw new Error(`FCM send failed: ${res.status} ${errText}`);
      }
      return token;
    }),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  // Retire tokens FCM says no longer exist. A malformed payload is never
  // treated as one: dropping a working token silently unsubscribes a phone.
  const deadTokens = new Set<string>();
  for (const result of results) {
    if (result.status === 'rejected') {
      const err: any = result.reason;
      if (err?.code === 'messaging/registration-token-not-registered' && err?.token) {
        deadTokens.add(err.token);
      }
    }
  }
  if (deadTokens.size) {
    await Promise.all((users || []).map(async (u: any) => {
      if (!u.fcm_tokens?.length) return;
      const cleaned = u.fcm_tokens.filter((t: string) => !deadTokens.has(t));
      if (cleaned.length !== u.fcm_tokens.length) {
        await base44.asServiceRole.entities.User.update(u.id, { fcm_tokens: cleaned }).catch(() => {});
      }
    }));
  }

  return {
    sent,
    failed,
    totalTokens: uniqueTokens.length,
    reason: sent === 0 ? 'fcm_failed' : undefined,
  };
}