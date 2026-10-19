/**
 * The "get the app" offer — raised at the moments a WEB visitor has the most
 * reason to install, and at most once for each of them:
 *
 *   publish — they just published a task. Applicants reach them by push.
 *   apply   — they just applied for one. The publisher's APPROVAL reaches them
 *             by push, and an applicant who is not reachable is exactly the
 *             person who loses the job.
 *
 * The two moments are remembered separately, so a visitor who already saw the
 * publisher offer still gets the worker one the first time they apply — they are
 * two different people in the marketplace, with two different reasons to install.
 *
 * Kept in one module because the flag, the "already seen" guard and the event
 * that wakes AppDownloadPopup have to agree: three copies of that contract is
 * how one of them silently stops matching the others.
 */

const OFFER_KEYS = { publish: 'joba24_offer_app', apply: 'joba24_offer_app_apply' };
const SEEN_KEYS = { publish: 'joba24_published_once', apply: 'joba24_applied_once' };

/** Raise the offer for `kind` ('publish' | 'apply'), first time only. */
export function raiseAppOffer(kind) {
  if (!OFFER_KEYS[kind]) return;
  try {
    if (localStorage.getItem(SEEN_KEYS[kind])) return;
    localStorage.setItem(SEEN_KEYS[kind], '1');
    localStorage.setItem(OFFER_KEYS[kind], '1');
    // AppDownloadPopup is already mounted for this session, so it cannot see the
    // flag appear — it is told instead.
    window.dispatchEvent(new CustomEvent('joba24:offer-app', { detail: { kind } }));
  } catch { /* storage blocked — the offer is skipped, never fatal */ }
}

/** The offer waiting from a previous page load, if any. */
export function pendingAppOffer() {
  try {
    if (localStorage.getItem(OFFER_KEYS.publish)) return 'publish';
    if (localStorage.getItem(OFFER_KEYS.apply)) return 'apply';
  } catch { /* storage blocked */ }
  return null;
}

/** The visitor has answered — the offer never returns. */
export function clearAppOffer(kind) {
  if (!OFFER_KEYS[kind]) return;
  try { localStorage.removeItem(OFFER_KEYS[kind]); } catch { /* storage blocked */ }
}