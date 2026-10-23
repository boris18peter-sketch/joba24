import { Capacitor } from '@capacitor/core';

/**
 * HAND THE SCREEN OVER FROM THE NATIVE SPLASH.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * On iOS the native splash is a view drawn OVER the WebView. By default it is
 * hidden by a fixed timer (`launchAutoHide`), so it could disappear before the
 * WebView had painted anything at all — and what sat behind it in that gap was
 * the WebView's own background, not the app. That gap is the blank frame
 * between the splash and the app.
 *
 * Hiding it here instead — once the browser has genuinely painted a frame —
 * removes the gap: the splash stays until there is something to hand over TO.
 * This is the pattern Capacitor's own plugin documents.
 *
 * ── IT CANNOT BECOME A DEAD END ─────────────────────────────────────────────
 * Three independent guards, because a splash that never goes away is the worst
 * possible outcome:
 *   1. `launchAutoHide` stays ON in capacitor.config.json, so the native side
 *      still releases the screen on its own if this code never runs.
 *   2. The splash and the app's first frame are the same colour, so even the
 *      native side's own timeout hands over invisibly.
 *   3. `hide()` is a no-op once the splash is already gone, so calling it late
 *      (or twice) is harmless — verified in Capacitor's SplashScreen.swift,
 *      which returns early when the splash is not visible.
 *
 * Nothing here waits, retries or delays: it is one call, fired once.
 */

let handedOver = false;

export function hideNativeSplash() {
  if (handedOver) return;
  handedOver = true;

  // The web build has no native splash to hide.
  if (!Capacitor.isNativePlatform()) return;

  // Loaded on demand so the plugin is not part of the boot bundle.
  import('@capacitor/splash-screen')
    .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 0 }))
    .catch(() => {
      /* Plugin missing or already hidden — the native auto-hide covers it. */
    });
}