import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Android WebView UA marker — "; wv)" appears in the native app's embedded
// WebView but NOT in regular Chrome (a PWA opened in the browser).
export function isAndroidWebView() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua) && /;\s*wv\)/i.test(ua);
}

// True when running inside the native app. Capacitor's JS bridge is NOT injected
// into remote `server.url` content on Android, so Capacitor.isNativePlatform()
// returns false there even though we ARE inside the native app's WebView. The
// "; wv)" UA marker detects the Android WebView, so this returns true on BOTH
// iOS (via the Capacitor bridge) and Android (via the WebView marker).
// Use this INSTEAD of Capacitor.isNativePlatform() for any "native flow?"
// decision in the auth path.
export function isNativeLike() {
  return Capacitor.isNativePlatform() || isAndroidWebView();
}

// Open a URL in the SYSTEM browser (not the embedded WebView). Uses the
// Capacitor Browser plugin when the bridge is available (iOS); on Android with
// no JS bridge, fires an intent:// that launches Chrome directly. Capacitor's
// native WebViewClient handles intent:// via shouldOverrideUrlLoading regardless
// of the JS bridge, so this works even when the bridge is missing.
// Build an Android intent:// URI that launches Chrome to an https URL. Used by
// openExternalBrowser (best-effort auto-fire) and by the WaitingForAuthScreen
// fallback button (a real user-tapped <a href=intent://> — the most reliable
// way to launch an intent from an embedded WebView).
export function buildIntentUri(url) {
  const u = new URL(url);
  return (
    `intent://${u.host}${u.pathname}${u.search}` +
    `#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
  );
}

export async function openExternalBrowser(url) {
  if (Capacitor.isNativePlatform()) {
    try { await Browser.close(); } catch {}
    await Browser.open({ url });
    return;
  }
  // Android WebView, no Capacitor JS bridge → open the SYSTEM browser via
  // window.open(_blank). Capacitor's NATIVE WebChromeClient.onCreateWindow
  // intercepts the new-window request and launches the URL in Chrome — this
  // works WITHOUT the JS bridge because onCreateWindow is a native callback
  // (unlike intent://, which the WebView swallows without the bridge). The
  // loginUrl is on joba24.base44.app (NOT the server.url origin joba24.com), so
  // Capacitor routes the new window to the external browser. WaitingForAuthScreen
  // also renders a tappable <a target=_blank> fallback in case window.open is
  // blocked.
  try {
    window.open(url, '_blank');
  } catch {
    window.location.href = url;
  }
}