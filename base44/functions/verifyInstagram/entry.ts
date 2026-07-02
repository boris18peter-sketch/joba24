import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * verifyInstagram — Social media account verification.
 *
 * TikTok: OAuth (user logs in, we fetch username automatically)
 * Instagram + Facebook: Bio code (user adds 6-digit code to bio, we verify)
 *
 * Actions:
 *   "connect_code"   — Save username + generate 6-digit code (Instagram, Facebook)
 *   "verify_code"    — Check if code is in the bio (Instagram, Facebook)
 *   "fetch_profile"  — OAuth profile fetch (TikTok)
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

// ── Instagram bio fetch: multiple methods ──
async function getInstagramContent(username) {
  // Method 1: Instagram internal API (most reliable)
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          'x-ig-app-id': '936619743392459',
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          'Accept': 'application/json',
        },
        redirect: 'follow',
      }
    );
    if (res.ok) {
      const data = await res.json();
      const bio = data?.data?.user?.biography || '';
      if (bio) return { bio, source: 'api', fullHtml: '' };
    }
  } catch {}

  // Method 2: Page fetch + parse meta tags
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
      },
      redirect: 'follow',
    });
    if (res.ok) {
      const html = await res.text();
      // Try og:description meta tag (contains bio)
      const ogMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
      if (ogMatch) {
        const bio = decodeEntities(ogMatch[1]);
        if (bio) return { bio, source: 'meta', fullHtml: html };
      }
      // Try description meta tag
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
      if (descMatch) {
        const bio = decodeEntities(descMatch[1]);
        if (bio) return { bio, source: 'meta', fullHtml: html };
      }
      // Return full HTML so caller can search for code directly
      return { bio: '', source: 'html', fullHtml: html };
    }
  } catch {}

  return null;
}

// ── Facebook bio fetch ──
async function getFacebookContent(username) {
  try {
    const res = await fetch(`https://www.facebook.com/${username}`, {
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
      // Try og:description
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

// ── LLM verification with web search (backup) ──
async function verifyWithLlm(platformLabel, username, code, profileUrl, base44) {
  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
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
    return result?.found === true;
  } catch {
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

    // ── Connect with code (Instagram, Facebook) ──
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

    // ── Verify code in bio (Instagram, Facebook) ──
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
      if (platform === 'instagram') {
        const content = await getInstagramContent(socialUsername);
        if (content) {
          if (content.bio && content.bio.includes(code)) {
            isVerified = true;
            method = `instagram-${content.source}`;
          } else if (content.fullHtml && content.fullHtml.includes(code)) {
            isVerified = true;
            method = 'instagram-html';
          }
        }
      } else if (platform === 'facebook') {
        const content = await getFacebookContent(socialUsername);
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

    // ── OAuth profile fetch (TikTok) ──
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
      } else {
        return Response.json({ error: 'OAuth not available for this platform' }, { status: 400 });
      }

      if (socialUsername) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [usernameField]: socialUsername,
          [verifiedField]: true,
        });
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