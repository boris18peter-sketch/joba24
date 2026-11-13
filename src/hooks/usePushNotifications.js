import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken, onForegroundMessage } from '@/lib/fcm';
import { hasCapacitorBridge } from '@/lib/nativeEnv';
import { useTaskSheet } from '@/lib/TaskSheetContext';

// Module-level singleton: ensures token init runs ONCE across all hook instances
let globalInitDone = false;
let globalInitPromise = null;

/**
 * enablePushNotifications — ask for the notification permission, obtain the
 * device token and persist it on the user's record.
 *
 * Exported as a plain function so a screen that only needs "turn notifications
 * on" (the empty feed) can do it WITHOUT mounting the hook a second time — a
 * second instance would register the native tap listener twice.
 */
export async function enablePushNotifications() {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return { permission, token: null };
  const fcmToken = await getFCMToken();
  if (!fcmToken) return { permission: 'granted', token: null };
  try {
    const me = await base44.auth.me();
    const existing = me?.fcm_tokens || [];
    if (!existing.includes(fcmToken)) {
      await base44.auth.updateMe({ fcm_tokens: [...existing, fcmToken] });
    }
  } catch {
    /* a token that could not be saved is simply asked for again next time */
  }
  return { permission: 'granted', token: fcmToken };
}

export default function usePushNotifications() {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState(() => {
    if (hasCapacitorBridge()) return 'prompt';
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  });
  const [foregroundMsg, setForegroundMsg] = useState(null);
  const tokenRef = useRef(null);
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();

  // Save token to backend using auth.updateMe (user-scoped, not admin)
  const saveToken = useCallback(async (fcmToken) => {
    if (!fcmToken || fcmToken === tokenRef.current) return;
    try {
      const me = await base44.auth.me();
      if (!me) return;
      
      const existingTokens = me.fcm_tokens || [];
      if (existingTokens.includes(fcmToken)) return;

      // Use auth.updateMe() for user-scoped update
      await base44.auth.updateMe({
        fcm_tokens: [...existingTokens, fcmToken]
      });
      tokenRef.current = fcmToken;
      console.log('[usePushNotifications] ✅ Token saved:', fcmToken.substring(0, 30) + '...');
    } catch (err) {
      console.error('[usePushNotifications] ❌ Failed to save FCM token:', err.message);
    }
  }, []);

  // Request permission and get token
  const enableNotifications = useCallback(async () => {
    const { permission: perm, token: fcmToken } = await enablePushNotifications();
    setPermission(perm);
    if (perm !== 'granted') return null;
    if (fcmToken) {
      setToken(fcmToken);
      tokenRef.current = fcmToken;
    }
    return fcmToken;
  }, []);

  // Auto-init on mount — runs only once globally to prevent duplicate token registrations
  useEffect(() => {
    if (globalInitDone) return;
    if (globalInitPromise) {
      globalInitPromise.then((fcmToken) => {
        if (fcmToken) { setToken(fcmToken); setPermission('granted'); }
      });
      return;
    }

    globalInitPromise = (async () => {
      // Native Capacitor path — check current permission (no prompt), get token if granted
      if (hasCapacitorBridge()) {
        try {
          const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
          const { receive } = await FirebaseMessaging.checkPermissions();
          const perm = receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt';
          setPermission(perm);
          if (perm !== 'granted') return null;
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            setToken(fcmToken);
            await saveToken(fcmToken);
            globalInitDone = true;
            return fcmToken;
          }
        } catch (err) {
          console.error('[usePushNotifications][Native] init failed:', err.message);
        }
        return null;
      }

      // Web path
      if (typeof Notification === 'undefined') {
        setPermission('denied');
        return null;
      }
      const perm = Notification.permission;
      setPermission(perm);
      if (perm !== 'granted') return null;

      const fcmToken = await getFCMToken();
      if (fcmToken) {
        setToken(fcmToken);
        await saveToken(fcmToken);
        globalInitDone = true;
        return fcmToken;
      }
      return null;
    })();

    globalInitPromise.catch(() => { globalInitPromise = null; });
  }, [saveToken]);

  // Listen for foreground messages
  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      setForegroundMsg(payload);
      // Notify AuthContext to refresh the user — real-time updates (e.g. verification
      // approval) need the user object to update for the celebration popup to fire.
      window.dispatchEvent(new CustomEvent('joba24:push-received', { detail: payload }));
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // Native only — handle notification TAP (notificationActionPerformed).
  // On iOS native, taps do NOT go through the service worker (firebase-messaging-sw.js)
  // used by the web/PWA path — they come through this Capacitor listener instead.
  // The server sends the deep-link in the `url` field of the notification data
  // (e.g. "/task/{id}", "/chat/{id}", "/profile"), so we navigate to it via react-router.
  useEffect(() => {
    if (!hasCapacitorBridge()) return;
    let listenerHandle;
    let cancelled = false;
    (async () => {
      try {
        const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
        listenerHandle = await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
          try {
            const data = event?.notification?.data || {};
            const url = data.url || data.click_action || data.deep_link || '';
            if (!url) return;
            // Task deep-links ("/task/{id}") open the global TaskDetailSheet — the
            // same destination the in-app notification popup (LiveNotificationPopup)
            // and the /task/:id route use. Everything else (chat, profile, wallet,
            // agent-dashboard, …) navigates to its route.
            const taskMatch = String(url).match(/\/task\/([^/?]+)/);
            if (taskMatch) {
              openTaskSheet(taskMatch[1]);
            } else {
              navigate(url);
            }
          } catch (err) {
            console.error('[usePushNotifications][Native] tap navigation failed:', err?.message);
          }
        });
        if (cancelled && listenerHandle?.remove) listenerHandle.remove();
      } catch (err) {
        console.error('[usePushNotifications][Native] notificationActionPerformed listener failed:', err?.message);
      }
    })();
    return () => {
      cancelled = true;
      if (listenerHandle?.remove) listenerHandle.remove();
    };
  }, [navigate, openTaskSheet]);

  // Clear foreground message
  const clearMessage = useCallback(() => setForegroundMsg(null), []);

  return {
    token,
    permission,
    foregroundMsg,
    clearMessage,
    enableNotifications,
    notificationsEnabled: permission === 'granted',
  };
}