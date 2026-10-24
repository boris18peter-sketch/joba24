import { reloadFresh } from '@/lib/reloadFresh';
import { bootMark } from '@/lib/bootTrace';

/**
 * ensureFreshBuild — a NATIVE app must never keep running an old build.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * On Android the WebView caches `index.html` aggressively. Capacitor loads the
 * LIVE site (see capacitor.config.json → server.url), so after a deploy the
 * cached index.html still points at a hashed bundle that is no longer current —
 * and the app keeps executing the OLD code, launch after launch, with no sign
 * that anything is wrong. That is a real report from the field: a user saw an
 * empty feed on Android until he deleted the app and installed it again.
 * Reinstalling worked because it cleared the cache, not because anything in the
 * app changed.
 *
 * index.html already carries a guard for this, but it deliberately reloads ONLY
 * when the app is visibly STUCK (the skeleton is still on screen) — a rule added
 * because reloading a *working* app mid-onboarding threw people back to the
 * start of the flow. That rule leaves exactly this case uncovered: an old build
 * that runs fine, just wrongly.
 *
 * ── WHY A RELOAD IS SAFE HERE ──────────────────────────────────────────────
 * This runs ONCE per app launch, seconds after the first paint, on native only.
 * The visitor has not started anything yet, and the check is marked in
 * sessionStorage before it does any work, so a reload can never loop — the
 * reloaded launch sees the marker and stays put. On the web it does nothing at
 * all: a browser tab picks up a new deploy on its next navigation anyway.
 *
 * The comparison is the Vite entry chunk, whose name changes on every publish,
 * so "different" means "a newer build exists" and nothing else.
 */
const CHECKED_KEY = 'joba24_build_checked';

export function ensureFreshBuild() {
  // Native only. A web visitor is never interrupted for a deploy they will pick
  // up naturally on their next visit.
  if (!window.Capacitor?.isNativePlatform?.()) return;

  // Once per launch, marked BEFORE the work so a failure can never loop.
  try {
    if (sessionStorage.getItem(CHECKED_KEY) === '1') return;
    sessionStorage.setItem(CHECKED_KEY, '1');
  } catch {
    // Storage blocked (some private/WebView states). Without it there is no way
    // to guarantee "once", so the check is skipped rather than risking a loop.
    return;
  }

  const running = document.querySelector('script[type="module"][src]')?.getAttribute('src') || '';
  if (!running) return;

  fetch('/index.html?cb=' + Date.now(), { cache: 'no-store' })
    .then((r) => r.text())
    .then((html) => {
      const match = html.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/);
      const served = match ? match[1] : '';
      if (!served || served === running) {
        bootMark('build', 'ok', 'current');
        return;
      }
      bootMark('build', 'stale', 'reloading onto the current build');
      reloadFresh();
    })
    .catch(() => {
      // Offline, or the check itself failed. The app keeps working on whatever
      // build it has; this is an update, not a repair.
      bootMark('build', 'skip', 'check unavailable');
    });
}