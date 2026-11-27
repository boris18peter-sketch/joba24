import { socialProfileUrl, facebookAppUrl } from '@/lib/socialProfileUrl';
import { isNativeLike, openExternalBrowser } from '@/lib/nativeEnv';

/**
 * openSocialProfile — a connected network's profile, opened where the visitor is
 * actually signed in.
 *
 * ── WHY THE BROWSER WAS THE WRONG DESTINATION ───────────────────────────────
 * Tapping a Facebook connection opened the app's own browser: a fresh, empty
 * session showing facebook.com logged out, so the visitor was asked for
 * credentials they had already given the Facebook app. The app they wanted is
 * one tap away — Facebook publishes a scheme for exactly this, and it opens the
 * SAME profile URL inside the Facebook app, signed in.
 *
 * On the web (and for the other networks) there is nothing to hand over to, so
 * the URL simply opens in a new tab / the system browser, as before.
 */
export function openSocialProfile(platform, raw) {
  const webUrl = socialProfileUrl(platform, raw);
  if (!webUrl) return;

  const appUrl = platform === 'facebook' ? facebookAppUrl(webUrl) : null;

  // Web, or a network with no app hand-off: the profile page in a browser.
  if (!appUrl || !isNativeLike()) {
    openExternalBrowser(webUrl);
    return;
  }

  // ── THE APP FIRST, THE BROWSER ONLY IF NOTHING TOOK IT ────────────────────
  // If Facebook is not installed nothing claims the scheme and the WebView stays
  // on screen, so the browser is opened after a moment of silence. Leaving the
  // app fires visibilitychange/blur, which is what "something took it" looks
  // like — and cancels the fallback.
  let handedOver = false;
  const onLeave = () => { handedOver = true; };
  document.addEventListener('visibilitychange', onLeave, { once: true });
  window.addEventListener('blur', onLeave, { once: true });

  try {
    window.location.href = appUrl;
  } catch {
    // A scheme the WebView refuses outright — go straight to the browser.
    handedOver = false;
  }

  setTimeout(() => {
    document.removeEventListener('visibilitychange', onLeave);
    window.removeEventListener('blur', onLeave);
    if (!handedOver && document.visibilityState === 'visible') openExternalBrowser(webUrl);
  }, 1200);
}