/**
 * Tranzila Apple Pay SDK — loaded ON DEMAND.
 *
 * These two files used to sit in <head> as plain, render-blocking <script> tags,
 * so EVERY app launch stopped and waited on Tranzila's CDN before the app's own
 * code was even requested. Worse, the Apple Pay file was injected with a
 * `?v=` + Date.now() cache-buster, so it was re-downloaded from scratch on every
 * single launch and could never be served from cache.
 *
 * The payment flow itself does not use them: it POSTs a plain HTML form into
 * Tranzila's own iframe. They are only needed for the iframe's Apple Pay button
 * to delegate the payment session to our top-level origin, which is a moment
 * that happens during checkout — not during launch.
 *
 * So they are fetched the first time the payment screen opens, and the browser
 * caches them from then on.
 */

const JQUERY_URL = 'https://direct.tranzila.com/Tranzila_files/jquery.js';
const APPLE_PAY_URL = 'https://direct.tranzila.com/js/tranzilanapple_v3.js';

let loadPromise = null;

function injectScript(src) {
  return new Promise((resolve) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
}

/**
 * Loads the SDK once per session. Never rejects: a failure here must not block
 * the payment screen — the iframe works without it.
 */
export function loadTranzilaSdk() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (typeof window === 'undefined') return;
    const ok = await injectScript(JQUERY_URL);
    if (!ok) return;
    await injectScript(APPLE_PAY_URL);
    // jQuery is isolated so it never pollutes the React app's globals.
    try {
      if (window.jQuery?.noConflict) window.$n = window.jQuery.noConflict(true);
    } catch {
      /* non-fatal */
    }
  })();
  return loadPromise;
}

export default loadTranzilaSdk;