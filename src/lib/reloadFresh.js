/**
 * reloadFresh — reload the app so the browser fetches the CURRENT build.
 *
 * WHY THIS EXISTS
 * Every "self-heal" in this app (stale chunk after a deploy, a module graph
 * split across two generations) ends in a reload. But a plain
 * `window.location.reload()` can re-serve the STALE index.html straight from the
 * browser's HTTP cache — so the reload hands the user the exact same broken
 * build and the failure repeats, which is what surfaces as
 * "TypeError: Importing a module script failed."
 * (WebKit) or "Failed to fetch dynamically imported module" (Chrome).
 *
 * Navigating with a cache-busting query param forces a real fetch of index.html,
 * and therefore of the current hashed chunks — the only thing that actually
 * clears a stale-module failure. Existing query params (ref, access_token, sid,
 * newTaskId …) are preserved, so OAuth callbacks and referral attribution keep
 * working across the reload.
 */

/** Drop service workers + Cache Storage so the reload cannot come from a stale
 *  offline cache. Best effort — it never blocks or fails the reload. */
function clearStaleCaches() {
  const jobs = [];
  try {
    if (navigator.serviceWorker?.getRegistrations) {
      jobs.push(
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister()))),
      );
    }
  } catch {}
  try {
    if (typeof caches !== 'undefined') {
      jobs.push(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
    }
  } catch {}
  return jobs;
}

export function reloadFresh() {
  const navigate = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('cb', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  const jobs = clearStaleCaches();
  if (!jobs.length) {
    navigate();
    return;
  }
  // Never hang the reload on a slow cache teardown.
  Promise.race([
    Promise.allSettled(jobs),
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]).then(navigate, navigate);
}