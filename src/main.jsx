import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { reloadFresh } from '@/lib/reloadFresh'
import { bootMark } from '@/lib/bootTrace'
import { installDesktopScale } from '@/lib/desktopScale'
import { hideNativeSplash } from '@/lib/hideNativeSplash'
import { ensureFreshBuild } from '@/lib/ensureFreshBuild'

// ── "React actually started" — the signal the HTML healers were missing ──────
// The inline guards in index.html used to decide a launch was broken purely by
// "the skeleton is still in #root". On a cold start that is ALWAYS true for the
// first seconds: React has not mounted yet because the app is still booting.
// The guards could not tell "still booting" from "permanently stuck", so a slow
// first launch was reloaded — a full second boot on top of the first, which is
// why the very first open took so long and the next one was fast (the reload
// had warmed the cache).
//
// This flag is set the instant this module EXECUTES. If the entry chunk itself
// failed to fetch (a stale hashed chunk after a deploy), this line never runs
// and the guards still heal exactly as before. So the heal now fires only for a
// genuinely dead launch, never for a merely slow one.
window.__joba24ReactStarted = true

bootMark(
  'env',
  'ok',
  window.Capacitor?.isNativePlatform?.()
    ? `native:${window.Capacitor?.getPlatform?.() || 'unknown'}`
    : 'web'
)

// Protective handler: the vite plugin's unhandled-rejection handler accesses
// event.reason.stack.match(...), which crashes when a promise rejects with a
// non-Error value (undefined, string, plain object). This capture-phase
// listener wraps such rejections in a proper Error BEFORE the plugin sees them.
// Self-heal: a static or dynamic module import can fail transiently ("Importing
// a module script failed." / "Failed to fetch dynamically imported module") when
// the browser holds a stale index.html pointing at a hashed chunk that no longer
// exists on the server after a deploy. Detect it here and reload ONCE (throttled
// 10s, also unregistering stale service workers) so the user gets fresh assets
// instead of a blank screen. lazyRetry already covers dynamic imports inside
// App.jsx; this covers static imports + any rejections that escape that net.
// Self-heal for stale module imports — covers BOTH unhandledrejection (dynamic
// imports) and window 'error' events (static <script type="module"> load
// failures that never become promise rejections).
const STALE_IMPORT_RE = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;
function healStaleImport() {
  const KEY = 'joba24_main_reload_ts';
  // ── THE THROTTLE MUST NEVER BE ABLE TO BLOCK THE HEAL ────────────────────
  // sessionStorage THROWS in an iOS WKWebView whose storage is blocked (and in
  // some private-browsing states). Unguarded, that exception escaped this
  // function, so the reload below never ran: the stale chunk stayed, the app
  // stayed dead, and "TypeError: Importing a module script failed." repeated on
  // every single launch — the one outcome this whole file exists to prevent.
  // The throttle is an optimisation (don't loop); it is not a prerequisite.
  // index.html's own heal already guards its storage access this way.
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last <= 10000) return; // throttled — don't loop
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage unavailable — no throttle, but heal anyway */
  }
  // reloadFresh (not location.reload) — unregisters stale service workers, clears
  // Cache Storage and navigates with a cache-buster so the reload really does
  // fetch fresh assets instead of the same stale index.html.
  reloadFresh();
}

// Catch promise rejections from dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (typeof reason === 'string' ? reason : (reason?.message || '')) || '';
  if (STALE_IMPORT_RE.test(msg)) {
    healStaleImport();
    return;
  }
  const needsWrap =
    reason == null ||
    (typeof reason === 'object' && typeof reason.stack !== 'string');
  if (!needsWrap) return;

  const wrapped = new Error(
    typeof reason === 'string'
      ? reason
      : reason?.message || 'Unhandled promise rejection'
  );
  if (reason && typeof reason === 'object') {
    try { Object.assign(wrapped, reason); } catch {}
  }
  try {
    Object.defineProperty(event, 'reason', {
      value: wrapped,
      configurable: true,
      writable: true,
    });
  } catch {
    // Can't override — stop the plugin handler from crashing and log manually
    event.stopImmediatePropagation();
    console.error('[Joba24] Unhandled rejection:', reason);
  }
}, true); // capture phase — runs before the vite plugin's bubble-phase handler

// ── REMOVED: window.addEventListener('vite:preloadError', healStaleImport) ──
//
// DO NOT RE-ADD THIS. This was the single biggest regression in the app.
//
// vite:preloadError fires for EVERY failed <link rel="modulepreload"> — i.e. for
// every PRELOAD, not just for a real page import. The app preloads 13 route
// chunks on idle (App.jsx), and on iOS the WebView loads the LIVE site
// (capacitor.config.json → server.url = https://joba24.com/), so right after any
// deploy the cached index.html still points at chunk names that no longer exist
// and a preload fails.
//
// The handler above then called healStaleImport() → reloadFresh() → a FULL APP
// RELOAD, for a prefetch whose only job was to warm the cache. During onboarding
// that reload threw the user back to the start of the flow, which is exactly the
// reported "the form only opens on the second launch". A failed preload must be
// silent — the route's own loader (lazyRetry) already heals a real failure when
// the user actually navigates there, and the two handlers below still cover a
// genuine static-module or dynamic-import failure.


// Catch static module script load failures (these fire as 'error' events on
// window, NOT as promise rejections — the unhandledrejection handler above
// can't see them).
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (STALE_IMPORT_RE.test(msg)) {
    healStaleImport();
    return;
  }
  // A static module script that fails to load (stale index.html → hashed chunk
  // that no longer exists after a deploy) fires a PLAIN error Event on the
  // <script> element — no `message`, so the check above can't see it. This is
  // the exact failure that surfaces as "TypeError: Importing a module script
  // failed." and leaves the app unmounted on a blank screen. Detect the failing
  // module entry script itself and self-heal.
  const el = event?.target;
  if (el && el !== window && el.tagName === 'SCRIPT' && el.type === 'module') {
    healStaleImport();
  }
}, true);

// ── The desktop scale, installed BEFORE the first paint ──────────────────────
// On a computer the app is rendered larger by one `zoom` on the root (see the
// desktop block in index.css). Installing it here, synchronously, is what keeps
// the first frame from being drawn at the phone size and then jumping.
installDesktopScale();

console.log('[Joba24] App: React mounting...');
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// ── HAND THE SCREEN OVER FROM THE NATIVE SPLASH ─────────────────────────────
// See src/lib/hideNativeSplash.js. The native splash used to leave on a fixed
// timer, which could be before the WebView had painted anything — that gap is
// the blank frame between the splash and the app.
//
// TWO animation frames, not one: the first fires BEFORE the paint that follows
// this call, the second after it. React 18 commits asynchronously, so a real
// painted frame is the only honest signal that the WebView has something on
// screen. And if the commit lands a frame later than this, the frame underneath
// is the skeleton in index.html — the same design, in the same colour, so
// nothing shows either way.
requestAnimationFrame(() => requestAnimationFrame(() => hideNativeSplash()));

// ── AND THE NATIVE APP IS MOVED OFF A STALE BUILD ───────────────────────────
// Delayed on purpose: the launch itself must finish first, so a reload happens
// on a settled screen rather than on top of the opening transition. See
// src/lib/ensureFreshBuild.js — it runs once per launch, native only.
setTimeout(() => ensureFreshBuild(), 2500);