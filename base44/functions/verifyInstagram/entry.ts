import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * verifyInstagram — Social media account verification.
 *
 * Instagram + TikTok: OAuth (user logs in, we fetch username automatically)
 * Facebook: Bio code (user adds 6-digit code to bio, we verify)
 *
 * Actions:
 *   "connect_code"   — Save username + generate 6-digit code (Facebook only)
 *   "verify_code"    — Check if code is in the bio (Facebook only)
 *   "fetch_profile"  — OAuth profile fetch (Instagram, TikTok)
 *   "disconnect"     — Clear social media data
 */

const INSTAGRAM_CONNECTOR_ID = '6a461cba44174744ca6f4c1c';
const TIKTOK_CONNECTOR_ID = '6a461cbcb8f2b9b391f70d9e';

const PLATFORM_CONFIG = {
  instagram: { label: 'Instagram', profileUrl: (u) => `https://www.instagram.com/${u}/` },
  facebook: { label: 'Facebook', profileUrl: (u) => `https://www.facebook.com/${u}` },
  tiktok: { label: 'TikTok', profileUrl: (u) => `https://www.tiktok.com/@${u}` },
};

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Facebook bio fetch ──
async function getFacebookContent(username) {
  try {
    const res = await fetchWithTimeout(`https://www.facebook.com/${username}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (res.ok) {
      const html = await res.text();
      const ogMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
      if (ogMatch) {
        const bio = decodeEntities(ogMatch[1]);
        if (bio) return { bio, source: 'meta', fullHtml: html };
      }
      return { bio: '', source: 'html', fullHtml: html };
    }
  } catch {}
  return null;
}

// ── LLM verification with web search (backup for Facebook, 55s timeout) ──
async function verifyWithLlm(platformLabel, username, code, profileUrl, base44) {
  try {
    const llmPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Visit the ${platformLabel} profile at this URL: ${profileUrl}. Look at the profile bio/description/intro section. Check if the 6-digit code "${code}" appears anywhere in the bio or profile text. Return a JSON object with "found" (boolean) and "bio" (string containing the bio text you found, or empty string).`,
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
    return result?.found === true;
  } catch (e) {
    console.log(`verifyInstagram: LLM verification failed: ${e?.message || e}`);
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

    // ── Connect with code (Facebook only — Instagram/TikTok use OAuth) ──
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

    // ── Verify code in bio (Facebook only) ──
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
      let method = '';

      // Method 1: Direct fetch
      if (platform === 'facebook') {
        const content = await getFacebookContent(socialUsername);
        console.log(`verifyInstagram: facebook content for ${socialUsername}:`, content ? `${content.source} bio=${content.bio?.length || 0}chars` : 'null');
        if (content) {
          if (content.bio && content.bio.includes(code)) {
            isVerified = true;
            method = 'facebook-meta';
          } else if (content.fullHtml && content.fullHtml.includes(code)) {
            isVerified = true;
            method = 'facebook-html';
          }
        }
      }

      // Method 2: LLM with web search (backup)
      if (!isVerified) {
        isVerified = await verifyWithLlm(p.label, socialUsername, code, profileUrl, base44);
        if (isVerified) method = 'llm';
      }

      if (isVerified) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [verifiedField]: true,
        });
        console.log(`✅ ${p.label} verified for ${user.id} via ${method}`);
        return Response.json({ success: true, verified: true });
      }

      return Response.json({
        success: true,
        verified: false,
        note: `הקוד ${code} לא נמצא בפרופיל ה${p.label}. ודא ש: (1) הוספת את הקוד לביו, (2) הפרופיל ציבורי, (3) עברו לפחות 2 דקות מאז העדכון. ואז נסה שוב.`,
      });
    }

    // ── OAuth profile fetch (Instagram, TikTok) ──
    if (action === 'fetch_profile') {
      let socialUsername = '';

      if (platform === 'tiktok') {
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(TIKTOK_CONNECTOR_ID);
        const res = await fetch(
          'https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        if (data?.data?.user?.username) socialUsername = data.data.user.username;
      } else if (platform === 'instagram') {
        // Instagram Graph API — access_token as query param (per usage guide)
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(INSTAGRAM_CONNECTOR_ID);
        const res = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
        );
        const data = await res.json();
        console.log(`verifyInstagram: instagram OAuth response:`, JSON.stringify(data));
        if (data?.username) socialUsername = data.username;
      } else {
        return Response.json({ error: 'OAuth not available for this platform' }, { status: 400 });
      }

      if (socialUsername) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [usernameField]: socialUsername,
          [verifiedField]: true,
          [codeField]: '',
        });
        console.log(`✅ ${p.label} OAuth verified for ${user.id}: @${socialUsername}`);
        return Response.json({ success: true, username: socialUsername, verified: true });
      }
      return Response.json({ error: 'Could not fetch profile' }, { status: 400 });
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