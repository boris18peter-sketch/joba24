import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { requestNotificationPermission, getFCMToken, onForegroundMessage } from '@/lib/fcm';

export default function usePushNotifications() {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState(Notification.permission);
  const [foregroundMsg, setForegroundMsg] = useState(null);
  const tokenRef = useRef(null);

  // Save token to backend
  const saveToken = useCallback(async (fcmToken) => {
    if (!fcmToken || fcmToken === tokenRef.current) return;
    try {
      const me = await base44.auth.me();
      if (!me) return;
      const existingUser = await base44.asServiceRole.entities.User.filter({ id: me.id });
      const currentUser = existingUser[0];
      if (!currentUser) return;
      
      const existingTokens = currentUser.fcm_tokens || [];
      if (existingTokens.includes(fcmToken)) return;

      await base44.entities.User.update(me.id, {
        fcm_tokens: [...existingTokens, fcmToken]
      });
      tokenRef.current = fcmToken;
      console.log('FCM token saved');
    } catch (err) {
      console.error('Failed to save FCM token:', err);
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

  // Auto-init on mount
  useEffect(() => {
    const init = async () => {
      const perm = Notification.permission;
      setPermission(perm);

      if (perm === 'granted') {
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          setToken(fcmToken);
          await saveToken(fcmToken);
        }
      }
    };
    init();
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