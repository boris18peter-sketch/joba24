import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { storeHandshakeToken } from '@/lib/nativeAuthComplete';
import { NativeReturnScreen } from '@/components/NativeReturnScreen';

// The native OAuth callback route (/auth-callback). The native LoginPromptModal
// sets from_url to https://joba24.com/auth-callback?sid=…, and the backend
// redirects here after auth with the access_token appended. index.html captures
// the token + sid into sessionStorage before this module loads.
//
// This route IS the native-flow signal (the web/PWA flow never uses /auth-callback
// — it returns to whatever page the user was on), so there's no detection
// ambiguity: if we're here in the external browser, it's a native OAuth callback.
//
//   • Stores the server handshake (the native app polls it to retrieve the token).
//   • iOS: fires the registered joba24:// scheme for an instant return.
//   • Android (custom Codemagic build with a joba24:// intent-filter): fires an
//     intent:// URL (Chrome Custom-Tab-safe) for an automatic app return, then
//     shows the "Continue in app" return screen as a fallback. If the intent
//     resolves, the app opens and login completes via appUrlOpen; if not, Chrome
//     falls back to /auth-callback?done=1 (RETURN_FLAG set) → NativeReturnScreen,
//     and the handshake poll (browserFinished → NativeAuthListener) completes login.

const RETURN_FLAG = 'joba24_auth_return';

export default function AuthCallback() {
  const [showReturn, setShowReturn] = useState(false);
  const [returnToken, setReturnToken] = useState(null);

  useEffect(() => {
    // Inside the native app's own WebView this route shouldn't render — bail.
    if (Capacitor.isNativePlatform()) {
      window.location.replace('/');
      return;
    }

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const android = /android/i.test(ua);

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');

    if (token) {
      sessionStorage.setItem(RETURN_FLAG, '1');
      // Clear the captured token NOW (synchronously) so any reload / intent
      // fallback can't re-enter this branch and re-fire the scheme (infinite
      // loop). The handshake store below still receives the token via its arg.
      sessionStorage.removeItem('joba24_oauth_token');
      sessionStorage.removeItem('joba24_oauth_sid');
      // Background store of the handshake via direct fetch. index.html already
      // did a fire-and-forget store on page load; this is a backup. We do NOT
      // await it — awaiting the SDK (base44.functions.invoke) hangs in the
      // Chrome Custom Tab (no auth headers), which blocks the return screen
      // from rendering → blank screen. Fire-and-forget keeps the UI instant.
      storeHandshakeToken(sid || null, token).catch(() => {});
      if (ios) {
        // index.html already fires the joba24:// scheme the instant the token
        // is captured (before React mounts), so the app opens near-instantly.
        // Re-fire here as a backup in case the inline script failed.
        try { window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`); } catch {}
        return;
      }
      if (android) {
        // The custom Codemagic Android build registers a joba24:// intent-filter.
        // Fire an intent:// URL — the Chrome Custom-Tab-safe way to launch a
        // custom scheme — so the app opens automatically and NativeAuthListener's
        // appUrlOpen completes the login. A RAW joba24:// navigation via
        // window.location blanks the Custom Tab (Chrome can't render the scheme
        // as a webpage), so we wrap it: intent://...#Intent;scheme=joba24;...;end
        // launches joba24://auth-callback?access_token=…, and S.browser_fallback_url
        // sends Chrome to a clean page if the app/intent-filter is absent (instead
        // of a blank ERR_UNKNOWN_URL_SCHEME). The fallback is /auth-callback?done=1
        // (no token); on it, RETURN_FLAG is already set and the token is gone from
        // sessionStorage, so AuthCallback renders NativeReturnScreen (below) and
        // the existing handshake poll finishes the login when the tab closes.
        try {
          const fallback = `${window.location.origin}/auth-callback?done=1`;
          // package= must match the Capacitor appId (capacitor.config.json) and the
          // AndroidManifest intent-filter's package. WITHOUT it, Chrome Custom
          // Tabs won't launch the app directly and silently falls back to the
          // fallback URL — which is exactly the "app never opens" symptom. action
          // + category mirror the manifest (action VIEW, categories DEFAULT +
          // BROWSABLE) so the intent-filter resolves. When the app opens,
          // NativeAuthListener's appUrlOpen parses access_token straight from the
          // joba24://auth-callback?access_token=… URL → completeNativeAuth runs →
          // login finishes WITHOUT polling (the token is embedded in the URI).
          const pkg = 'com.base69e6bdb4986a04a256653a23.app';
          const intent = `intent://auth-callback?access_token=${encodeURIComponent(token)}#Intent;scheme=joba24;package=${pkg};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;category=android.intent.category.DEFAULT;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
          window.location.href = intent;
        } catch {}
        setReturnToken(token);
        setShowReturn(true);
        return;
      }
    } else if (android && sessionStorage.getItem(RETURN_FLAG) === '1') {
      // Reload / intent fallback — keep the return screen visible.
      setShowReturn(true);
    }
  }, []);

  if (!showReturn) return null;

  return <NativeReturnScreen returnToken={returnToken} />;
}