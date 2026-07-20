import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Send FCM push notifications using the HTTP v1 API directly.
 * No firebase-admin SDK dependency — uses service-account JWT + OAuth2 token exchange.
 * This is lightweight, fast to bundle, and avoids Deno compatibility issues.
 */

const FCM_ENDPOINT = (projectId) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

// ── JWT creation using WebCrypto (built into Deno) ──
function base64url(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createJwt(privateKeyPem, clientEmail) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signInput = `${encodedHeader}.${encodedPayload}`;

  // Parse the PEM private key
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
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signInput)
  );

  const encodedSignature = base64url(new Uint8Array(signature));
  return `${signInput}.${encodedSignature}`;
}

// Token cache — access tokens live 1 hour; we cache for 50 min
let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken(privateKey, clientEmail) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiry - 60) {
    return cachedToken;
  }

  const jwt = await createJwt(privateKey, clientEmail);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth token exchange failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = now + (data.expires_in || 3600);
  return cachedToken;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_ids, title, body, url, tag } = await req.json();

    if (!user_ids || !user_ids.length || !title) {
      return Response.json({ error: 'Missing required fields: user_ids, title' }, { status: 400 });
    }

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");

    if (!projectId || !clientEmail || !privateKey) {
      return Response.json({ error: 'FCM not configured — missing Firebase secrets' }, { status: 500 });
    }

    // Fix private key formatting
    let cleanKey = privateKey;
    if (!cleanKey.startsWith('-----')) {
      cleanKey = '-----' + cleanKey;
    }
    cleanKey = cleanKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

    // Get tokens for target users — ONLY approved users (or admins/agents) receive push
    const users = await base44.asServiceRole.entities.User.filter({
      id: { $in: user_ids },
      is_blocked: { $ne: true },
      $or: [
        { is_approved: true },
        { role: 'admin' },
        { role: 'agent' }
      ]
    });

    const requestedCount = user_ids.length;
    const approvedCount = users.length;
    if (approvedCount < requestedCount) {
      console.log(`[Push] Filtered out ${requestedCount - approvedCount} unapproved/blocked users (pre-launch gate)`);
    }

    const allTokens = [];
    for (const u of users) {
      if (u.fcm_tokens && u.fcm_tokens.length) {
        allTokens.push(...u.fcm_tokens);
      }
    }

    if (!allTokens.length) {
      return Response.json({ sent: 0, reason: 'No device tokens found (or all target users are unapproved)' });
    }

    const uniqueTokens = [...new Set(allTokens)];

    // Get OAuth2 access token
    const accessToken = await getAccessToken(cleanKey, clientEmail);

    const endpoint = FCM_ENDPOINT(projectId);

    // Send each message individually (FCM v1 API supports one token per request)
    const sendResults = await Promise.allSettled(
      uniqueTokens.map(async (token) => {
        const message = {
          message: {
            token,
            // data-only at top level — SW's onBackgroundMessage renders the notification for web.
            // No top-level `notification` field: avoids duplicate notifications on web
            // (FCM auto-display + SW onBackgroundMessage would both fire).
            data: {
              title,
              body: body || '',
              url: url || '/',
              tag: tag || 'joba24',
              click_action: url || '/',
            },
            // webpush: link only — notification rendering done by SW onBackgroundMessage
            webpush: {
              fcmOptions: {
                link: url || '/',
              },
            },
            android: {
              priority: 'high',
              notification: {
                title,
                body: body || '',
                icon: 'ic_launcher',
                channelId: 'joba24',
                clickAction: url || '/',
                tag: tag || 'joba24',
              },
            },
            apns: {
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

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        if (!res.ok) {
          const errText = await res.text();
          // Check if token is invalid/unregistered
          const errData = JSON.parse(errText).error?.details?.[0];
          const reason = errData?.errorCode;
          if (reason === 'UNREGISTERED' || errText.includes('UNREGISTERED')) {
            throw { code: 'messaging/registration-token-not-registered', token };
          }
          throw new Error(`FCM send failed: ${res.status} ${errText}`);
        }

        return token;
      })
    );

    const sent = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').length;

    console.log(`[Push] Sent: ${sent}/${uniqueTokens.length}, Failed: ${failed}`);

    // Clean up invalid tokens
    for (const result of sendResults) {
      if (result.status === 'rejected') {
        const err = result.reason;
        if (err?.code === 'messaging/registration-token-not-registered' && err?.token) {
          const badToken = err.token;
          for (const u of users) {
            if (u.fcm_tokens && u.fcm_tokens.includes(badToken)) {
              const cleaned = u.fcm_tokens.filter(t => t !== badToken);
              await base44.asServiceRole.entities.User.update(u.id, { fcm_tokens: cleaned });
              console.log(`[Push] Removed invalid token from user ${u.id}`);
            }
          }
        }
      }
    }

    return Response.json({
      sent,
      failed,
      totalTokens: uniqueTokens.length,
      message: `Successfully sent ${sent} notifications, ${failed} failed`
    });
  } catch (error) {
    console.error('sendPushNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});