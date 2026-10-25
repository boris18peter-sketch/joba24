/**
 * campaign.js — first-party capture of the campaign that brought a visitor in.
 *
 * WHY THIS EXISTS
 * A paid click arrives with everything needed to attribute it: the ad platform's
 * click id (gclid), the UTM parameters, and the landing URL itself. None of it
 * was being kept, so a funnel row could not be traced back to the campaign that
 * paid for it — the one question the whole audit exists to answer.
 *
 * WHY IT IS CAPTURED AT BOOT, NOT IN THE FORM
 * The campaign link is `?track=publish`, and the app immediately rewrites the URL
 * to `/welcome?track=publish` (see Layout.jsx) — which drops every other query
 * parameter, including the category, the UTMs and the gclid. By the time the
 * publish form mounts, the URL no longer holds them. So capture happens once,
 * at application boot, before any navigation can strip the query string.
 *
 * ATTRIBUTION MODEL — LAST NON-DIRECT CLICK
 * A new click with campaign parameters overwrites the stored one (the visitor
 * came back through a different ad; the newer click is the one that should be
 * credited). A visit with NO campaign parameters never overwrites, so an organic
 * return visit does not erase the ad that originally paid for the visitor. This
 * is the standard model and the one the ad platforms themselves report against.
 *
 * Storage failure is not an error here: a hardened browser or private mode that
 * blocks storage still gets a session-scoped answer from the in-memory fallback,
 * and the funnel row is still written.
 */

const STORAGE_KEY = 'joba24_campaign_first_touch';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const CLICK_KEYS = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid', 'ttclid'];
const ALL_KEYS = [...UTM_KEYS, ...CLICK_KEYS];

// A click id is short in practice; the cap stops a crafted URL writing an
// unbounded string into the database.
const MAX = 200;

let memory = null;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return memory;
  }
}

function writeStored(data) {
  memory = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — the in-memory copy covers this session */
  }
}

/**
 * Read the current URL, decide whether it carries a campaign, and store it.
 * Safe to call on every boot; it is idempotent.
 *
 * @returns {object|null} the campaign that should be attributed to this visit
 */
export function captureCampaign() {
  if (typeof window === 'undefined') return null;

  let params;
  try {
    params = new URL(window.location.href).searchParams;
  } catch {
    return readStored();
  }

  const hasCampaign = ALL_KEYS.some((k) => params.get(k));

  // No campaign in the URL: keep whatever we already attributed. This is what
  // makes the model "last non-direct click" rather than "last visit".
  if (!hasCampaign) {
    const stored = readStored();
    if (stored) return stored;
  }

  const data = {
    landing_url: String(window.location.href).slice(0, 500),
    referrer: String(document.referrer || '').slice(0, 500),
    device: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    // The journey the link names (?track=publish / ?track=worker). Read here so
    // it survives the redirect that drops the query string.
    track: (params.get('track') || params.get('flow') || '').trim().toLowerCase().slice(0, 40) || undefined,
    captured_at: new Date().toISOString(),
  };

  for (const key of ALL_KEYS) {
    const value = params.get(key);
    if (value) data[key] = value.trim().slice(0, MAX);
  }

  writeStored(data);
  return data;
}

/**
 * The campaign attributed to this visitor. Falls back to a fresh read of the
 * current URL, so the very first call before `captureCampaign()` still works.
 */
export function readCampaign() {
  return readStored() || captureCampaign();
}

/** The primary campaign label for the admin table: campaign → source → track. */
export function campaignLabel(c) {
  if (!c) return '';
  return c.utm_campaign || c.utm_source || c.track || '';
}