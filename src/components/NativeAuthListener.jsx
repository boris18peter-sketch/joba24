import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// Native OAuth callback receiver.
//
// On iOS/Android the OAuth flow opens the provider in the system browser
// (Browser.open). When auth completes, the backend redirects to our
// /auth-callback page (https), which bounces to the `joba24://` custom scheme.
// iOS/Android intercept that scheme and open the native app, firing
// Capacitor's `appUrlOpen` event with `joba24://auth-callback?access_token=...`.
//
// This listener captures the token, stores it where appParams reads it on
// reload (localStorage `base44_access_token`), closes the external browser,
// and reloads the app so AuthContext authenticates the user — exactly like the
// web flow (where the token arrives via the URL).
export default function NativeAuthListener() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener;
    let disposed = false;

    (async () => {
      try {
        listener = await App.addListener('appUrlOpen', ({ url }) => {
          if (!url || !url.startsWith('joba24://auth-callback')) return;
          try {
            const u = new URL(url);
            const token = u.searchParams.get('access_token');
            if (token) {
              localStorage.setItem('base44_access_token', token);
              localStorage.setItem('token', token);
            }
          } catch {}
          try { Browser.close(); } catch {}
          window.location.reload();
        });
      } catch (err) {
        console.error('[NativeAuthListener] appUrlOpen listener failed', err);
      }
    })();

    return () => {
      disposed = true;
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      } else if (listener && typeof listener.then === 'function') {
        listener.then((l) => l && l.remove && l.remove());
      }
      void disposed;
    };
  }, []);

  return null;
}