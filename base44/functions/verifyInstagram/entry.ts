import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

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

// ── A PROFILE LINK IS A USERNAME TOO ─────────────────────────────────────────
// Publishers paste what they have: "@name", "name", a full
// "https://www.facebook.com/name?locale=he_IL" link, or a numeric
// "profile.php?id=1000…" address. All of them name the same profile, and all of
// them used to be stored verbatim — so the scan fetched a URL built from a URL
// and found nothing. The identifier is extracted here, once, before it is saved.
function normalizeUsername(platform, raw) {
  let v = String(raw || '').trim();
  v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if (platform === 'facebook') {
    const id = v.match(/profile\.php\?id=(\d+)/i);
    if (id) return id[1];
    v = v.replace(/^[a-z0-9.-]*facebook\.com\//i, '');
    v = v.split(/[?#]/)[0].replace(/\/+$/, '');
    return v.replace(/^@/, '').trim().toLowerCase();
  }
  if (platform === 'instagram') {
    v = v.replace(/^[a-z0-9.-]*instagram\.com\//i, '');
    return v.split(/[?#/]/)[0].replace(/^@/, '').trim().toLowerCase();
  }
  if (platform === 'tiktok') {
    v = v.replace(/^[a-z0-9.-]*tiktok\.com\//i, '');
    return v.split(/[?#/]/)[0].replace(/^@/, '').trim().toLowerCase();
  }
  return v.replace(/^@/, '').trim().toLowerCase();
}

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
    .replace(/\\u0022/g, '"').replace(/\\u0027/g, "'").replace(/\\n/g, ' ');
}

// ── Extract <meta property="og:description" content="..."> from HTML ──
// Facebook profile pages embed the bio in og:description, which is often
// accessible even when the page body requires login.
function extractMetaTag(html, property) {
  if (!html) return '';
  const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  if (match) return decodeEntities(match[1]);
  // Try content before property (attribute order varies)
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');
  const match2 = html.match(regex2);
  return match2 ? decodeEntities(match2[1]) : '';
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
    endpoints.push(`https://m.facebook.com/${username}/`);
    endpoints.push(`https://m.facebook.com/public/${username}`);
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
      }, platform === 'tiktok' ? 6000 : 4500);
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
        // Facebook: parse og:description meta tag
        if (platform === 'facebook') {
          const ogDesc = extractMetaTag(text, 'og:description');
          if (ogDesc && ogDesc.includes(code)) {
            console.log(`✅ Code found via Facebook og:description: ${url}`);
            return { found: true, method: 'facebook-og' };
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
    }, 6000);
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
      // Facebook: parse og:description meta tag (bio is embedded there)
      if (platform === 'facebook') {
        const ogDesc = extractMetaTag(html, 'og:description');
        if (ogDesc) {
          console.log(`verifyInstagram: Facebook og:description = "${ogDesc.substring(0, 100)}"`);
          if (ogDesc.includes(code)) {
            console.log('✅ Code found via Facebook og:description');
            return { found: true, method: 'facebook-og' };
          }
        }
        // Also try description meta tag
        const descMeta = extractMetaTag(html, 'description');
        if (descMeta && descMeta.includes(code)) {
          console.log('✅ Code found via Facebook meta description');
          return { found: true, method: 'facebook-meta' };
        }
      }
    }
  } catch (e) {
    console.log(`verifyInstagram: direct fetch failed: ${e?.message || e}`);
  }
  return { found: false, method: 'not-found' };
}

// ── LLM with web search — reads the bio from the profile page ──
// This is the PRIMARY method. Instagram/Facebook/TikTok block server-side
// scraping, but Gemini with web search can read public profiles via Google.
// Two attempts: first a direct page read, then a Google search fallback.
async function verifyWithLlm(platformLabel, username, code, profileUrl, base44) {
  // Attempt 1: Ask Gemini to read the profile page directly
  try {
    console.log(`verifyInstagram: LLM scan (attempt 1) for ${platformLabel} / @${username} / code=${code}`);
    const llmPromise1 = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Visit the ${platformLabel} profile page at this URL: ${profileUrl}. Look at the bio/description text shown on the profile. Does the 6-digit number "${code}" appear anywhere in the bio, description, or any visible text on the profile page? Respond with JSON: {"found": true/false, "bio": "the bio text you found, or empty string if you could not access the page"}.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: { found: { type: 'boolean' }, bio: { type: 'string' } },
      },
    });
    const timeoutPromise1 = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM timeout (15s)')), 15000)
    );
    const result1 = await Promise.race([llmPromise1, timeoutPromise1]);
    console.log(`verifyInstagram: LLM attempt 1 result: found=${result1?.found}, bio="${(result1?.bio || '').substring(0, 100)}"`);
    if (result1?.found === true) return { found: true, method: 'llm' };
  } catch (e) {
    console.log(`verifyInstagram: LLM attempt 1 failed: ${e?.message || e}`);
  }

  // Attempt 2: Google search for the profile + code
  try {
    console.log(`verifyInstagram: LLM scan (attempt 2 - Google search) for ${platformLabel} / @${username} / code=${code}`);
    const llmPromise2 = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Search Google for: site:${platformLabel.toLowerCase()}.com "${username}" bio. Also search for: "${username}" "${code}" ${platformLabel}. Check if the ${platformLabel} user "${username}" has the number "${code}" visible anywhere on their public profile, bio, or in any search results about them. Respond with JSON: {"found": true/false, "bio": "any relevant text found"}.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: { found: { type: 'boolean' }, bio: { type: 'string' } },
      },
    });
    const timeoutPromise2 = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM timeout (15s)')), 15000)
    );
    const result2 = await Promise.race([llmPromise2, timeoutPromise2]);
    console.log(`verifyInstagram: LLM attempt 2 result: found=${result2?.found}, bio="${(result2?.bio || '').substring(0, 100)}"`);
    return { found: result2?.found === true, method: 'llm-search' };
  } catch (e) {
    console.log(`verifyInstagram: LLM attempt 2 failed: ${e?.message || e}`);
    return { found: false, method: 'not-found' };
  }
}

// ── Facebook: the public page as a CRAWLER sees it ──────────────────────────
// This is the fix for "I connected Facebook and never got the gold badge".
//
// A Facebook profile is a login wall to a normal browser user agent: the server
// got a sign-in page, the bio was never in it, and the scan answered "code not
// found" for essentially every user — so facebook_verified stayed false and the
// gold badge never appeared.
//
// The same profile IS public to the crawlers Facebook serves link previews to,
// and there the intro/bio is returned in the page's og:description. Asking as
// one of those agents (and as the mobile/basic hosts, which are lighter) is what
// makes the code readable. Every combination is tried at once, and the first one
// that contains the code wins — the whole sweep is bounded by its own ceiling so
// it can never outlive the request.
const FB_AGENTS = [
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Twitterbot/1.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

async function checkFacebookPublicBio(username, code) {
  const urls = [
    `https://www.facebook.com/${username}`,
    `https://www.facebook.com/${username}/about`,
    `https://m.facebook.com/${username}`,
    `https://mbasic.facebook.com/${username}`,
  ];

  const probe = async (ua, url) => {
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
      }, 6000);
      const text = await res.text().catch(() => '');
      if (!text || text.length < 100) return null;
      if (decodeEntities(text).includes(code)) return 'facebook-page';
      for (const prop of ['og:description', 'description']) {
        const meta = extractMetaTag(text, prop);
        if (meta && meta.includes(code)) return `facebook-${prop}`;
      }
    } catch (e) {
      // A blocked or timed-out agent is simply not the one that answers.
    }
    return null;
  };

  const combos = [];
  for (const ua of FB_AGENTS) for (const url of urls) combos.push({ ua, url });

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; clearTimeout(deadline); resolve(result); } };
    const deadline = setTimeout(() => finish({ found: false, method: 'timeout' }), 8000);

    Promise.all(combos.map(({ ua, url }) => probe(ua, url)))
      .then((results) => {
        const hit = results.find(Boolean);
        finish(hit ? { found: true, method: hit } : { found: false, method: 'not-found' });
      })
      .catch(() => finish({ found: false, method: 'not-found' }));
  });
}

// ── Race all methods in parallel — return as soon as any finds the code ──
async function verifyInParallel(platform, username, code, base44) {
  const p = PLATFORM_CONFIG[platform];
  const profileUrl = p.profileUrl(username);

  return new Promise((resolve) => {
    let remaining = platform === 'facebook' ? 4 : 3;
    let settled = false;
    let deadline;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve(result);
    };

    // ── ONE CEILING FOR THE WHOLE SCAN ─────────────────────────────────────
    // The three methods used to be able to run to ~30s together, which is
    // exactly the client's own timeout: the app gave up as the server was still
    // thinking, retried, and the publisher waited twice with no verdict. A
    // "not found" answered quickly is better than a perfect answer too late —
    // the bio may simply not have propagated yet, and the retry covers that.
    deadline = setTimeout(() => finish({ found: false, method: 'timeout' }), 14000);

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

    // Method 4 (Facebook only): the public page read as a crawler sees it.
    if (platform === 'facebook') {
      checkFacebookPublicBio(username, code).then(r => {
        if (r.found) finish(r);
        else checkDone();
      }).catch(() => checkDone());
    }
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
      const clean = normalizeUsername(platform, username);
      if (!clean || clean.length < 2 || clean.length > 50) {
        return Response.json({ error: 'שם משתמש לא תקין' }, { status: 400 });
      }
      const code = generateCode();
      // ── A NEW CODE IS NOT A REVOCATION ──────────────────────────────────
      // Generating a code used to clear the verified flag unconditionally, so a
      // user who was ALREADY gold and simply re-opened the sheet lost the badge
      // for as long as the new scan took (and for ever, if that scan failed).
      // The badge is only cleared when the profile being connected is a
      // different one from the profile that was verified.
      const existing = await base44.asServiceRole.entities.User.filter({ id: user.id }).catch(() => []);
      const sameHandle = existing?.[0]?.[usernameField] === clean;
      await base44.asServiceRole.entities.User.update(user.id, {
        [usernameField]: clean,
        [codeField]: code,
        ...(sameHandle ? {} : { [verifiedField]: false }),
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
        // ── FACEBOOK CANNOT BE READ AUTOMATICALLY ANY MORE ──────────────────
        // Facebook now answers every server-side request (crawler agents
        // included) with a sign-in wall, so a scan can neither confirm nor
        // deny the code. Retrying is a dead end, so the client is told to offer
        // the manual review below instead of an endless "try again".
        manual_review: platform === 'facebook',
        note: `הקוד ${code} לא נמצא בפרופיל ה${p.label}. ודא ש: (1) העתקת את הקוד לביו, (2) הפרופיל ציבורי, (3) שמרת את השינויים. נסה שוב.`,
      });
    }

    // ── Manual review: the way out when the profile cannot be read ───────────
    // Facebook serves a login wall to every agent, so its code can never be
    // found by the scan. Instead of leaving the user in a loop, the request is
    // handed to the team: it arrives in the support inbox with the profile link
    // and the code, and an admin grants the badge from the dashboard.
    if (action === 'request_review') {
      const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const currentUser = users[0];
      const socialUsername = currentUser?.[usernameField];
      const code = currentUser?.[codeField];
      if (!socialUsername || !code) {
        return Response.json({ error: 'אין בקשת אימות פעילה' }, { status: 400 });
      }

      const link = p.profileUrl(socialUsername);
      await base44.asServiceRole.entities.SupportMessage.create({
        user_id: user.id,
        user_name: currentUser?.full_name || user.full_name || '',
        sender_role: 'user',
        read: false,
        content: [
          `בקשת אימות ידנית — ${p.label}`,
          `שם משתמש: ${socialUsername}`,
          `קישור: ${link}`,
          `קוד אימות: ${code}`,
          '',
          'הקוד אמור להופיע בביו/בהיכרות של הפרופיל. יש לאשר את השדה ' + verifiedField + ' בכרטיס המשתמש.',
        ].join('\n'),
      });

      return Response.json({ success: true, requested: true });
    }

    // ── OAuth verification — for Instagram (Business/Creator accounts) ──
    // Uses the workspace Instagram connector (APP_USER mode). The user
    // authorizes via OAuth in the frontend; this action reads their token
    // and fetches the username from the Instagram Graph API.
    if (action === 'oauth_verify') {
      if (platform !== 'instagram') {
        return Response.json({ error: 'OAuth זמין רק עבור Instagram' }, { status: 400 });
      }

      const INSTAGRAM_CONNECTOR_ID = '6a461cba44174744ca6f4c1c';

      try {
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(INSTAGRAM_CONNECTOR_ID);

        // Instagram Graph API: access_token goes as query param (NOT Authorization header)
        const apiUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`;
        const response = await fetchWithTimeout(apiUrl, {}, 8000);
        const data = await response.json().catch(() => ({}));

        if (data?.username) {
          const cleanUsername = String(data.username).toLowerCase();
          await base44.asServiceRole.entities.User.update(user.id, {
            [usernameField]: cleanUsername,
            [verifiedField]: true,
            [codeField]: '',
          });
          console.log(`✅ Instagram OAuth verified for ${user.id}: @${cleanUsername}`);
          return Response.json({ success: true, verified: true, username: cleanUsername, method: 'oauth' });
        }

        console.log(`verifyInstagram: OAuth response missing username: ${JSON.stringify(data)}`);
        return Response.json({
          error: 'לא הצלחנו לקבל את שם המשתמש מ-Instagram. ודא שהחשבון שלך הוא חשבון עסקי או יוצר (Creator).',
        }, { status: 400 });
      } catch (e) {
        console.log(`verifyInstagram: OAuth failed: ${e?.message || e}`);
        return Response.json({
          error: 'חיבור Instagram לא פעיל. נסה להתחבר מחדש.',
        }, { status: 400 });
      }
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