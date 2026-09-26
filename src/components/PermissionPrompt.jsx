import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { hasCapacitorBridge, isAndroidWebView } from '@/lib/nativeEnv';
import { checkLocationPermission } from '@/lib/nativeGeolocation';

/**
 * Startup runtime-permission prompt — runs ONCE per app load and asks the OS for
 * the two permissions the app needs, in a fixed order:
 *
 *   1. Location
 *   2. Notifications
 *
 * There is no custom UI: the OS dialogs are the only thing the user sees. While a
 * permission is still undecided the OS keeps allowing the dialog, so it is
 * re-triggered on every app entry; once the user has answered (granted OR denied)
 * the OS refuses to show it again and we stay silent — no nagging.
 *
 * ORDER MATTERS ON ANDROID. The system shows only ONE runtime-permission dialog at
 * a time, and the feed already asks for location on startup. Asking for
 * notifications in parallel made the notification dialog disappear silently until
 * the next launch — so location is requested and awaited to completion FIRST, and
 * notifications are only requested afterwards. Never reverse this order or run the
 * two in parallel.
 */
let ranThisLoad = false;

export default function PermissionPrompt() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (ranThisLoad) return;
    ranThisLoad = true;

    let cancelled = false;

    // Register this device's push token (only after permission is granted).
    const saveToken = async () => {
      const fcmToken = await getFCMToken();
      if (!fcmToken || cancelled) return;
      try {
        const me = await base44.auth.me();
        const existing = me?.fcm_tokens || [];
        if (!existing.includes(fcmToken)) {
          await base44.auth.updateMe({ fcm_tokens: [...existing, fcmToken] });
        }
      } catch {}
    };

    // Browsers refuse to open permission dialogs inside an embedded frame
    // (the in-app preview) — they resolve instantly as denied with no dialog.
    const inEmbeddedFrame = () => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    };

    /**
     * Step 1 — location.
     * Returns 'granted' | 'denied' | 'default' (undecided) | 'unavailable'.
     * An already-answered permission returns instantly WITHOUT a dialog, so this
     * is safe to call on every entry.
     */
    const askLocation = async () => {
      const current = await checkLocationPermission();
      if (current !== 'default') return current;
      if (cancelled) return current;

      // Native app — triggers the real OS location dialog.
      if (hasCapacitorBridge()) {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          const status = await Geolocation.requestPermissions();
          return status.location;
        } catch {
          return 'unavailable';
        }
      }

      // Web / PWA — the browser dialog is opened by requesting a position.
      if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unavailable';
      if (inEmbeddedFrame()) return 'unavailable';
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          (err) => resolve(err?.code === 1 ? 'denied' : 'prompt'),
          { timeout: 15000 }
        );
      });
    };

    /**
     * Step 2 — notifications.
     * Returns true when the OS has an answer (granted/denied) so there is nothing
     * left to ask; false while the dialog is still unanswered, so it can be retried
     * on the first user gesture.
     */
    const askNotifications = async () => {
      // Android WebView without the Capacitor bridge can never show the OS dialog —
      // the WebView's Notification API resolves 'denied' instantly. Skip it so we
      // don't record a false denial.
      if (isAndroidWebView() && !hasCapacitorBridge()) return true;

      const perm = await requestNotificationPermission();
      if (cancelled) return true;
      if (perm === 'granted') {
        await saveToken();
        return true;
      }
      // 'prompt' → dismissed without an answer. 'unavailable' → dialog could not
      // be opened (e.g. embedded preview frame); both are worth one retry on a tap.
      return perm !== 'prompt' && perm !== 'unavailable';
    };

    (async () => {
      // ── 1) Location FIRST, and wait for it to be answered ──
      await askLocation();
      if (cancelled) return;

      // ── 2) Only now is it safe to open the notification dialog ──
      // Already granted on the web path → just refresh the token, never re-ask.
      if (!hasCapacitorBridge() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await saveToken();
        return;
      }

      const settled = await askNotifications();
      if (settled || cancelled) return;

      // Browsers (notably iOS Safari) require a user gesture to open the dialog,
      // and the embedded preview frame refuses outright. Retry once on the first tap.
      const onFirstGesture = async () => {
        window.removeEventListener('pointerdown', onFirstGesture, true);
        window.removeEventListener('keydown', onFirstGesture, true);
        await askNotifications();
      };
      window.addEventListener('pointerdown', onFirstGesture, true);
      window.addEventListener('keydown', onFirstGesture, true);
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}