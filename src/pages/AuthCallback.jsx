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
//   • Android (no joba24:// intent-filter in the auto-build): shows a full-screen
//     "Continue in app" return screen. The user presses the system back / X button,
//     NativeAuthListener fires browserFinished → polls the handshake → completes
//     login. The screen persists across reloads via the RETURN_FLAG.

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