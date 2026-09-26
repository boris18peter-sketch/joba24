import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { hasCapacitorBridge, isAndroidWebView } from '@/lib/nativeEnv';

// Runs ONCE per app load (module-level, not per navigation) and asks the OS for
// notification permission. No custom UI — the native/OS dialog is the only thing
// the user sees. While the OS still allows asking (permission undecided), the
// dialog is re-triggered on every app entry.
let ranThisLoad = false;

export default function NotificationPermissionPrompt() {
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

    // Returns true when the OS has an answer (granted/denied) — nothing more to ask.
    // Returns false while the dialog is still unanswered, so we can retry on a tap.
    const ask = async () => {
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
      // Already granted on the web path → just refresh the token, never re-ask.
      if (!hasCapacitorBridge() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await saveToken();
        return;
      }

      const settled = await ask();
      if (settled || cancelled) return;

      // Browsers (notably iOS Safari) require a user gesture to open the dialog,
      // and the embedded preview frame refuses outright. Retry once on the first tap.
      const onFirstGesture = async () => {
        window.removeEventListener('pointerdown', onFirstGesture, true);
        window.removeEventListener('keydown', onFirstGesture, true);
        await ask();
      };
      window.addEventListener('pointerdown', onFirstGesture, true);
      window.addEventListener('keydown', onFirstGesture, true);
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}