import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { hasCapacitorBridge, isAndroidWebView } from '@/lib/nativeEnv';

/**
 * Startup runtime-permission prompt — asks for NOTIFICATIONS, once per app load.
 *
 * ── LOCATION IS NOT ASKED FOR HERE ANY MORE ────────────────────────────────
 * It used to be asked at startup, before anything else, so every visitor met the
 * OS location dialog — or, once refused, the "location blocked" sheet — before
 * they had asked the app for a single thing. A feed can order itself without a
 * position; only distances and the "nearby" section need one.
 *
 * Location is now requested at the moment it is actually wanted: the empty
 * feed's "הפעילו מיקום" button, the map, or "use my current location" in the
 * publish form. Whichever of those asks explains a refusal, because only then
 * did the visitor ask for anything. See isLocationWanted paths in HomeFeed and
 * AddressAutocomplete.
 *
 * Notifications stay here deliberately: an update that arrives while the app is
 * closed is the feature, so a user who never opens a "turn on notifications"
 * screen still has to be asked once. The answer is final — the OS refuses to
 * re-open the dialog once it has been given, and nothing here tries again on a
 * later launch.
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
      if (inEmbeddedFrame()) return;

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