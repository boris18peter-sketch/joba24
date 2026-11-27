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

/**
 * A working profile URL for a stored handle, or null when there is nothing to
 * link to. A display name falls back to the network's search for that name.
 */
export function socialProfileUrl(platform, raw) {
  const handle = cleanSocialHandle(raw);
  const name = String(raw || '').trim();

  if (platform === 'facebook') {
    if (handle) return `https://www.facebook.com/${handle}`;
    return name ? `https://www.facebook.com/search/top?q=${encodeURIComponent(name)}` : null;
  }
  if (platform === 'instagram') {
    if (handle) return `https://www.instagram.com/${handle}`;
    return name ? `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(name)}` : null;
  }
  if (platform === 'tiktok') {
    if (handle) return `https://www.tiktok.com/@${handle}`;
    return name ? `https://www.tiktok.com/search?q=${encodeURIComponent(name)}` : null;
  }
  return null;
}

/** The handle as it should be shown next to the network's name. */
export function displaySocialHandle(raw) {
  return cleanSocialHandle(raw) || String(raw || '').trim();
}