import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
import { NativeReturnScreen } from '@/components/NativeReturnScreen';

// Fallback return screen for the native OAuth flow when the backend redirect
// lands on a page OTHER than /auth-callback (e.g. the custom domain redirected
// to the root but preserved the `sid` query). The dedicated /auth-callback route
// is handled by AuthCallback.jsx; this covers the remaining edge case via the
// `sid` sessionStorage signal (set by index.html from the URL query).
//
// Android-only (iOS returns via the registered joba24:// scheme). Gated on the
// `sid` so the web/PWA flow (which never sets a sid) is never affected.

const RETURN_FLAG = 'joba24_auth_return';

export default function NativeOAuthBounce() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [returnToken, setReturnToken] = useState(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // only in the external browser
    if (window.location.pathname === '/auth-callback') return; // AuthCallback handles it

    const android = /android/i.test(navigator.userAgent);
    if (!android) return;

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');
    // The Base44 OAuth backend often ignores from_url and redirects to the
    // app's canonical base44.app domain (dropping the sid). Landing there with
    // a fresh token is the native-flow signature on Android — the web/PWA flow
    // returns to the branded custom domain (joba24.com), not base44.app.
    const isBase44Domain = window.location.hostname.includes('base44.app');
    const isNativeFlow = !!sid || isBase44Domain;

    if (!token) {
      if (isNativeFlow && sessionStorage.getItem(RETURN_FLAG) === '1') setShowOverlay(true);
      return;
    }

    // Token present — store the handshake SYNCHRONOUSLY before showing the
    // overlay. The native app's pollBurst may start the instant the user
    // presses back; if the store is still in-flight, the poll finds nothing.
    if (isNativeFlow) sessionStorage.setItem(RETURN_FLAG, '1');
    (async () => {
      const storeWithRetry = async (attempt) => {
        try {
          await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
          console.log('[NativeOAuthBounce] ✅ token stored in handshake (attempt ' + attempt + ')');
          sessionStorage.removeItem('joba24_oauth_token');
          sessionStorage.removeItem('joba24_oauth_sid');
        } catch (err) {
          console.error('[NativeOAuthBounce] store attempt ' + attempt + ' failed:', err?.message);
          if (attempt < 5) {
            await new Promise(r => setTimeout(r, 400));
            return storeWithRetry(attempt + 1);
          }
        }
      };
      await storeWithRetry(1);
      if (isNativeFlow) {
        setReturnToken(token);
        setShowOverlay(true);
      }
    })();
  }, []);

  if (!showOverlay) return null;

  return <NativeReturnScreen returnToken={returnToken} />;
}