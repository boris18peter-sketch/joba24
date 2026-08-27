import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
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
      // Store the handshake SYNCHRONOUSLY before showing the return screen.
      // The native app's pollBurst may start the instant the user presses back;
      // if the store is still in-flight (async IIFE), the poll finds nothing and
      // the token is lost. Awaiting here guarantees the token is in the DB before
      // the user can dismiss the Custom Tab.
      const storeWithRetry = async (attempt) => {
        try {
          await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
          console.log('[AuthCallback] ✅ token stored in handshake (attempt ' + attempt + ')');
          sessionStorage.removeItem('joba24_oauth_token');
          sessionStorage.removeItem('joba24_oauth_sid');
        } catch (err) {
          console.error('[AuthCallback] store attempt ' + attempt + ' failed:', err?.message);
          if (attempt < 5) {
            await new Promise(r => setTimeout(r, 400));
            return storeWithRetry(attempt + 1);
          }
          // Keep the token in sessionStorage so a page reload can retry the store.
        }
      };
      (async () => {
        await storeWithRetry(1);
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
      })();
    } else if (android && sessionStorage.getItem(RETURN_FLAG) === '1') {
      // Reload / intent fallback — keep the return screen visible.
      setShowReturn(true);
    }
  }, []);

  if (!showReturn) return null;

  return <NativeReturnScreen returnToken={returnToken} />;
}