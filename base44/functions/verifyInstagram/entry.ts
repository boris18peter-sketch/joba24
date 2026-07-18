import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * verifyInstagram — Social media bio-code verification.
 *
 * Strategy:
 * 1. Direct HTML fetch with meta tag parsing — fast (~5s), works for some platforms
 * 2. LLM with web search — thorough (~60-70s), works for all platforms
 *
 * Actions:
 *   "connect_code" — Save username + generate 6-digit code
 *   "verify_code"  — Check if code is in the bio
 *   "disconnect"   — Clear social media data
 */

const PLATFORM_CONFIG = {
  instagram: {
    label: 'Instagram',
    profileUrl: (u) => `https://www.instagram.com/${u}/`,
    editBioUrl: 'https://www.instagram.com/accounts/edit/',
  },
  facebook: {
    label: 'Facebook',
    profileUrl: (u) => `https://www.facebook.com/${u}`,
    editBioUrl: 'https://www.facebook.com/profile/',
  },
  tiktok: {
    label: 'TikTok',
    profileUrl: (u) => `https://www.tiktok.com/@${u}`,
    editBioUrl: 'https://www.tiktok.com/profile/edit',
  },
};

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
    .replace(/\\u0022/g, '"').replace(/\\u0027/g, "'").replace(/\\n/g, ' ');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Direct HTML fetch — search for code in page HTML/meta tags ──
async function checkBioDirect(platform, username, code) {
  const profileUrl = PLATFORM_CONFIG[platform].profileUrl(username);
  try {
    const res = await fetchWithTimeout(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    }, 8000);
    const html = await res.text().catch(() => '');
    if (html && html.length > 200) {
      const decoded = decodeEntities(html);
      if (decoded.includes(code)) {
        console.log('✅ Code found via direct HTML');
        return { found: true, method: 'direct' };
      }
    }
  } catch (e) {
    console.log(`verifyInstagram: direct fetch failed: ${e?.message || e}`);
  }
  return { found: false, method: 'not-found' };
}

// ── LLM with web search — reads the bio from the profile page ──
async function verifyWithLlm(platformLabel, username, code, profileUrl, base44) {
  try {
    console.log(`verifyInstagram: LLM scan for ${platformLabel} / @${username} / code=${code}`);
    const llmPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Go to this ${platformLabel} profile page: ${profileUrl}. Read the bio/description text in the profile. Does the 6-digit number "${code}" appear anywhere in the bio or profile text? Answer with a JSON object: {"found": true/false, "bio": "the bio text you found"}.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: { found: { type: 'boolean' }, bio: { type: 'string' } },
      },
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM timeout (90s)')), 90000)
    );
    const result = await Promise.race([llmPromise, timeoutPromise]);
    console.log(`verifyInstagram: LLM result: found=${result?.found}, bio="${(result?.bio || '').substring(0, 100)}"`);
    return result?.found === true;
  } catch (e) {
    console.log(`verifyInstagram: LLM failed: ${e?.message || e}`);
    return false;
  }
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

      console.log(`verifyInstagram: verifying ${platform} / @${socialUsername} / code=${code}`);

      // Method 1: Direct HTML fetch (fast, ~5s)
      const directResult = await checkBioDirect(platform, socialUsername, code);
      let isVerified = directResult.found;
      let method = directResult.method;

      // Method 2: LLM with web search (thorough, ~60-70s)
      if (!isVerified) {
        console.log('verifyInstagram: direct fetch did not find code, starting LLM scan...');
        isVerified = await verifyWithLlm(p.label, socialUsername, code, p.profileUrl(socialUsername), base44);
        if (isVerified) method = 'llm';
      }

      if (isVerified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [verifiedField]: true,
        });
        console.log(`✅ ${p.label} verified for ${user.id} via ${method}`);
        return Response.json({ success: true, verified: true, method });
      }

      return Response.json({
        success: true,
        verified: false,
        method,
        note: `הקוד ${code} לא נמצא בפרופיל ה${p.label}. ודא ש: (1) העתקת את הקוד לביו, (2) הפרופיל ציבורי, (3) שמרת את השינויים. נסה שוב.`,
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