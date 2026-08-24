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
    if (!token || !sid) return;
    sessionStorage.removeItem('joba24_oauth_token');
    sessionStorage.removeItem('joba24_oauth_sid');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    (async () => {
      try {
        await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid, token });
      } catch {}
      // iOS fast-path: the joba24:// scheme is registered in Info.plist, so try
      // an instant return. If SFSafariViewController blocks it, the app still
      // returns via the handshake poll (NativeAuthListener) within ~1.5s.
      if (isIOS) {
        try {
          window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`);
        } catch {}
      }
    })();
  }, []);
  return null;
}