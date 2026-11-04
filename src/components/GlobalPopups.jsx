import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { notificationStore } from '@/lib/notificationStore';
import { taskAlertStore } from '@/lib/taskAlertStore';
import { invalidateTaskCaches } from '@/lib/taskSync';
import { ACTION_ALERT_KINDS, alertTaskId, isAlertResolved } from '@/lib/taskAlertValidity';
import { isPopupBlocked, subscribePopupGate } from '@/lib/popupGate';
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
import ApprovedDeparturePopup from '@/components/ApprovedDeparturePopup';
import NewApplicantPopup from '@/components/NewApplicantPopup';
import CompletionApprovalPopup from '@/components/CompletionApprovalPopup';

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
    // ── IT GLIDES DOWN FROM THE TOP EDGE ──────────────────────────────────
    // Notifications used to pop in from just above their own place and sit in a
    // scaled, negatively-spaced pile, which read as cards floating over the
    // screen. They now travel the whole way from above the top edge and out
    // again the same way — one motion, in and out — and each one keeps its full
    // size and its own spacing, so the stack reads as a clean list arriving
    // from the top of the screen rather than a pile hovering in it. `layout`
    // still lifts the rest up smoothly when one is dismissed.
    <motion.div
      layout
      initial={{ opacity: 0, y: -76 }}
      animate={{ opacity: index === 0 ? 1 : 0.96, y: 0 }}
      exit={{ opacity: 0, y: -88, transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } }}
      transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.9 }}
      style={{
        width: '100%',
        maxWidth: 480,
        marginTop: index === 0 ? 0 : 8,
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

  // ── AN ALERT THAT OUTLIVED ITS REASON IS CLOSED HERE ──────────────────────
  // An alert is raised at the instant an event arrives and then lives in memory
  // until it is dismissed. A backgrounded app receives no realtime events, so the
  // ONE event that would have closed it — the publisher approving the completion
  // from the Lock Screen — never arrives. Reopening the app showed the completion
  // confirmation for a job that was already closed, and tapping it could only
  // fail. The record is the authority, so every actionable alert is re-checked
  // against a fresh read when it appears and every time the app is brought back
  // to the foreground, and cleared if the record has moved on.
  const queryClient = useQueryClient();
  const alertKind = taskAlert?.kind;
  const alertTaskKey = alertTaskId(taskAlert);

  useEffect(() => {
    if (!user?.id || !alertTaskKey || !ACTION_ALERT_KINDS.includes(alertKind)) return undefined;
    let alive = true;

    const verify = async () => {
      // A failed read keeps the alert: this is a correction, not a gate, and the
      // popups that act on an alert re-check the record themselves.
      const record = await base44.entities.Task.get(alertTaskKey).catch(() => null);
      if (!alive || !record) return;
      if (!isAlertResolved(alertKind, record, user.id)) return;
      invalidateTaskCaches(queryClient, { taskId: alertTaskKey, meId: user.id });
      taskAlertStore.clear();
    };

    verify();
    const onWake = () => { if (document.visibilityState === 'visible') verify(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [alertKind, alertTaskKey, user?.id, queryClient]);

  // ── NEVER A FULL-SCREEN ALERT OVER ANOTHER FULL-SCREEN SHEET ────────────
  // The rating sheet holds the shared popup gate while it is open, and every
  // alert below is a full-screen sheet of its own. Drawing them together put
  // one sheet on top of the other mid-flow — the "popups landing on each other"
  // that made the end of a job feel messy. A held alert is NOT dropped: it
  // stays in the store and appears the moment the gate clears, which is exactly
  // the order the user expects (rate first, then the news about the job).
  const [gateHeld, setGateHeld] = useState(isPopupBlocked());
  useEffect(() => subscribePopupGate(() => setGateHeld(isPopupBlocked())), []);

  return (
    <>
      {celebration && <VerificationApprovedPopup variant={celebration} onClose={clearCelebration} />}

      {bonus && <LoyaltyBonusPopup amount={bonus.amount} kind={bonus.kind} user={user} onClose={clearBonus} />}

      {!gateHeld && taskAlert?.kind === 'cancelled' && createPortal(
        <WorkerCancelledPopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />,
        document.body
      )}
      {!gateHeld && taskAlert?.kind === 'revoked' && createPortal(
        <ApprovalRevokedPopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />,
        document.body
      )}
      {!gateHeld && taskAlert?.kind === 'cancel_success' && createPortal(
        <CancelSuccessPopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />,
        document.body
      )}

      {/* The worker was approved → the departure sheet opens by itself */}
      {!gateHeld && taskAlert?.kind === 'approved' && (
        <ApprovedDeparturePopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />
      )}

      {/* A candidate just applied to my task → approve him from here */}
      {!gateHeld && taskAlert?.kind === 'new_applicant' && (
        <NewApplicantPopup
          task={taskAlert.task?.task}
          application={taskAlert.task?.application}
          onClose={() => taskAlertStore.clear()}
        />
      )}

      {/* The worker marked my task done → approve the completion from here */}
      {!gateHeld && taskAlert?.kind === 'completion_ready' && (
        <CompletionApprovalPopup task={taskAlert.task} onClose={() => taskAlertStore.clear()} />
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