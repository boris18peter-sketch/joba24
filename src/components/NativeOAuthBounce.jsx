import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';

// Runs in the EXTERNAL browser (SFSafariViewController / Chrome Custom Tab) after
// OAuth redirects back to joba24.com with the access token. The token + sid are
// captured from the URL by an inline script in index.html (before the app module
// strips the token) and stashed in sessionStorage. Whatever page the redirect
// lands on (home, /auth-callback, …), this relays the token to the server
// handshake so the native app can poll for it and return the user in-app — no
// custom scheme required (SFSafariViewController does not reliably support
// custom-scheme callbacks). The app (NativeAuthListener) picks up the token and
// calls Browser.close() to dismiss the in-app browser sheet.
export default function NativeOAuthBounce() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // only in the external browser
    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');
    if (!token) return;
    sessionStorage.removeItem('joba24_oauth_token');
    sessionStorage.removeItem('joba24_oauth_sid');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    (async () => {
      try {
        await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
      } catch {}
      // Bounce back to the app for an instant return.
      // iOS: joba24:// (Info.plist) → appUrlOpen. Android: intent:// launches the
      // app if the joba24:// intent-filter is in the manifest, else Chrome opens
      // the fallback URL (this page) — the app then polls on resume. Either way
      // no "page not found" error.
      try {
        if (isIOS) {
          window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`);
        } else {
          const fallback = encodeURIComponent(window.location.href);
          window.location.replace(`intent://auth-callback?access_token=${encodeURIComponent(token)}#Intent;scheme=joba24;package=com.base69e6bdb4986a04a256653a23.app;S.browser_fallback_url=${fallback};end`);
        }
      } catch {}
    })();
  }, []);
  return null;
}