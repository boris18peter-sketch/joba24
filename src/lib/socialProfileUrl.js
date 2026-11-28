/**
 * socialProfileUrl — the ONE place a stored social handle becomes a link.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The handle on a user record was collected as free text for a while, so real
 * records hold every shape a person can type: a full profile URL
 * ("https://m.facebook.com/locksmith.raanana/"), a display name with spaces
 * ("avihu vindish"), a name with an @, or a clean handle. Building the link as
 * `https://facebook.com/${value}` then produced
 * "https://facebook.com/https://m.facebook.com/…" — which Facebook answers with
 * its home/login page, so tapping a profile's social row looked like it simply
 * opened Facebook instead of the person.
 *
 * Cleaning happens HERE, at render time, so links are correct for every record
 * that already exists without rewriting anyone's data, and a value that is a
 * display name (no handle in it) still leads somewhere useful — the network's
 * own search for that name — instead of a dead or wrong profile.
 */

const NETWORK_HOST = /(^|\.)(instagram|facebook|tiktok)\.com$/i;

/**
 * The handle inside whatever was stored. Returns '' when the value carries no
 * usable handle (e.g. a display name), and the special
 * `profile.php?id=<n>` form for Facebook numeric profiles.
 */
export function cleanSocialHandle(raw) {
  let v = String(raw || '').trim();
  if (!v) return '';

  // A full URL, or a bare "facebook.com/name".
  if (/^https?:\/\//i.test(v) || NETWORK_HOST.test(v.split('/')[0])) {
    try {
      const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      // A numeric Facebook profile keeps its id — it has no username at all.
      if (/facebook\.com$/i.test(url.hostname) && /\/profile\.php$/i.test(url.pathname)) {
        const id = url.searchParams.get('id');
        if (id) return `profile.php?id=${id}`;
      }
      v = url.pathname;
    } catch {
      v = v.replace(/^https?:\/\//i, '').replace(/^[^/]*\//, '');
    }
  }

  v = v.split(/[?#]/)[0].replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
  if (v.includes('/')) v = v.split('/')[0];

  return /^[A-Za-z0-9._-]{2,60}$/.test(v) ? v : '';
}

const CANONICAL_HOST = {
  facebook: /(^|\.)facebook\.com$/i,
  instagram: /(^|\.)instagram\.com$/i,
  tiktok: /(^|\.)tiktok\.com$/i,
};

// A redirect host, not a profile path: its short code is the only thing that
// resolves, so such a URL is kept exactly as it was stored.
const SHORT_LINK_HOST = /^(vm|vt)\.|^fb\.watch$/i;

function asNetworkUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    try { return new URL(v); } catch { return null; }
  }
  if (NETWORK_HOST.test(v.split('/')[0])) {
    try { return new URL(`https://${v}`); } catch { return null; }
  }
  return null;
}

/**
 * A working profile URL for a stored handle, or null when there is nothing to
 * link to. A display name falls back to the network's search for that name.
 */
export function socialProfileUrl(platform, raw) {
  const stored = String(raw || '').trim();
  if (!stored) return null;

  // ── A STORED URL IS NOT REWRITTEN ────────────────────────────────────────
  // Real records hold facebook.com/share/<token>, /people/<name>/<id>, /p/…,
  // profile.php?id=… and m.facebook.com/<name>. Reducing every one of them to
  // its FIRST path segment produced "facebook.com/share" — a dead link — while
  // the original resolved perfectly. Only a plain single-segment handle is
  // rebuilt canonically; anything else keeps the path (and query) it was stored
  // with, on the network's own host.
  const url = asNetworkUrl(stored);
  if (url) {
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, '');
    const segments = path.split('/').filter(Boolean);

    if (SHORT_LINK_HOST.test(host)) return `https://${host}${path}${url.search}`;

    const plainHandle = (CANONICAL_HOST[platform] || /$^/).test(host)
      && segments.length === 1
      && !url.search
      && !/\.php$/i.test(segments[0])
      && /^@?[A-Za-z0-9._-]{2,60}$/.test(segments[0]);

    if (!plainHandle && (CANONICAL_HOST[platform] || /$^/).test(host)) {
      return `https://www.${platform}.com${path}${url.search}`;
    }
  }

  const handle = cleanSocialHandle(stored);

  if (platform === 'facebook') {
    if (handle) return `https://www.facebook.com/${handle}`;
    // A display name has no profile URL anywhere — Facebook has no public
    // name-based profile address. The people search is the honest destination.
    return `https://www.facebook.com/search/people/?q=${encodeURIComponent(stored)}`;
  }
  if (platform === 'instagram') {
    if (handle) return `https://www.instagram.com/${handle}`;
    return `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(stored)}`;
  }
  if (platform === 'tiktok') {
    if (handle) return `https://www.tiktok.com/@${handle}`;
    return `https://www.tiktok.com/search?q=${encodeURIComponent(stored)}`;
  }
  return null;
}

/**
 * The Facebook APP's URL for a profile page.
 *
 * Tapping a facebook.com link from inside another app opened that app's own
 * browser — logged out — instead of the Facebook app the visitor is already
 * signed into. `fb://facewebmodal/f?href=…` hands the very same profile URL to
 * the Facebook app, which resolves it to the profile in place, signed in.
 */
export function facebookAppUrl(webUrl) {
  if (!webUrl || !/facebook\.com/i.test(webUrl)) return null;
  return `fb://facewebmodal/f?href=${encodeURIComponent(webUrl)}`;
}

/**
 * The label shown next to the network's name.
 *
 * A stored handle reads as "@handle". A stored PROFILE LINK — which is what a
 * Facebook member now gives us, because facebook.com/share/<token> and
 * /people/<name>/<id> have no username at all — reads as the short address it
 * is ("facebook.com/share/1exa13jzu8"), never as "@share", which is what
 * reducing a multi-segment link to its first segment produced.
 */
export function displaySocialHandle(raw) {
  const value = String(raw || '').trim();
  const handle = cleanSocialHandle(value);
  if (handle && !handle.includes('/')) return `@${handle}`;

  const asUrl = /^https?:\/\//i.test(value)
    ? value
    : (NETWORK_HOST.test(value.split('/')[0]) ? `https://${value}` : null);
  if (asUrl) {
    try {
      const url = new URL(asUrl);
      const path = url.pathname.replace(/\/+$/, '');
      if (path) return `${url.hostname.replace(/^www\./i, '')}${path}`;
    } catch { /* fall through to the raw value */ }
  }
  return handle || value;
}