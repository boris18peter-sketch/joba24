import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { hasCapacitorBridge, isAndroidWebView } from '@/lib/nativeEnv';
import {
  checkLocationPermission,
  getCurrentPosition,
  waitForLocationPermissionSettled,
} from '@/lib/nativeGeolocation';

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
 * a time, and the feed already opens the location dialog on startup. Asking for
 * notifications while that dialog is still on screen makes Android DROP the
 * notification request silently — the dialog simply never appears. So we always
 * let the location dialog finish first (waitForLocationPermissionSettled), then ask
 * for notifications. Never reverse this order or run the two in parallel.
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
     * Opens the OS location dialog. The position call is what triggers it, and it
     * is bounded by its own timeout — so an ignored dialog can never hang the
     * notification request that comes after it.
     */
    const openLocationDialog = () => new Promise((resolve) => {
      getCurrentPosition(() => resolve(), () => resolve(), {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      });
    });

    /**
     * Asks for notification permission.
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
      // ── 1) LOCATION FIRST ──
      // The feed opens the location dialog on startup. Wait for it to be answered
      // before doing anything else, so we never collide with it.
      if (hasCapacitorBridge()) await waitForLocationPermissionSettled(4000);
      if (cancelled) return;

      if (!inEmbeddedFrame()) {
        const loc = await checkLocationPermission();
        // Only ask while undecided — an answered permission returns instantly with
        // no dialog, so this never nags.
        if (loc === 'default') await openLocationDialog();
      }
      if (cancelled) return;

      // ── 2) NOTIFICATIONS, once the location dialog is off the screen ──
      if (hasCapacitorBridge()) await waitForLocationPermissionSettled(4000);
      if (cancelled) return;

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