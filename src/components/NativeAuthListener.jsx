import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { base44 } from '@/api/base44Client';

// Native OAuth callback receiver.
//
// On mobile, OAuth opens in the system browser (Browser.open). After auth the
// backend redirects to /auth-callback, which stores the access_token in a
// server handshake (nativeAuthHandshake). This component retrieves it:
//
//  1. iOS: the joba24:// custom scheme is registered in Info.plist, so
//     /auth-callback bounces to it and Capacitor's `appUrlOpen` event fires with
//     the token — instant return.
//  2. Android (and iOS fallback): the joba24:// scheme is NOT registered in
//     the manifest (Base44 builds Android, manifest not editable), so we poll
//     the server handshake for the token instead. Works without any scheme.
//
// Once the token is captured, we store it where appParams reads it on reload
// (localStorage `base44_access_token`), close the external browser, and reload
// so AuthContext authenticates the user.
export default function NativeAuthListener() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener;
    let stopped = false;

    const applyToken = (token) => {
      if (!token) return;
      localStorage.setItem('base44_access_token', token);
      localStorage.setItem('token', token);
      localStorage.removeItem('joba24_auth_sid');
      try { Browser.close(); } catch {}
      window.location.reload();
    };

    // 1) iOS: appUrlOpen fires when the joba24:// scheme opens the app.
    (async () => {
      try {
        listener = await App.addListener('appUrlOpen', ({ url }) => {
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

    // 2) Poll the server handshake for the token (Android + iOS fallback).
    const sid = localStorage.getItem('joba24_auth_sid');
    if (sid) {
      let attempts = 0;
      const poll = async () => {
        if (stopped) return;
        attempts++;
        if (attempts > 200) return; // ~5 min at 1.5s intervals
        try {
          const res = await base44.functions.invoke('nativeAuthHandshake', { action: 'poll', sid });
          const token = res?.data?.token ?? res?.token ?? null;
          if (token) {
            applyToken(token);
            return;
          }
        } catch {}
        setTimeout(poll, 1500);
      };
      setTimeout(poll, 1500);
    }

    return () => {
      stopped = true;
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      } else if (listener && typeof listener.then === 'function') {
        listener.then((l) => l && l.remove && l.remove());
      }
    };
  }, []);

  return null;
}