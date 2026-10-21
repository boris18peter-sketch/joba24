import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { notificationStore } from '@/lib/notificationStore';
import { taskAlertStore } from '@/lib/taskAlertStore';
import { useAuth } from '@/lib/AuthContext';
import { useVerificationCelebration } from '@/hooks/useVerificationCelebration';
import { useLoyaltyBonus } from '@/hooks/useLoyaltyBonus';
import useTaskAlerts from '@/hooks/useTaskAlerts';
import LiveNotificationPopup from '@/components/LiveNotificationPopup';
import ReturnToTaskPopup from '@/components/ReturnToTaskPopup';
import VerificationApprovedPopup from '@/components/VerificationApprovedPopup';
import WorkerCancelledPopup from '@/components/WorkerCancelledPopup';
import ApprovalRevokedPopup from '@/components/ApprovalRevokedPopup';
import CancelSuccessPopup from '@/components/CancelSuccessPopup';
import LoyaltyBonusPopup from '@/components/LoyaltyBonusPopup';

/**
 * GlobalPopups — renders the live notification stack AND the full-screen task
 * alerts on ALL authenticated pages.
 *
 * Mounted at App.jsx level (inside AuthenticatedApp) so it survives route
 * changes, including pages outside Layout (e.g. /chat/:taskId, /support).
 *
 * ── THE STACK ───────────────────────────────────────────────────────────────
 * Up to three banners, newest on top, the ones behind tucked up and very
 * slightly scaled so they read as one pile rather than three separate cards
 * fighting for the same strip of screen. When the top one leaves, the others
 * rise into its place instead of jumping — that is the `layout` prop doing the
 * work, and it is the difference between a stack and a list that keeps
 * rearranging itself.
 *
 * Every enter and exit is animated here rather than inside the banner, so a
 * banner can never be deleted mid-flight: AnimatePresence keeps it mounted
 * until it has finished leaving.
 *
 * ── IT SITS BELOW THE APP HEADER, NOT ON TOP OF IT ──────────────────────────
 * These banners used to be pinned to `safe-area + 12px` at a z-index above
 * everything, which is exactly where the app header lives — so every
 * notification covered the logo, the Joba balance and the menu button. The
 * header is 60px tall, so the stack starts under it: visible in the same place,
 * covering nothing the user needs to read or press.
 */
const HEADER_H = 60;

function NotifItem({ notif, index, onClose }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, scale: 0.94 }}
      animate={{
        opacity: index === 0 ? 1 : index === 1 ? 0.95 : 0.86,
        scale: index === 0 ? 1 : index === 1 ? 0.975 : 0.95,
      }}
      exit={{ opacity: 0, y: -22, scale: 0.92, transition: { duration: 0.22, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
      style={{
        width: '100%',
        maxWidth: 480,
        // A small tuck so the pile reads as a pile; the top banner keeps its
        // full height and everything below it slides under that edge.
        marginTop: index === 0 ? 0 : -8,
        zIndex: 10 - index,
        pointerEvents: 'auto',
      }}
    >
      <LiveNotificationPopup notification={notif} onClose={onClose} />
    </motion.div>
  );
}

export default function GlobalPopups() {
  const [notifications, setNotifications] = useState([]);
  const [taskAlert, setTaskAlert] = useState(null);
  const { user } = useAuth();
  const { celebration, clearCelebration } = useVerificationCelebration(user);
  const { bonus, clearBonus } = useLoyaltyBonus(user);

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

      {bonus && <LoyaltyBonusPopup amount={bonus.amount} kind={bonus.kind} user={user} onClose={clearBonus} />}

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
          top: `calc(env(safe-area-inset-top) + ${HEADER_H + 8}px)`,
          left: 0, right: 0,
          zIndex: 9999999,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 12px',
        }}>
          <AnimatePresence initial={false}>
            {notifications.map((notif, i) => (
              <NotifItem
                key={notif.id}
                notif={notif}
                index={i}
                onClose={() => notificationStore.removeNotification(notif.id)}
              />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
      <ReturnToTaskPopup />
    </>
  );
}