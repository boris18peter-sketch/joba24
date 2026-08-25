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
// (applyToken guards against double-fire using the pending sid — see below)

export default function NativeAuthListener() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let stopped = false;
    let appUrlListener;
    let stateListener;
    let browserFinishedListener;

    const applyToken = async (token) => {
      if (!token) return;
      // Only apply while a login is pending (a sid was set by LoginPromptModal
      // right before Browser.open). Clear it immediately so a second delivery
      // for the SAME login (appUrlOpen + poll both firing) is a no-op — no double
      // reload. A NEW login sets a fresh sid, so it is never blocked by a previous
      // login. (A module-level flag gets stuck "true" when logout does only an
      // in-app navigation instead of a full reload, silently breaking every
      // subsequent login — the "works once, then stays in the browser" bug. This
      // sid-based guard resets with each new login on BOTH iOS and Android.)
      const pendingSid = localStorage.getItem('joba24_auth_sid');
      if (pendingSid === null) return;
      localStorage.removeItem('joba24_auth_sid');
      localStorage.setItem('base44_access_token', token);
      localStorage.setItem('token', token);
      // Mask the stale login modal with a "connecting" screen so the user never
      // sees the login page flash during the ~1s the reload takes to paint the
      // authenticated app.
      try {
        if (!document.getElementById('joba24_auth_spin')) {
          const s = document.createElement('style');
          s.id = 'joba24_auth_spin';
          s.textContent = '@keyframes joba24_auth_spin{to{transform:rotate(360deg)}}';
          document.head.appendChild(s);
        }
        const ov = document.createElement('div');
        ov.id = 'joba24_auth_overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#ffffff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;font-family:Inter,system-ui,sans-serif;';
        ov.innerHTML = '<div style="width:36px;height:36px;border:3px solid #e8edf5;border-top-color:#1a6fd4;border-radius:50%;animation:joba24_auth_spin 0.8s linear infinite"></div><div style="font-size:14px;font-weight:500;color:#94a3b8;margin-top:6px">טוען...</div>';
        document.body.appendChild(ov);
      } catch {}
      // Dismiss the in-app browser (SFSafariViewController / Chrome Custom Tab)
      // before reloading; race against a timeout so a hung close() never blocks.
      try {
        await Promise.race([
          Promise.all([Browser.close(), InAppBrowser.close().catch(() => {})]),
          new Promise((r) => setTimeout(r, 1200))
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
          console.log('[NativeAuthListener] ✅ token found via poll');
          applyToken(token);
          return;
        }
      } catch (err) {
        console.warn('[NativeAuthListener] poll error:', err?.message);
      }
    };

    // Burst-poll: retry rapidly a few times. Used on mount and whenever the app
    // returns to the foreground / the browser tab is dismissed — the token may
    // not be stored yet (race with /auth-callback's store call), so we retry
    // until it appears. Stops as soon as applyToken fires (it clears the sid).
    const pollBurst = () => {
      if (stopped) return;
      console.log('[NativeAuthListener] pollBurst started');
      let attempts = 0;
      const tick = async () => {
        if (stopped || attempts++ > 30) return;
        await pollOnce();
        if (!stopped && localStorage.getItem('joba24_auth_sid')) {
          setTimeout(tick, 200);
        }
      };
      tick();
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
    const pollTimer = setInterval(pollOnce, 1000);
    pollBurst();

    // 3) When the app returns to the foreground (user dismissed the in-app
    //    Safari sheet manually), poll immediately for a snappier return.
    (async () => {
      try {
        stateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) pollBurst();
        });
      } catch {}
    })();

    // 4) Android: @capacitor/browser fires `browserFinished` when the Chrome
    //    Custom Tab is dismissed (back / close). Poll immediately for an instant
    //    return-to-app — this works WITHOUT any AndroidManifest intent-filter,
    //    so the native OAuth return works even when the manifest isn't customized.
    (async () => {
      try {
        browserFinishedListener = await Browser.addListener('browserFinished', () => {
          pollBurst();
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
      removeListener(browserFinishedListener);
    };
  }, []);

  return null;
}