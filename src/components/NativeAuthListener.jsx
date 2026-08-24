import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { InAppBrowser } from '@capgo/capacitor-inappbrowser';
import { base44 } from '@/api/base44Client';

// Native OAuth callback receiver.
//
// On mobile, OAuth opens in the system browser (Browser.open → SFSafariViewController
// on iOS, Chrome Custom Tab on Android). After auth the backend redirects to
// /auth-callback, which stores the access_token in a server handshake
// (nativeAuthHandshake). This component retrieves it.
//
//  1. iOS (when the scheme works): the joba24:// custom scheme is registered in
//     Info.plist, so appUrlOpen fires with the token — instant return.
//  2. iOS/Android fallback: SFSafariViewController does NOT reliably fire
//     appUrlOpen for custom schemes (known iOS limitation), and Android's
//     manifest has no joba24:// scheme at all. So we poll the server handshake.
//
// IMPORTANT: the `sid` is written to localStorage by LoginPromptModal right
// BEFORE Browser.open — i.e. AFTER this component already mounted. So we cannot
// read it once on mount; the interval below keeps re-checking and polls
// whenever a sid appears. The app's WKWebView keeps running JS timers while
// the in-app Safari sheet is open, so the token is picked up shortly after
// /auth-callback stores it, and Browser.close() auto-dismisses the sheet.
// Guards against a double-fire of applyToken on iOS (the joba24:// bounce via
// appUrlOpen AND the handshake poll can BOTH deliver the token for the same
// login). Two concurrent applyToken → window.location.reload() calls race, and
// the second reload tears down the page before the first Browser.close()
// finishes — leaving @capacitor/browser's SFSafariViewController reference
// stuck, so the NEXT login's Browser.open is a silent no-op. One apply per
// page load; the flag resets on reload (module re-evaluates).
let authApplied = false;

export default function NativeAuthListener() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let stopped = false;
    let appUrlListener;
    let stateListener;

    const applyToken = async (token) => {
      if (!token || authApplied) return;
      authApplied = true;
      localStorage.setItem('base44_access_token', token);
      localStorage.setItem('token', token);
      localStorage.removeItem('joba24_auth_sid');
      // Dismiss the in-app browser sheet (SFSafariViewController / Chrome Custom
      // Tab) BEFORE reloading. Without awaiting, window.location.reload() unloads
      // the page before Browser.close() finishes dismissing the sheet, leaving
      // the browser open on top of the (now-logged-in) app until the user
      // manually taps "Done"/"Open". Race against a timeout so a hung close()
      // never blocks the reload.
      try {
        await Promise.race([
          Promise.all([Browser.close(), InAppBrowser.close().catch(() => {})]),
          new Promise((r) => setTimeout(r, 1000))
        ]);
      } catch {}
      window.location.reload();
    };

    // Poll the server handshake once (no-op if no sid is present yet).
    const pollOnce = async () => {
      if (stopped) return;
      const sid = localStorage.getItem('joba24_auth_sid');
      if (!sid) return;
      try {
        const res = await base44.functions.invoke('nativeAuthHandshake', { action: 'poll', sid });
        const token = res?.data?.token ?? res?.token ?? null;
        if (token) {
          applyToken(token);
          return;
        }
      } catch {}
    };

    // 1) iOS: appUrlOpen fires when the joba24:// scheme opens the app.
    (async () => {
      try {
        appUrlListener = await App.addListener('appUrlOpen', ({ url }) => {
          if (!url || !url.startsWith('joba24://auth-callback')) return;
          let token = null;
          try {
            const u = new URL(url);
            token = u.searchParams.get('access_token');
          } catch {}
          if (token) applyToken(token);
        });
      } catch (err) {
        console.error('[NativeAuthListener] appUrlOpen listener failed', err);
      }
    })();

    // 2) Keep polling while a handshake is pending. Re-checks the sid on every
    //    tick so a login started after mount is still picked up.
    const pollTimer = setInterval(pollOnce, 1500);
    pollOnce();

    // 3) When the app returns to the foreground (user dismissed the in-app
    //    Safari sheet manually), poll immediately for a snappier return.
    (async () => {
      try {
        stateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) pollOnce();
        });
      } catch {}
    })();

    return () => {
      stopped = true;
      clearInterval(pollTimer);
      const removeListener = (l) => {
        if (l && typeof l.remove === 'function') l.remove();
        else if (l && typeof l.then === 'function') l.then((x) => x && x.remove && x.remove());
      };
      removeListener(appUrlListener);
      removeListener(stateListener);
    };
  }, []);

  return null;
}