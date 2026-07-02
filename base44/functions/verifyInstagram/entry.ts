import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * verifyInstagram — Connect, verify, and disconnect social media accounts.
 * Supports: instagram, facebook, tiktok
 *
 * Actions:
 *   "connect"    — Save username + generate 6-digit OTP code
 *   "verify"     — Check if the OTP code is in the social media bio
 *   "disconnect" — Remove social media data from user
 *
 * Payload: { action, platform, username }
 */

const PLATFORMS = {
  instagram: {
    url: (u) => `https://www.instagram.com/${u}/`,
    label: 'Instagram',
  },
  facebook: {
    url: (u) => `https://www.facebook.com/${u}`,
    label: 'Facebook',
  },
  tiktok: {
    url: (u) => `https://www.tiktok.com/@${u}`,
    label: 'TikTok',
  },
};

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, platform, username } = await req.json();

    if (!platform || !PLATFORMS[platform]) {
      return Response.json({ error: 'פלטפורמה לא תקינה' }, { status: 400 });
    }

    const p = PLATFORMS[platform];
    const usernameField = `${platform}_username`;
    const verifiedField = `${platform}_verified`;
    const codeField = `${platform}_verify_code`;

    // ── Connect: save username + generate OTP ──
    if (action === 'connect') {
      let cleanUsername = (username || '').trim();
      // Remove @ prefix for instagram/facebook, keep for tiktok without @
      cleanUsername = cleanUsername.replace(/^@/, '').trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 2 || cleanUsername.length > 50) {
        return Response.json({ error: 'שם משתמש לא תקין' }, { status: 400 });
      }

      const otpCode = generateOtp();
      const updateData = {
        [usernameField]: cleanUsername,
        [verifiedField]: false,
        [codeField]: otpCode,
      };
      await base44.asServiceRole.entities.User.update(user.id, updateData);

      return Response.json({ success: true, otpCode, username: cleanUsername, platform });
    }

    // ── Verify: check if OTP is in the social media bio ──
    if (action === 'verify') {
      const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const currentUser = users[0];
      const socialUsername = currentUser?.[usernameField];
      const otpCode = currentUser?.[codeField];

      if (!socialUsername || !otpCode) {
        return Response.json({ error: 'אין בקשת אימות פעילה' }, { status: 400 });
      }

      const profileUrl = p.url(socialUsername);
      let isVerified = false;
      let method = '';

      // Method 1: LLM with web search (PRIMARY — uses gemini_3_flash which supports add_context_from_internet)
      try {
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Search the web for the ${p.label} profile at this URL: ${profileUrl}. Look at the profile bio/description. Check if the number "${otpCode}" appears anywhere in the bio or profile description. Return a JSON object with "found" (boolean) and "bio" (string containing the bio text you found, or empty string if you couldn't access it).`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
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
          method = 'llm';
        }
      } catch (llmErr) {
        console.warn('LLM verification failed:', llmErr?.message);
      }

      // Method 2: Direct fetch of profile page (SECONDARY)
      if (!isVerified) {
        try {
          const response = await fetch(profileUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
          });
          if (response.ok) {
            const html = await response.text();
            // Check if OTP appears anywhere in the page HTML (bio is embedded in meta tags / JSON)
            if (html.includes(otpCode)) {
              isVerified = true;
              method = 'fetch';
            }
          }
        } catch (fetchErr) {
          console.warn('Profile fetch failed:', fetchErr?.message);
        }
      }

      if (isVerified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [verifiedField]: true,
        });
        console.log(`✅ ${p.label} verified for user ${user.id} via ${method}`);
        return Response.json({ success: true, verified: true });
      } else {
        return Response.json({
          success: true,
          verified: false,
          note: `הקוד ${otpCode} לא נמצא בפרופיל ה${p.label}. ודא שהוספת את הקוד לביו ושהפרופיל ציבורי, ונסה שוב בעוד דקה.`,
        });
      }
    }

    // ── Disconnect: remove social media data ──
    if (action === 'disconnect') {
      await base44.asServiceRole.entities.User.update(user.id, {
        [usernameField]: '',
        [verifiedField]: false,
        [codeField]: '',
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('verifyInstagram error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});