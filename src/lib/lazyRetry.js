import { lazy } from 'react';
import { reloadFresh } from '@/lib/reloadFresh';
import { bootMark } from '@/lib/bootTrace';

/**
 * A lazy route that can never leave the app on a dead screen.
 *
 * Vite's lazy chunks are hashed: after a new deploy the browser may still hold a
 * stale module URL whose chunk no longer exists on the server, so the dynamic
 * import fails with "Failed to fetch dynamically imported module". The same
 * failure happens on a dropped connection during a cold launch.
 *
 * Every lazily-loaded screen must therefore go through this wrapper — a plain
 * `lazy()` has no recovery at all, so one failed fetch of that screen is a hard
 * error with no way back.
 */
export const lazyRetry = (importFn) => lazy(() =>
  importFn().catch(async (err) => {
    // ── THIS PROMISE MUST ALWAYS SETTLE ─────────────────────────────────────
    // It used to end in `return new Promise(() => {})` — a promise that NEVER
    // resolves. When that branch was taken, React's lazy() waited on it
    // forever: Suspense kept the loading screen up for good, no error was
    // raised, no boundary ran, and nothing in the app could recover. That is a
    // loading screen with no end, and it is the one outcome a boot path must
    // never be able to produce. Every path below now settles.
    //
    // 1. A transient failure — a dropped connection on a cold launch, the
    //    common case — needs no reload at all: one more fetch usually succeeds.
    try {
      const mod = await importFn();
      bootMark('chunk', 'ok', 'recovered on retry');
      return mod;
    } catch {
      /* still failing — fall through to the stale-build heal */
    }

    // 2. Still failing: the chunk is genuinely gone (a cached index.html
    //    pointing at a build that no longer exists), which only a reload onto
    //    the current build fixes.
    const KEY = 'joba24_chunk_reload_ts';
    // Storage is read defensively for the same reason as main.jsx: an iOS
    // WKWebView with storage blocked THROWS on sessionStorage, and an exception
    // here would replace the real error with a SecurityError and skip the
    // reload — leaving the visitor on a dead screen. A lost throttle costs one
    // extra reload; a lost heal costs the app.
    let canHeal = true;
    try {
      const last = Number(sessionStorage.getItem(KEY) || 0);
      canHeal = Date.now() - last > 10000;
      if (canHeal) sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* no throttle available — heal anyway */
    }
    if (canHeal) {
      bootMark('chunk', 'fail', 'reloading onto the current build');
      // reloadFresh, not location.reload — a stale service worker / HTTP cache
      // can keep serving the broken chunk URL even after a rebuild, so the
      // reload must navigate with a cache-buster to actually fetch it.
      reloadFresh();
      // The reload navigates away, so this normally never runs. If it does NOT
      // — a WebView that refuses the navigation — the promise must still
      // settle, so the error boundary can show a real, retryable error instead
      // of leaving the spinner up forever.
      return new Promise((_, reject) => setTimeout(() => reject(err), 3000));
    }

    // 3. The heal is throttled (it already ran moments ago) — surface it.
    throw err;
  })
);