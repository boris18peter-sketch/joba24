import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken, onForegroundMessage } from '@/lib/fcm';

// Module-level singleton: ensures token init runs ONCE across all hook instances
let globalInitDone = false;
let globalInitPromise = null;

export default function usePushNotifications() {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied');
  const [foregroundMsg, setForegroundMsg] = useState(null);
  const tokenRef = useRef(null);

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
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm !== 'granted') return null;

    const fcmToken = await getFCMToken();
    if (fcmToken) {
      setToken(fcmToken);
      await saveToken(fcmToken);
    }
    return fcmToken;
  }, [saveToken]);

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
    });
    return () => { if (unsub) unsub(); };
  }, []);

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