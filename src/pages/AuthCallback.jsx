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
//   • Android (custom Codemagic build with a joba24:// intent-filter): fires the
//     scheme for an automatic app return, then shows the "Continue in app" return
//     screen as a fallback. If the scheme resolves, the app opens and login
//     completes via appUrlOpen; if not, the user closes the tab and the existing
//     handshake poll (browserFinished → NativeAuthListener) completes login.

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
      // Background store of the handshake via direct fetch. index.html already
      // did a fire-and-forget store on page load; this is a backup. We do NOT
      // await it — awaiting the SDK (base44.functions.invoke) hangs in the
      // Chrome Custom Tab (no auth headers), which blocks the return screen
      // from rendering → blank screen. Fire-and-forget keeps the UI instant.
      storeHandshakeToken(sid || null, token).then(() => {
        sessionStorage.removeItem('joba24_oauth_token');
        sessionStorage.removeItem('joba24_oauth_sid');
      }).catch(() => {});
      if (ios) {
        // index.html already fires the joba24:// scheme the instant the token
        // is captured (before React mounts), so the app opens near-instantly.
        // Re-fire here as a backup in case the inline script failed.
        try { window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`); } catch {}
        return;
      }
      if (android) {
        // The custom Codemagic Android build registers a joba24:// intent-filter
        // (same as iOS), so fire the scheme to trigger an automatic app return —
        // NativeAuthListener's appUrlOpen listener completes the login. The
        // return screen below stays as a fallback: if the scheme didn't resolve
        // (old auto-build / app not installed), the user sees the "close browser"
        // instructions and the existing handshake poll completes on browserFinished.
        try { window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`); } catch {}
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