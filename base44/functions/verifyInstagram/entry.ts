import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * verifyInstagram — Connect, verify, and disconnect Instagram accounts.
 *
 * Actions:
 *   "connect"    — Save username + generate verification code
 *   "verify"     — Check if the verification code is in the Instagram bio
 *   "disconnect" — Remove Instagram data from user
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, username } = await req.json();

    // ── Connect: save username + generate verification code ──
    if (action === 'connect') {
      const cleanUsername = (username || '').replace(/^@/, '').trim().toLowerCase();
      if (!cleanUsername || !/^[a-z0-9._]{1,30}$/.test(cleanUsername)) {
        return Response.json({ error: 'שם משתמש לא תקין' }, { status: 400 });
      }

      const verifyCode = `joba24-${Math.random().toString(36).substring(2, 10)}`;
      await base44.asServiceRole.entities.User.update(user.id, {
        instagram_username: cleanUsername,
        instagram_verified: false,
        instagram_verify_code: verifyCode,
      });

      return Response.json({ success: true, verifyCode, username: cleanUsername });
    }

    // ── Verify: check if code is in Instagram bio ──
    if (action === 'verify') {
      const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const currentUser = users[0];
      const igUsername = currentUser?.instagram_username;
      const verifyCode = currentUser?.instagram_verify_code;

      if (!igUsername || !verifyCode) {
        return Response.json({ error: 'אין בקשת אימות פעילה' }, { status: 400 });
      }

      let isVerified = false;

      // Method 1: Direct fetch of Instagram profile page
      try {
        const response = await fetch(`https://www.instagram.com/${igUsername}/`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
        });
        if (response.ok) {
          const html = await response.text();
          isVerified = html.includes(verifyCode);
        }
      } catch (fetchErr) {
        console.warn('Instagram fetch failed:', fetchErr?.message);
      }

      // Method 2: Fallback to LLM with web search
      if (!isVerified) {
        try {
          const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Search for the Instagram profile "@${igUsername}". Check if the text "${verifyCode}" appears anywhere in their profile bio or description. Return a JSON object with "found" (boolean) and "bio" (string of the bio text you found).`,
            add_context_from_internet: true,
            response_json_schema: {
              type: 'object',
              properties: {
                found: { type: 'boolean' },
                bio: { type: 'string' },
              },
            },
          });
          if (llmResult?.found === true) {
            isVerified = true;
          }
        } catch (llmErr) {
          console.warn('LLM verification failed:', llmErr?.message);
        }
      }

      if (isVerified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          instagram_verified: true,
        });
        return Response.json({ success: true, verified: true });
      } else {
        return Response.json({
          success: true,
          verified: false,
          note: 'הקוד לא נמצא בפרופיל האינסטגרם. ודא שהוספת את הקוד לביו ונסה שוב בעוד מספר דקות.',
        });
      }
    }

    // ── Disconnect: remove Instagram data ──
    if (action === 'disconnect') {
      await base44.asServiceRole.entities.User.update(user.id, {
        instagram_username: '',
        instagram_verified: false,
        instagram_verify_code: '',
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('verifyInstagram error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});