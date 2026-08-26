import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { completeNativeAuth, pollHandshakeToken } from '@/lib/nativeAuthComplete';

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

    const applyToken = (token) => completeNativeAuth(token);

    let pollAlerted = false;
    // Poll the server handshake once (no-op if no sid is present yet).
    const pollOnce = async () => {
      if (stopped) return;
      const sid = localStorage.getItem('joba24_auth_sid');
      if (!sid) return;
      if (!pollAlerted) {
        pollAlerted = true;
        try { alert('🔵 DEBUG POLL START\nsid=' + sid + '\nlen=' + sid.length); } catch {}
      }
      const token = await pollHandshakeToken(sid);
      if (token) {
        try { alert('🔵 DEBUG TOKEN FOUND\nlen=' + (token?.length || 0)); } catch {}
        applyToken(token);
      }
    };

    // Burst-poll: retry rapidly many times. Used on mount and whenever the app
    // returns to the foreground / the browser tab is dismissed — the token may
    // not be stored yet (race with /auth-callback's store call, which has
    // retries and network latency), so we retry until it appears. Stops as soon
    // as applyToken fires (it clears the sid). 120 attempts × 300ms = 36 seconds,
    // enough to cover slow networks and the async handshake store retries.
    let burstRunning = false;
    const pollBurst = () => {
      if (stopped || burstRunning) return;
      burstRunning = true;
      try { alert('🔵 DEBUG EVENT: BURST STARTED'); } catch {}
      console.log('[NativeAuthListener] pollBurst started');
      let attempts = 0;
      const tick = async () => {
        if (stopped || attempts++ > 120) { burstRunning = false; return; }
        await pollOnce();
        if (!stopped && localStorage.getItem('joba24_auth_sid')) {
          setTimeout(tick, 200);
        } else {
          burstRunning = false;
        }
      };
      tick();
    };

    // 1) iOS: appUrlOpen fires when the joba24:// scheme opens the app.
    (async () => {
      try {
        appUrlListener = await App.addListener('appUrlOpen', ({ url }) => {
          try { alert('🔵 DEBUG EVENT: appUrlOpen\nurl=' + (url || '')); } catch {}
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
          try { alert('🔵 DEBUG EVENT: appStateChange\nisActive=' + isActive); } catch {}
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
          try { alert('🔵 DEBUG EVENT: browserFinished'); } catch {}
          pollBurst();
        });
      } catch {}
    })();

    // 5) document.visibilitychange — fires the INSTANT the WebView regains
    //    focus, before the Capacitor appStateChange event. On Android, when the
    //    user presses back to dismiss the Custom Tab, the WebView's visibility
    //    flips to 'visible' immediately — this is the fastest signal we get
    //    that the user is back. Start a burst poll right away.
    const onVisibility = () => {
      try { alert('🔵 DEBUG EVENT: visibilitychange\nstate=' + document.visibilityState); } catch {}
      if (document.visibilityState === 'visible') pollBurst();
    };
    document.addEventListener('visibilitychange', onVisibility);

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
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}