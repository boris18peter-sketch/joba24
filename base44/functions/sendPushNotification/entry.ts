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

    // Initialize Firebase Admin using individual secrets
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");

    if (!projectId || !clientEmail || !privateKey) {
      return Response.json({ error: 'FCM not configured — missing Firebase secrets' }, { status: 500 });
    }

    // Fix private key: handle all possible formats
    let cleanKey = privateKey;
    // Ensure key starts with ----- (platform may strip leading dashes)
    if (!cleanKey.startsWith('-----')) {
      cleanKey = '-----' + cleanKey;
    }
    // If key has literal \\n (escaped), replace with real newlines
    cleanKey = cleanKey.replace(/\\n/g, '\n');
    // If key has \\r\\n, normalize
    cleanKey = cleanKey.replace(/\r\n/g, '\n');

    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey: cleanKey,
    };

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

    // Send to all tokens with iOS + Android compatible payload
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
          data: {
            url: url || '/',
            click_action: url || '/',
          },
        },
        fcmOptions: {
          link: url || '/',
        },
      },
      android: {
        notification: {
          title,
          body: body || '',
          icon: 'ic_launcher',
          channelId: 'joba24',
          clickAction: url || '/',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body: body || '',
            },
            sound: 'default',
            'mutable-content': 1,
            'content-available': 1,
          },
          custom_data: {
            url: url || '/',
            click_action: url || '/',
          },
        },
      },
      data: {
        url: url || '/',
        tag: tag || 'joba24',
        click_action: url || '/',
      },
    }));

    const sendResults = await Promise.allSettled(
      messages.map(m => getMessaging().send(m))
    );

    const sent = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').length;

    // Log send results for debugging
    console.log(`[Push] Sent: ${sent}/${uniqueTokens.length}, Failed: ${failed}`);
    
    // Clean up invalid tokens
    for (let i = 0; i < sendResults.length; i++) {
      const result = sendResults[i];
      if (result.status === 'rejected') {
        const badToken = uniqueTokens[i];
        const errorCode = result.reason?.code;
        console.log(`[Push] Token ${i} failed: ${errorCode}`);
        
        if (errorCode === 'messaging/registration-token-not-registered') {
          // Remove invalid token from user
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