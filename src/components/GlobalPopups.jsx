import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { notificationStore } from '@/lib/notificationStore';
import LiveNotificationPopup from '@/components/LiveNotificationPopup';

/**
 * GlobalPopups — renders LiveNotificationPopup on ALL authenticated pages.
 * Mounted at App.jsx level (inside AuthenticatedApp) so it survives route changes,
 * including pages outside Layout (e.g. /chat/:taskId, /support).
 */
export default function GlobalPopups() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    return notificationStore.subscribe(setNotifications);
  }, []);

  if (notifications.length === 0) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top) + 12px)',
      left: 0, right: 0,
      zIndex: 9999999,
      pointerEvents: 'none',
    }}>
      {notifications.map((notif) => (
        <div key={notif.id} style={{ pointerEvents: 'auto' }}>
          <LiveNotificationPopup notification={notif} onClose={() => notificationStore.removeNotification()} />
        </div>
      ))}
    </div>,
    document.body
  );
}