import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { completeNativeAuth, pollHandshakeToken } from '@/lib/nativeAuthComplete';

// Native OAuth callback receiver.
//
// On mobile, OAuth opens in the system browser (Browser.open → SFSafariViewController
// on iOS, Chrome Custom Tab on Android). After auth the backend redirects to
// /auth-callback (or the app base), which stores the access_token in a server
// handshake (nativeAuthHandshake). This component retrieves it.
//
// The `sid` is written to localStorage by LoginPromptModal right BEFORE
// Browser.open. We poll whenever a sid is present and burst-poll whenever the
// app returns to the foreground / the browser tab is dismissed, so the token is
// picked up shortly after /auth-callback stores it.

export default function NativeAuthListener() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let stopped = false;
    let appUrlListener;
    let stateListener;
    let browserFinishedListener;

    const applyToken = (token) => completeNativeAuth(token);

    const pollOnce = async () => {
      if (stopped) return;
      const sid = localStorage.getItem('joba24_auth_sid');
      if (!sid) return;
      const token = await pollHandshakeToken(sid);
      if (token) applyToken(token);
    };

    // Burst-poll: retry rapidly. Used on mount and whenever the app returns to
    // the foreground / the browser tab is dismissed — the token may not be
    // stored yet (race with /auth-callback's store call), so we retry until it
    // appears. Stops as soon as applyToken fires (it clears the sid).
    let burstRunning = false;
    const pollBurst = () => {
      if (stopped || burstRunning) return;
      burstRunning = true;
      let attempts = 0;
      const tick = async () => {
        if (stopped || attempts++ > 120) { burstRunning = false; return; }
        await pollOnce();
        if (!stopped && localStorage.getItem('joba24_auth_sid')) {
          setTimeout(tick, 250);
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

    // 2) Keep polling while a handshake is pending.
    const pollTimer = setInterval(pollOnce, 1000);
    pollBurst();

    // 3) App returns to foreground → poll immediately.
    (async () => {
      try {
        stateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) pollBurst();
        });
      } catch {}
    })();

    // 4) Android: browserFinished fires when the Chrome Custom Tab is dismissed.
    (async () => {
      try {
        browserFinishedListener = await Browser.addListener('browserFinished', () => {
          pollBurst();
        });
      } catch {}
    })();

    // 5) document.visibilitychange — fastest signal that the user is back.
    const onVisibility = () => {
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