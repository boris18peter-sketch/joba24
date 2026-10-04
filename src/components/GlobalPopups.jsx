import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { notificationStore } from '@/lib/notificationStore';
import { taskAlertStore } from '@/lib/taskAlertStore';
import { useAuth } from '@/lib/AuthContext';
import { useVerificationCelebration } from '@/hooks/useVerificationCelebration';
import useTaskAlerts from '@/hooks/useTaskAlerts';
import LiveNotificationPopup from '@/components/LiveNotificationPopup';
import ReturnToTaskPopup from '@/components/ReturnToTaskPopup';
import VerificationApprovedPopup from '@/components/VerificationApprovedPopup';
import WorkerCancelledPopup from '@/components/WorkerCancelledPopup';
import ApprovalRevokedPopup from '@/components/ApprovalRevokedPopup';
import CancelSuccessPopup from '@/components/CancelSuccessPopup';

/**
 * GlobalPopups — renders the live notification banner AND the full-screen task
 * alerts on ALL authenticated pages.
 *
 * Mounted at App.jsx level (inside AuthenticatedApp) so it survives route
 * changes, including pages outside Layout (e.g. /chat/:taskId, /support).
 * The task alerts (task cancelled by publisher, approval revoked, cancellation
 * success) previously lived in Layout state, so they were invisible to a user
 * who was on a standalone screen when the event happened.
 */
export default function GlobalPopups() {
  const [notifications, setNotifications] = useState([]);
  const [taskAlert, setTaskAlert] = useState(null);
  const { user } = useAuth();
  const { celebration, clearCelebration } = useVerificationCelebration(user);

  // Detects a publisher cancellation on every route and raises it on the store.
  useTaskAlerts(user?.id);

  useEffect(() => {
    return notificationStore.subscribe(setNotifications);
  }, []);

  useEffect(() => {
    return taskAlertStore.subscribe(setTaskAlert);
  }, []);

  return (
    <>
      {celebration && <VerificationApprovedPopup variant={celebration} onClose={clearCelebration} />}

      {taskAlert?.kind === 'cancelled' && createPortal(
        <WorkerCancelledPopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />,
        document.body
      )}
      {taskAlert?.kind === 'revoked' && createPortal(
        <ApprovalRevokedPopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />,
        document.body
      )}
      {taskAlert?.kind === 'cancel_success' && createPortal(
        <CancelSuccessPopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />,
        document.body
      )}

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