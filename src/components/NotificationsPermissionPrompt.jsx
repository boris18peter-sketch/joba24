import { useEffect } from 'react';
import { requestNotificationPermission, getFCMToken } from '@/lib/fcm';
import { base44 } from '@/api/base44Client';

/**
 * Silent permission requester — directly triggers the native OS dialog.
 * No custom popup is shown. Only fires when:
 *  - Notifications API is supported
 *  - Permission status is still 'default' (not determined)
 *  - We haven't already asked on this device
 *
 * If already granted → re-registers the FCM token silently.
 * If already denied → does nothing (user must re-enable via browser/OS settings).
 */
export default function NotificationsPermissionPrompt() {
  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem('joba24_notif_prompt_shown')) return;

    localStorage.setItem('joba24_notif_prompt_shown', '1');

    (async () => {
      try {
        // Directly trigger the native system permission dialog — no custom UI
        const perm = await requestNotificationPermission();
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
  }, []);

  return null;
}