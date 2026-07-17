import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * verifyInstagram — Social media account verification via bio code.
 *
 * Simple flow for ALL platforms (Instagram, TikTok, Facebook):
 * 1. User enters their username → we generate a 6-digit code
 * 2. User adds the code to their profile bio
 * 3. We verify the code appears in their public profile
 *
 * Actions:
 *   "connect_code" — Save username + generate 6-digit code
 *   "verify_code"  — Check if code is in the bio (LLM with web search)
 *   "disconnect"   — Clear social media data
 */

const PLATFORM_CONFIG = {
  instagram: { label: 'Instagram', profileUrl: (u) => `https://www.instagram.com/${u}/` },
  facebook: { label: 'Facebook', profileUrl: (u) => `https://www.facebook.com/${u}` },
  tiktok: { label: 'TikTok', profileUrl: (u) => `https://www.tiktok.com/@${u}` },
};

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, platform, username } = await req.json();
    if (!platform || !PLATFORM_CONFIG[platform]) {
      return Response.json({ error: 'פלטפורמה לא תקינה' }, { status: 400 });
    }

    const p = PLATFORM_CONFIG[platform];
    const usernameField = `${platform}_username`;
    const verifiedField = `${platform}_verified`;
    const codeField = `${platform}_verify_code`;

    // ── Connect: save username + generate code ──
    if (action === 'connect_code') {
      let clean = (username || '').replace(/^@/, '').trim().toLowerCase();
      if (!clean || clean.length < 2 || clean.length > 50) {
        return Response.json({ error: 'שם משתמש לא תקין' }, { status: 400 });
      }
      const code = generateCode();
      await base44.asServiceRole.entities.User.update(user.id, {
        [usernameField]: clean,
        [verifiedField]: false,
        [codeField]: code,
      });
      console.log(`verifyInstagram: code generated for ${user.id} / ${platform} / @${clean}`);
      return Response.json({ success: true, code, username: clean, platform });
    }

    // ── Verify: check if code is in the bio ──
    if (action === 'verify_code') {
      const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const currentUser = users[0];
      const socialUsername = currentUser?.[usernameField];
      const code = currentUser?.[codeField];

      if (!socialUsername || !code) {
        return Response.json({ error: 'אין בקשת אימות פעילה' }, { status: 400 });
      }

      const profileUrl = p.profileUrl(socialUsername);
      let isVerified = false;

      // Use LLM with web search to check the profile bio
      try {
        const llmPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Visit the ${p.label} profile at this URL: ${profileUrl}. Look at the profile bio/description/intro section. Check if the 6-digit code "${code}" appears anywhere in the bio or profile text. Return a JSON object with "found" (boolean) and "bio" (string containing the bio text you found, or empty string).`,
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
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout')), 55000)
        );
        const result = await Promise.race([llmPromise, timeoutPromise]);
        isVerified = result?.found === true;
      } catch (e) {
        console.log(`verifyInstagram: LLM verification failed: ${e?.message || e}`);
      }

      if (isVerified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [verifiedField]: true,
        });
        console.log(`✅ ${p.label} verified for ${user.id}`);
        return Response.json({ success: true, verified: true });
      }

      return Response.json({
        success: true,
        verified: false,
        note: `הקוד ${code} לא נמצא בפרופיל ה${p.label}. ודא שהוספת את הקוד לביו ושהפרופיל ציבורי. עברו לפחות 2 דקות מאז העדכון ונסה שוב.`,
      });
    }

    // ── Disconnect ──
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