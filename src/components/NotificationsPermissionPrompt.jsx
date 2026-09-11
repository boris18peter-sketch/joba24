import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { base44 } from '@/api/base44Client';
import { isAndroidWebView, hasCapacitorBridge } from '@/lib/nativeEnv';
import { Bell, X } from 'lucide-react';

/**
 * Silent permission requester — directly triggers the native OS dialog.
 * No custom popup is shown. Only fires when:
 *  - Notifications API is supported
 *  - Permission status is still 'default' (not determined)
 *  - We haven't already asked on this device
 *
 * On iOS PWA, Notification.requestPermission() must be triggered from a
 * user gesture. We listen for the first user interaction (click/touch)
 * and then request permission.
 *
 * If already granted → re-registers the FCM token silently.
 * If already denied → does nothing (user must re-enable via browser/OS settings).
 *
 * On Android WebView WITHOUT a Capacitor bridge (old server.url build),
 * the web Notification API CANNOT trigger the native POST_NOTIFICATIONS
 * dialog — the WebView doesn't support notification permission prompts.
 * So we show a one-time settings redirect modal instead.
 */
export default function NotificationsPermissionPrompt() {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    // ── Android WebView without bridge — show settings redirect modal ──
    if (isAndroidWebView() && !hasCapacitorBridge()) {
      (async () => {
        try {
          const me = await base44.auth.me();
          if (!me) return;
          // Already has FCM token → notifications are enabled, no need to prompt
          if (me.fcm_tokens?.length > 0) return;
          // Check if we already showed this prompt (dismissed by user)
          if (localStorage.getItem('joba24_notif_settings_dismissed') === '1') return;
          // Show the settings redirect modal
          setShowSettingsModal(true);
        } catch {}
      })();
      return;
    }

    // Native Capacitor path (real iOS APNs) — only when the bridge is ACTUALLY available.
    // Native Capacitor (real iOS APNs) — the web Notification API does NOT exist in
    // WKWebView, so we MUST branch here BEFORE the web guard. Otherwise the prompt
    // bails out immediately on native and the OS permission dialog never fires
    // (which is why the "Notifications" row never appears in iOS app settings).
    const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
    if (isNative) {
      let cancelled = false;
      let gestureHandler = null;
      let mountTimer = null;
      (async () => {
        try {
          const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
          const { receive } = await FirebaseMessaging.checkPermissions();
          if (cancelled) return;
          // Already granted → silently (re)register the FCM/APNs token
          if (receive === 'granted') {
            const token = await getFCMToken();
            if (!token || cancelled) return;
            const me = await base44.auth.me();
            if (!me) return;
            const existing = me.fcm_tokens || [];
            if (!existing.includes(token)) await base44.auth.updateMe({ fcm_tokens: [...existing, token] });
            window.dispatchEvent(new Event('notif_permission_changed'));
            return;
          }
          // Denied → user must re-enable via OS settings; nothing to do here
          if (receive === 'denied') return;
          // 'prompt' (not determined) → request the system permission.
          // iOS requires a user gesture for the APNs dialog (HIG). Android does
          // NOT require a gesture, so on Android we request on mount (short delay
          // to let the WebView settle) — this is why iOS showed the dialog but
          // Android silently never did.
          const platform = window.Capacitor?.getPlatform?.() || '';
          const requestNow = async () => {
            if (cancelled) return;
            try {
              const perm = await requestNotificationPermission();
              if (perm !== 'granted') return;
              const token = await getFCMToken();
              if (!token || cancelled) return;
              const me = await base44.auth.me();
              if (!me) return;
              const existing = me.fcm_tokens || [];
              if (!existing.includes(token)) await base44.auth.updateMe({ fcm_tokens: [...existing, token] });
              window.dispatchEvent(new Event('notif_permission_changed'));
            } catch (err) {
              console.error('[Notif][Native] Auto-request failed:', err?.message);
            }
          };
          if (platform === 'android') {
            mountTimer = setTimeout(requestNow, 600);
          } else {
            gestureHandler = requestNow;
            document.addEventListener('click', gestureHandler, { once: false });
            document.addEventListener('touchend', gestureHandler, { once: false });
          }
        } catch (err) {
          console.error('[Notif][Native] init failed:', err?.message);
        }
      })();
      return () => {
        cancelled = true;
        if (mountTimer) clearTimeout(mountTimer);
        if (gestureHandler) {
          document.removeEventListener('click', gestureHandler);
          document.removeEventListener('touchend', gestureHandler);
        }
      };
    }

    // Web path
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;

    // If already granted, just register the token silently
    if (Notification.permission === 'granted') {
      (async () => {
        const token = await getFCMToken();
        if (!token) return;
        const me = await base44.auth.me();
        if (!me) return;
        const existingTokens = me.fcm_tokens || [];
        if (!existingTokens.includes(token)) {
          await base44.auth.updateMe({ fcm_tokens: [...existingTokens, token] });
        }
        window.dispatchEvent(new Event('notif_permission_changed'));
      })();
      return;
    }

    // Permission is 'default' — wait for first user gesture (required for iOS PWA)
    // Clear stale flag: if permission is still 'default', a previous attempt failed
    // (e.g., missing manifest, SW error, user dismissed). Allow retry.
    localStorage.removeItem('joba24_notif_prompt_shown');

    let triggered = false;
    const requestOnGesture = () => {
      if (triggered) return;
      triggered = true;
      // Don't set flag yet — only set after we get a definitive answer (granted/denied)
      document.removeEventListener('click', requestOnGesture);
      document.removeEventListener('touchend', requestOnGesture);

      (async () => {
        try {
          const perm = await requestNotificationPermission();
          // Only mark as shown if we got a definitive answer
          // If still 'default' (user dismissed or error), allow retry next session
          if (perm === 'granted' || perm === 'denied') {
            localStorage.setItem('joba24_notif_prompt_shown', '1');
          }
          if (perm !== 'granted') return;

          const token = await getFCMToken();
          if (!token) return;

          const me = await base44.auth.me();
          if (!me) return;

          const existingTokens = me.fcm_tokens || [];
          if (!existingTokens.includes(token)) {
            await base44.auth.updateMe({ fcm_tokens: [...existingTokens, token] });
          }
          window.dispatchEvent(new Event('notif_permission_changed'));
        } catch (err) {
          console.error('[Notif] Auto-request failed:', err?.message);
        }
      })();
    };

    // Listen for first user gesture
    document.addEventListener('click', requestOnGesture, { once: false });
    document.addEventListener('touchend', requestOnGesture, { once: false });

    return () => {
      document.removeEventListener('click', requestOnGesture);
      document.removeEventListener('touchend', requestOnGesture);
    };
  }, []);

  if (showSettingsModal) {
    return createPortal(
      <div
        dir="rtl"
        onClick={(e) => { if (e.target === e.currentTarget) { setShowSettingsModal(false); localStorage.setItem('joba24_notif_settings_dismissed', '1'); } }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{
          width: '100%', maxWidth: 360, borderRadius: 24,
          background: 'var(--surface-2)', padding: '28px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
        }}>
          <button
            onClick={() => { setShowSettingsModal(false); localStorage.setItem('joba24_notif_settings_dismissed', '1'); }}
            style={{ position: 'absolute', top: 16, left: 16, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-2)' }}
          >
            <X size={20} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 4px 16px rgba(26,111,212,0.3)',
            }}>
              <Bell size={26} color="white" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: '0 0 8px' }}>
              הפעלת התראות
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              כדי לקבל התראות על משימות מתאימות, יש לאפשר זאת בהגדרות המכשיר:
            </p>
          </div>

          <div style={{ background: 'var(--surface-3)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.8 }}>
              הגדרות ← אפליקציות ← Joba24<br />← התראות ← אפשר הכל
            </div>
          </div>

          <a
            href="intent://#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.app.extra.APP_PACKAGE=com.base69e6bdb4986a04a256653a23.app;end"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              color: 'white', textDecoration: 'none',
              fontWeight: 900, fontSize: 15,
              boxShadow: '0 4px 16px rgba(26,111,212,0.35)',
            }}
          >
            <Bell size={18} />
            פתח הגדרות התראות
          </a>
          <button
            onClick={() => { setShowSettingsModal(false); localStorage.setItem('joba24_notif_settings_dismissed', '1'); }}
            style={{
              width: '100%', height: 48, borderRadius: 16, marginTop: 10,
              background: 'var(--surface-3)', border: '1px solid var(--border-1)',
              color: 'var(--text-1)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            אולי אחר כך
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return null;
}