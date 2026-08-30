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
export async function openExternalBrowser(url) {
  if (Capacitor.isNativePlatform()) {
    try { await Browser.close(); } catch {}
    await Browser.open({ url });
    return;
  }
  // Android WebView, no Capacitor JS bridge → launch Chrome via intent.
  try {
    const u = new URL(url);
    const intent =
      `intent://${u.host}${u.pathname}${u.search}` +
      `#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    window.location.href = intent;
  } catch {
    window.location.href = url;
  }
}