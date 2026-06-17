import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { initializeApp, cert, getApps } from 'npm:firebase-admin@11.11.1/app';
import { getMessaging } from 'npm:firebase-admin@11.11.1/messaging';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { user_ids, title, body, url, tag } = await req.json();

    if (!user_ids || !user_ids.length || !title) {
      return Response.json({ error: 'Missing required fields: user_ids, title' }, { status: 400 });
    }

    // Initialize Firebase Admin
    const saKey = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!saKey) return Response.json({ error: 'FCM not configured' }, { status: 500 });

    // The secret may be the full JSON or just the private key
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(saKey);
    } catch {
      // If it's just the private key, construct the service account object
      if (saKey.includes('-----BEGIN PRIVATE KEY-----')) {
        serviceAccount = {
          projectId: 'joba24',
          clientEmail: 'firebase-adminsdk-fbsvc@joba24.iam.gserviceaccount.com',
          privateKey: saKey.replace(/\\n/g, '\n'),
        };
      } else {
        return Response.json({ error: 'Invalid service account: ' + saKey.substring(0, 50) }, { status: 500 });
      }
    }

    // Clean private key newlines
    if (serviceAccount.private_key) {
      serviceAccount.privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      delete serviceAccount.private_key;
    } else if (serviceAccount.privateKey) {
      serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
    }

    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }

    // Get tokens for target users
    const users = await base44.asServiceRole.entities.User.filter({
      id: { $in: user_ids }
    });

    const allTokens = [];
    for (const u of users) {
      if (u.fcm_tokens && u.fcm_tokens.length) {
        allTokens.push(...u.fcm_tokens);
      }
    }

    if (!allTokens.length) {
      return Response.json({ sent: 0, reason: 'No device tokens found' });
    }

    // Deduplicate
    const uniqueTokens = [...new Set(allTokens)];

    // Send to all tokens
    const messages = uniqueTokens.map(token => ({
      token,
      notification: {
        title,
        body: body || '',
      },
      webpush: {
        notification: {
          icon: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
          badge: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          tag: tag || 'joba24',
        },
        fcmOptions: {
          link: url || '/',
        },
      },
      data: {
        url: url || '/',
        tag: tag || 'joba24',
      },
    }));

    const sendResults = await Promise.allSettled(
      messages.map(m => getMessaging().send(m))
    );

    const sent = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').length;

    // Clean up invalid tokens
    for (let i = 0; i < sendResults.length; i++) {
      const result = sendResults[i];
      if (result.status === 'rejected' && result.reason?.code === 'messaging/registration-token-not-registered') {
        const badToken = uniqueTokens[i];
        // Remove invalid token from user
        for (const u of users) {
          if (u.fcm_tokens && u.fcm_tokens.includes(badToken)) {
            const cleaned = u.fcm_tokens.filter(t => t !== badToken);
            await base44.asServiceRole.entities.User.update(u.id, { fcm_tokens: cleaned });
          }
        }
      }
    }

    return Response.json({ sent, failed, totalTokens: uniqueTokens.length });
  } catch (error) {
    console.error('sendPushNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});