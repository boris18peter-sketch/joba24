import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * verifyInstagram — Social media bio-code verification.
 *
 * Strategy: Run ALL verification methods in PARALLEL and return as soon
 * as any method finds the code. This reduces wait time from ~48s
 * (sequential) to ~5-8s (parallel, fast methods usually work).
 *
 * Actions:
 *   "connect_code" — Save username + generate 6-digit code
 *   "verify_code"  — Check if code is in the bio (parallel scan)
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

// ── TikTok bio extraction — parse embedded JSON (universal data / SIGI_STATE) ──
// TikTok profile pages embed the user's bio inside a JSON blob. Scraping the
// raw HTML rarely contains the bio as plain text, so we parse the structured
// data that TikTok ships for rehydration.
function extractTikTokBio(html) {
  if (!html) return '';
  // Newer layout: __UNIVERSAL_DATA_FOR_REHYDRATION__
  const m1 = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i);
  if (m1) {
    try {
      const data = JSON.parse(m1[1]);
      const scopes = data?.__DEFAULT_SCOPE__ || {};
      const detail = scopes['web.user-detail'] || scopes['web.user.profile'] || {};
      const userInfo = detail?.userInfo || detail?.itemList?.userInfo || {};
      const bio = userInfo?.user?.signature || userInfo?.signature || '';
      if (bio) return bio;
    } catch (e) { /* ignore parse error */ }
  }
  // Older layout: SIGI_STATE
  const m2 = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/i);
  if (m2) {
    try {
      const data = JSON.parse(m2[1]);
      const users = data?.UserModule?.users || {};
      const firstKey = Object.keys(users)[0];
      const bio = users[firstKey]?.signature || '';
      if (bio) return bio;
    } catch (e) { /* ignore parse error */ }
  }
  // Last resort: some pages embed the bio in a <meta> or JSON-LD
  const m3 = html.match(/"signature"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m3) {
    try { return JSON.parse('"' + m3[1] + '"'); } catch (e) { return m3[1]; }
  }
  return '';
}

// ── Fast embed/oEmbed fetch — tries platform embed endpoints ──
async function checkBioFast(platform, username, code) {
  const endpoints = [];
  const isMobile = platform === 'tiktok'; // TikTok is more lenient with mobile UA
  const ua = isMobile
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
  if (platform === 'instagram') {
    endpoints.push(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`);
    endpoints.push(`https://www.instagram.com/${username}/embed/`);
    endpoints.push(`https://www.instagram.com/${username}/?__a=1&__d=dis`);
  } else if (platform === 'tiktok') {
    endpoints.push(`https://www.tiktok.com/@${username}?lang=en`);
    endpoints.push(`https://m.tiktok.com/@${username}`);
  } else if (platform === 'facebook') {
    endpoints.push(`https://www.facebook.com/${username}/`);
  }

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/json,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...(platform === 'tiktok' ? { 'Referer': 'https://www.tiktok.com/' } : {}),
          ...(platform === 'instagram' ? { 'x-ig-app-id': '936619743392459' } : {}),
        },
        redirect: 'follow',
      }, platform === 'tiktok' ? 8000 : 6000);
      const text = await res.text().catch(() => '');
      if (text && text.length > 100) {
        const decoded = decodeEntities(text);
        if (decoded.includes(code)) {
          console.log(`✅ Code found via fast endpoint: ${url}`);
          return { found: true, method: 'fast-embed' };
        }
        // TikTok: the bio is inside an embedded JSON blob, not plain text — parse it
        if (platform === 'tiktok') {
          const bio = extractTikTokBio(text);
          if (bio) {
            const bioDecoded = decodeEntities(bio);
            if (bioDecoded.includes(code)) {
              console.log(`✅ Code found via TikTok JSON bio: ${url}`);
              return { found: true, method: 'tiktok-json' };
            }
          }
        }
      }
    } catch (e) {
      console.log(`verifyInstagram: fast endpoint failed (${url}): ${e?.message || e}`);
    }
  }
  return { found: false, method: 'not-found' };
}

// ── Direct HTML fetch — search for code in page HTML/meta tags ──
async function checkBioDirect(platform, username, code) {
  const profileUrl = PLATFORM_CONFIG[platform].profileUrl(username);
  const isMobile = platform === 'tiktok';
  try {
    const res = await fetchWithTimeout(profileUrl, {
      headers: {
        'User-Agent': isMobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(platform === 'tiktok' ? { 'Referer': 'https://www.tiktok.com/' } : {}),
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
      // TikTok: parse the embedded JSON bio (not present as plain text)
      if (platform === 'tiktok') {
        const bio = extractTikTokBio(html);
        if (bio && decodeEntities(bio).includes(code)) {
          console.log('✅ Code found via TikTok JSON bio (direct)');
          return { found: true, method: 'tiktok-json-direct' };
        }
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
      setTimeout(() => reject(new Error('LLM timeout (20s)')), 20000)
    );
    const result = await Promise.race([llmPromise, timeoutPromise]);
    console.log(`verifyInstagram: LLM result: found=${result?.found}, bio="${(result?.bio || '').substring(0, 100)}"`);
    return { found: result?.found === true, method: 'llm' };
  } catch (e) {
    console.log(`verifyInstagram: LLM failed: ${e?.message || e}`);
    return { found: false, method: 'not-found' };
  }
}

// ── Race all methods in parallel — return as soon as any finds the code ──
async function verifyInParallel(platform, username, code, base44) {
  const p = PLATFORM_CONFIG[platform];
  const profileUrl = p.profileUrl(username);

  return new Promise((resolve) => {
    let remaining = 3;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const checkDone = () => {
      remaining--;
      if (remaining === 0 && !settled) {
        finish({ found: false, method: 'not-found' });
      }
    };

    // Method 1: Fast endpoints (~3-6s)
    checkBioFast(platform, username, code).then(r => {
      if (r.found) finish(r);
      else checkDone();
    }).catch(() => checkDone());

    // Method 2: Direct HTML (~5-8s)
    checkBioDirect(platform, username, code).then(r => {
      if (r.found) finish(r);
      else checkDone();
    }).catch(() => checkDone());

    // Method 3: LLM with web search (~10-30s)
    verifyWithLlm(p.label, username, code, profileUrl, base44).then(r => {
      if (r.found) finish(r);
      else checkDone();
    }).catch(() => checkDone());
  });
}

export default async function(req) {
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

    // ── Verify: check if code is in the bio (parallel scan) ──
    if (action === 'verify_code') {
      const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const currentUser = users[0];
      const socialUsername = currentUser?.[usernameField];
      const code = currentUser?.[codeField];

      if (!socialUsername || !code) {
        return Response.json({ error: 'אין בקשת אימות פעילה' }, { status: 400 });
      }

      console.log(`verifyInstagram: verifying ${platform} / @${socialUsername} / code=${code} (parallel)`);

      // Run all methods in parallel — returns as soon as any finds the code
      const result = await verifyInParallel(platform, socialUsername, code, base44);

      if (result.found) {
        await base44.asServiceRole.entities.User.update(user.id, {
          [verifiedField]: true,
        });
        console.log(`✅ ${p.label} verified for ${user.id} via ${result.method}`);
        return Response.json({ success: true, verified: true, method: result.method });
      }

      return Response.json({
        success: true,
        verified: false,
        method: result.method,
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
}