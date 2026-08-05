import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { notificationStore } from '@/lib/notificationStore';
import { useAuth } from '@/lib/AuthContext';
import { useVerificationCelebration } from '@/hooks/useVerificationCelebration';
import LiveNotificationPopup from '@/components/LiveNotificationPopup';
import ReturnToTaskPopup from '@/components/ReturnToTaskPopup';
import VerificationApprovedPopup from '@/components/VerificationApprovedPopup';

/**
 * GlobalPopups — renders LiveNotificationPopup on ALL authenticated pages.
 * Mounted at App.jsx level (inside AuthenticatedApp) so it survives route changes,
 * including pages outside Layout (e.g. /chat/:taskId, /support).
 */
export default function GlobalPopups() {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();
  const { celebration, clearCelebration } = useVerificationCelebration(user);

  useEffect(() => {
    return notificationStore.subscribe(setNotifications);
  }, []);

  return (
    <>
      {celebration && <VerificationApprovedPopup variant={celebration} onClose={clearCelebration} />}
      {notifications.length > 0 && createPortal(
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
      )}
      <ReturnToTaskPopup />
    </>
  );
}