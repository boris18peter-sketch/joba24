import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import { Home, Map, Plus, User, MessageCircle, Loader2 } from 'lucide-react';
import { Suspense } from 'react';
// The keep-alive tab screens go through the SAME recovery wrapper as every other
// lazily-loaded route. As plain `lazy()` they had none: a stale hashed chunk or a
// dropped fetch — "Failed to fetch dynamically imported module" — was a hard
// error on the tab the user was opening, with nothing to heal it.
import { lazyRetry } from '@/lib/lazyRetry';

const HomeFeed = lazyRetry(() => import('@/pages/HomeFeed'));
const MapView = lazyRetry(() => import('@/pages/MapView'));
const ChatInbox = lazyRetry(() => import('@/pages/ChatInbox'));
const Profile = lazyRetry(() => import('@/pages/Profile'));

function TabSkeleton() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: 110, borderRadius: 16, background: 'var(--surface-2)',
          border: '1px solid var(--border-1)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
            animation: 'shimmer 1.4s infinite',
            backgroundSize: '200% 100%',
          }} />
        </div>
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  );
}

import SideMenu from '@/components/SideMenu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { notificationStore } from '@/lib/notificationStore';
import VerifyModal from '@/components/VerifyModal';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import ChatPushNotification from '@/components/ChatPushNotification';
import RatingModal from '@/components/RatingModal';
import TaskCompletedCongratsPopup from '@/components/TaskCompletedCongratsPopup';
import { taskAlertStore } from '@/lib/taskAlertStore';

import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import usePushNotifications from '@/hooks/usePushNotifications';
import usePermissionStatus from '@/hooks/usePermissionStatus';
import GuestBlockPopup from '@/components/GuestBlockPopup';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { readPendingTask } from '@/lib/pendingTask';
import useRealtimeSync from '@/hooks/useRealtimeSync';
import PreLaunchWaitingPage from '@/pages/PreLaunchWaitingPage';
import AppLoading from '@/components/AppLoading';
import { hasSeenFirstRun, getOnboardingTrack, destinationForTrack, setOnboardingTrack, campaignTrackFromUrl, TRACKS } from '@/lib/onboardingTrack';
import { resolveUserAccess } from '@/lib/userAccess';
import { bootMark } from '@/lib/bootTrace';

import BoostOverlay from '@/components/BoostOverlay';
import { myPublishedTasksQuery, workerTasksQuery, myApplicationsQuery } from '@/lib/queries';


const ROOT_TAB_PATHS = ['/', '/map', '/chats', '/profile'];

// Pages accessible without authentication — render with minimal layout (no nav/header)
const PUBLIC_PAGES = ['/terms', '/privacy', '/faq'];

// Reachable by a visitor with NO account at all. /create-task belongs here: the
// whole publish form may be filled in freely, and only the PUBLISH action asks
// for a sign-in. Deliberately separate from PUBLIC_PAGES so the pre-launch gate
// still holds an unapproved account on the waiting page.
const PUBLIC_PATHS_NO_AUTH = [...PUBLIC_PAGES, '/create-task'];

// Friendly Hebrew labels for the guest-block popup (where the guest tried to go)
const GUEST_BLOCK_LABELS = {
  '/map': 'מפת המשימות',
  '/create-task': 'פרסום משימה',
  '/chats': 'הצ\'אטים',
  '/profile': 'הפרופיל',
  '/wallet': 'הארנק',
  '/my-tasks': 'המשימות שלי',
  '/notifications': 'ההתראות',
  '/leaderboard': 'טבלת המובילים',
  '/earnings': 'דוח הרווחים',
  '/daily-goal': 'היעד היומי',
  '/agent-dashboard': 'דשבורד הסוכן',
  '/admin': 'דשבורד המנהל',
};
const GUEST_NAV_LABELS = {
  '/map': 'מפת המשימות',
  '/create-task': 'פרסום משימה',
  '/chats': 'הצ\'אטים',
  '/profile': 'הפרופיל',
};

export default function Layout() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login, isGuest, enterGuestMode, exitGuestMode } = useAuth();
  const { settings: jobaSettings } = useJobaSettings();
  const guestAccessEnabled = jobaSettings.guest_access_enabled !== false;
  const effectiveGuest = isGuest && guestAccessEnabled;
  const queryClient = useQueryClient();

  // Auto-exit guest mode if the admin disables the feature while a guest is browsing
  useEffect(() => {
    if (isGuest && !guestAccessEnabled) exitGuestMode();
  }, [isGuest, guestAccessEnabled, exitGuestMode]);

  // ── GLOBAL HARD RULE: hide bottom nav whenever any modal/sheet/popup is open ──
  // Watches document.body for portaled overlays (z-index ≥ 9999). When one appears,
  // the footer is removed entirely — guaranteeing no popup is ever obscured by it.
  useEffect(() => {
    const checkForModals = () => {
      const hasModal = Array.from(document.body.children).some(child => {
        if (child.classList?.contains('j-bottom-nav')) return false;
        const style = child.getAttribute('style') || '';
        if (style.includes('pointer-events: none') || style.includes('pointerEvents: none')) return false;
        return /z-index:\s*9999/.test(style);
      });
      setNavHiddenByModal(hasModal);
    };
    const observer = new MutationObserver(checkForModals);
    observer.observe(document.body, { childList: true });
    checkForModals();
    return () => observer.disconnect();
  }, []);

  // Notification popups are now managed globally via notificationStore (rendered by GlobalPopups in App.jsx)
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [navHiddenByModal, setNavHiddenByModal] = useState(false);
  const [boostOverlayData, setBoostOverlayData] = useState(null);
  const [guestBlock, setGuestBlock] = useState(null);

  // ── THE TAB-SWIPE HANDLERS ARE GONE, AND THAT IS A PERFORMANCE FIX ────────
  // Swiping between tabs was disabled long ago (onTouchEnd was an empty
  // function), but its onTouchStart was still attached to the whole tab
  // container — and it was expensive. It walked UP the DOM from the touched
  // element calling window.getComputedStyle() on every ancestor, and
  // getComputedStyle forces the browser to resolve styles before it can answer.
  //
  // touchstart fires at the beginning of EVERY scroll gesture, so the feed paid
  // a full style recalculation on each one, on the main thread, before a single
  // frame could be painted — the classic "the list hesitates when I start
  // scrolling" on Android and older iPhones.
  //
  // It did all of that for a feature that no longer existed. Both handlers and
  // their refs are removed; nothing reads them.

  // Lazy-mount tabs
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([location.pathname].filter((p) => ROOT_TAB_PATHS.includes(p))));
  useEffect(() => {
    if (ROOT_TAB_PATHS.includes(location.pathname)) {
      setVisitedTabs((prev) => {
        if (prev.has(location.pathname)) return prev;
        const next = new Set(prev);
        next.add(location.pathname);
        return next;
      });
    }
  }, [location.pathname]);

  // Preserve scroll position per tab
  const scrollPositions = useRef({});
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const el = document.getElementById('main-scroll');
    if (!el) return;
    scrollPositions.current[prevPathRef.current] = el.scrollTop;
    prevPathRef.current = location.pathname;
    const saved = scrollPositions.current[location.pathname] ?? 0;
    el.scrollTop = saved;
  }, [location.pathname]);

  // Refs for realtime sync
  const prevTasksRef = useRef({});
  const takenWorkerRef = useRef({});
  const appStatusRef = useRef({});

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), enabled: isAuthenticated });

  // Poll the real is_approved / is_blocked status from the database (JWT is stale after admin changes)
  const { data: approvalStatus, isError: approvalFailed } = useQuery({
    queryKey: ['approvalStatus', me?.id],
    queryFn: () => base44.functions.invoke('checkApprovalStatus', {}),
    enabled: !!me?.id && isAuthenticated,
    refetchInterval: 60000,
    // Never trust a cached verdict: an approval (or a launch-settings change)
    // made in the dashboard must take effect the moment the user returns to the
    // app — a long-lived session must not keep an old decision alive.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    // The gate is fail-closed, so a transient failure must never strand a
    // legitimately approved user: retry, then keep polling until it recovers.
    retry: 2,
  });

  // Send welcome email for brand-new users (covers all registration methods)
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const emailKey = `joba24_welcome_email_${me.id}`;
    if (localStorage.getItem(emailKey)) return;
    // ── CLAIM THE ONE-SHOT FLAG ONLY WHEN THE EMAIL IS ACTUALLY SENT ────────
    // The flag was written BEFORE the checks below, so a user whose
    // created_date happened to be missing or unparseable at that first Layout
    // mount burned the flag and could never receive the welcome email on any
    // later mount — silently, and permanently. Claiming it after the checks
    // means an unusable value is retried on the next mount, while a genuine
    // send still happens at most once.
    if (!me.created_date) return;
    const createdMs = new Date(me.created_date).getTime();
    // ── WELCOME WINDOW — 24 HOURS, NOT 2 MINUTES ───────────────────────────
    // The account is created on the auth server, and only THEN does the visitor
    // go through the OAuth round-trip and the standalone welcome / onboarding
    // screens. Layout does not mount with their user record until all of that is
    // done, so a 2-minute window silently skipped the welcome email for every
    // signup that took longer than two minutes to reach the app.
    //
    // A full day covers every real signup. It still bounds the send to new
    // accounts only: created_date is set by the server, so nobody whose account
    // predates the window can ever be reached — the window is what protects
    // existing users from a "welcome" email.
    if (isNaN(createdMs) || Date.now() - createdMs > 24 * 60 * 60 * 1000) return;
    localStorage.setItem(emailKey, '1');
    base44.functions.invoke('sendWelcomeEmail', {}).catch(() => {});
  }, [me?.id, isAuthenticated]);

  // Update last_active_at once per calendar day
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const key = `joba24_active_${me.id}_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    base44.auth.updateMe({ last_active_at: new Date().toISOString() }).catch(() => {});
  }, [me?.id, isAuthenticated]);

  // PWA: refetch critical data when app returns to foreground (fixes slow sync after backgrounding)
  useEffect(() => {
    let lastVisible = Date.now();
    const handleResume = () => {
      if (document.visibilityState !== 'visible') return;
      // Only refetch if app was backgrounded for more than 3 seconds (avoids redundant refetch on quick tab switches)
      if (Date.now() - lastVisible < 3000) return;
      if (!isAuthenticated || !me?.id) return;
      // ── CLAIM THE RESUME HERE, NOT ONLY ON HIDE ───────────────────────────
      // Returning to the app fires TWO events: `visibilitychange` (→ visible)
      // and `focus`. Both were wired to this function, and because `lastVisible`
      // was only ever written when the app HID, neither call moved it — so the
      // 3-second guard above still passed for the second event and every one of
      // the invalidations below ran TWICE on every resume.
      //
      // Stamping the time as soon as a resume is ACCEPTED makes the second event
      // a no-op through that same guard, with no new state and no new condition.
      // Both listeners stay registered, so every resume path is still covered:
      // visibilitychange catches a plain background → foreground, and focus
      // catches a window that lost focus while the page stayed visible (desktop
      // alt-tab, a dialog stealing focus).
      lastVisible = Date.now();
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['workerTasksLayout', me.id] });
      queryClient.invalidateQueries({ queryKey: ['myPublishedTasks', me.id] });
      queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', me.id] });
      queryClient.invalidateQueries({ queryKey: ['approvalStatus', me.id] });
      queryClient.invalidateQueries({ queryKey: ['notifUnread'] });
      // Critical: invalidate active task caches so banner updates instantly on resume
      queryClient.invalidateQueries({ queryKey: ['activeWorkerTask', me.id] });
      queryClient.invalidateQueries({ queryKey: ['activeClientTask', me.id] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastVisible = Date.now();
      } else {
        handleResume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleResume);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleResume);
    };
  }, [isAuthenticated, me?.id, queryClient]);

  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  const [unreadMessages, setUnreadMessages] = useState(0);
  // Full-screen task alerts are raised on the GLOBAL store and rendered by
  // GlobalPopups (mounted in App.jsx), so they reach every route — including the
  // standalone screens rendered outside Layout (chat, support).
  const setRevokedTask = useCallback((task) => taskAlertStore.raise('revoked', task), []);
  const setCancelledTask = useCallback((task) => taskAlertStore.raise('cancelled', task), []);
  const setCancelSuccessTask = useCallback((task) => taskAlertStore.raise('cancel_success', task), []);
  const [cancelWarningTask, setCancelWarningTask] = useState(null);
  const [cancelWarningLoading, setCancelWarningLoading] = useState(false);

  // The user's own three lists. Defined once in @/lib/queries and shared with
  // the feed and the inbox, so all of them collapse onto a SINGLE request each
  // instead of downloading the same records under several different keys.
  const { data: workerTasks = [] } = useQuery(workerTasksQuery(me?.id));

  // Seed activeWorkerTask cache on load
  useEffect(() => {
    if (!me?.id || workerTasks.length === 0) return;
    const takenTask = workerTasks.find((t) => t.status === 'TAKEN') || null;
    queryClient.setQueryData(['activeWorkerTask', me.id], (old) => old !== undefined ? old : takenTask);
  }, [workerTasks, me?.id]);

  const { data: myPublishedTasks = [] } = useQuery(myPublishedTasksQuery(me?.id));

  // Seed activeClientTask cache on load — ensures TaskDetail banner works from first render
  useEffect(() => {
    if (!me?.id || myPublishedTasks.length === 0) return;
    const takenTask = myPublishedTasks.find((t) => t.status === 'TAKEN') || null;
    queryClient.setQueryData(['activeClientTask', me.id], (old) => old !== undefined ? old : takenTask);
  }, [myPublishedTasks, me?.id]);

  const { data: myApplications = [] } = useQuery(myApplicationsQuery(me?.id));

  // Seed refs
  useEffect(() => {
    myApplications.forEach((app) => { if (!appStatusRef.current[app.id]) appStatusRef.current[app.id] = app.status; });
  }, [myApplications]);
  useEffect(() => {
    myPublishedTasks.forEach((task) => { prevTasksRef.current[task.id] = task; });
  }, [myPublishedTasks]);
  useEffect(() => {
    workerTasks.forEach((task) => {
      if (task.status === 'TAKEN') { prevTasksRef.current[task.id] = task; takenWorkerRef.current[task.id] = task.worker_id; }
      else if (!prevTasksRef.current[task.id]) prevTasksRef.current[task.id] = task;
    });
  }, [workerTasks]);
  // Redundant API call removed — workerTasks query (line 156) already fetches this data

  // Live refs for subscriptions
  const myPublishedTasksRef = useRef(myPublishedTasks);
  const workerTasksRef = useRef(workerTasks);
  useEffect(() => { myPublishedTasksRef.current = myPublishedTasks; }, [myPublishedTasks]);
  useEffect(() => { workerTasksRef.current = workerTasks; }, [workerTasks]);

  // Rating modal
  const [ratingTask, setRatingTask] = useState(null);
  // The closing note of the completion flow — shown once the rating is behind
  // the user. See TaskCompletedCongratsPopup for why the order matters.
  const [congratsTask, setCongratsTask] = useState(null);
  const shownRatingRef = useRef(new Set());
  const maybeShowRating = useCallback((task) => {
    if (!me?.id || !task?.id || task.status !== 'COMPLETED') return;
    if (me.id !== task.client_id && me.id !== task.worker_id) return;
    const key = `rated_${task.id}_${me.id}`;
    if (localStorage.getItem(key) || shownRatingRef.current.has(task.id)) return;
    // Check if a review already exists — don't show the modal for already-reviewed tasks.
    // NOTE: getQueryData returns the RAW queryFn result (an array), NOT the
    // `select`-transformed value. When TaskDetail is open, its myReview query
    // holds [] for unreviewed tasks — an empty array is truthy, so a naive
    // `if (existingReview) return` blocked the modal from ever showing. Check
    // length / object identity instead.
    const existingReview = queryClient.getQueryData(['myReview', task.id, me.id]);
    const hasReview = Array.isArray(existingReview)
      ? existingReview.length > 0
      : !!existingReview?.id;
    if (hasReview) return;
    shownRatingRef.current.add(task.id);
    // Don't persist the localStorage key yet — only when the user actually
    // closes the modal (onClose below). Otherwise a navigation that unmounts
    // Layout before the 800ms timeout would mark the task "rated" forever.
    setTimeout(() => setRatingTask(task), 800);
  }, [me?.id, queryClient]);

  useEffect(() => {
    const handler = (e) => maybeShowRating(e.detail?.task);
    window.addEventListener('show_rating_modal', handler);
    return () => window.removeEventListener('show_rating_modal', handler);
  }, [maybeShowRating]);

  // Notification popups managed globally via notificationStore — works on ALL pages (not just Layout)
  const addNotification = useCallback((notification) => {
    notificationStore.addNotification(notification);
  }, []);

  // Event listeners for window events
  useEffect(() => {
    const handleRevoked = (e) => {
      const { task } = e.detail;
      if (!me?.id || me.id === task?.client_id) return;
      setRevokedTask(task || { id: task?.id, title: task?.title || 'משימה' });
      addNotification({ type: 'approval_revoked', taskTitle: task?.title || 'משימה', taskId: task?.id });
    };
    window.addEventListener('approval_revoked_by_client', handleRevoked);
    return () => window.removeEventListener('approval_revoked_by_client', handleRevoked);
  }, [me?.id, addNotification]);

  useEffect(() => {
    const handleNoShow = (e) => {
      const { task } = e.detail;
      if (!me?.id || me.id === task?.client_id) return;
      addNotification({ type: 'no_show_reported', taskTitle: task?.title || 'משימה', taskId: task?.id });
      setCancelledTask({ ...task, title: task.title });
    };
    window.addEventListener('worker_no_show_reported', handleNoShow);
    return () => window.removeEventListener('worker_no_show_reported', handleNoShow);
  }, [me?.id, addNotification]);

  useEffect(() => {
    const handler = (e) => setCancelWarningTask(e.detail?.task);
    window.addEventListener('show_cancel_warning', handler);
    return () => window.removeEventListener('show_cancel_warning', handler);
  }, []);

  // Clear unread when visiting chat inbox
  useEffect(() => {
    if (location.pathname === '/chats') setUnreadMessages(0);
  }, [location.pathname]);

  // Boost overlay — rendered at Layout level so it survives TaskDetailSheet unmount
  useEffect(() => {
    const handler = (e) => setBoostOverlayData(e.detail);
    window.addEventListener('show_boost_overlay', handler);
    return () => window.removeEventListener('show_boost_overlay', handler);
  }, []);

  // Deep-link / notification-click handling now lives in DeepLinkHandler (App level)
  // so it works on every route, including /join, and survives auth redirects.

  // ── All WebSocket subscriptions via hook ─────────────────────────────────
  useRealtimeSync({
    me, isAuthenticated,
    myPublishedTasksRef, workerTasksRef,
    prevTasksRef, takenWorkerRef, appStatusRef,
    addNotification, setUnreadMessages,
    setRevokedTask, setCancelledTask, setCancelSuccessTask,
    maybeShowRating, t,
  });

  // Boost alert — once per session, consolidated into a single notification
  // when multiple tasks are eligible (avoids notification spam for power users)
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const HOUR_MS = 60 * 60 * 1000;
    const newEligible = myPublishedTasks
      .filter((t) => t.status === 'OPEN' && !t.worker_id)
      .filter((task) => {
        const sessionKey = `boost_notif_${task.id}`;
        if (localStorage.getItem(sessionKey)) return false;
        const refMs = task.last_boost_at
          ? new Date(task.last_boost_at + (task.last_boost_at.endsWith('Z') || task.last_boost_at.includes('+') ? '' : 'Z')).getTime()
          : new Date(task.created_date + (task.created_date?.endsWith('Z') || task.created_date?.includes('+') ? '' : 'Z')).getTime();
        return Date.now() - refMs >= HOUR_MS;
      });

    if (newEligible.length === 0) return;

    // Mark all as notified so they don't trigger again
    newEligible.forEach((task) => {
      localStorage.setItem(`boost_notif_${task.id}`, '1');
    });

    // Single consolidated notification instead of one-per-task. The headline is
    // the generic "time to boost" line and the task's own title carries the
    // specifics — the count is never spliced into a string that only reads
    // correctly in the plural (which is how the alert ended up showing a raw
    // "{n}" for a single task).
    addNotification({ type: 'boost_available', taskTitle: newEligible[0].title, taskId: newEligible[0].id });
  }, [myPublishedTasks, me?.id]);

  const activeClientTask = useMemo(() => myPublishedTasks.find((t) => t.status === 'TAKEN') || null, [myPublishedTasks]);

  usePushNotifications();
  // Records the push / location permission state on the user's own record so the
  // admin dashboard can report how many workers will actually receive a push or
  // share a location. Display-only data — it changes no in-app behaviour.
  usePermissionStatus(me);

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ['notifUnread'],
    queryFn: () => {
      if (!isAuthenticated) return 0;
      return JSON.parse(localStorage.getItem('joba24_notifications') || '[]').filter((n) => !n.read).length;
    },
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  useEffect(() => {
    const isPublicPage = PUBLIC_PATHS_NO_AUTH.includes(location.pathname);
    if (isAuthenticated || isPublicPage) return;

    // ── A CAMPAIGN LINK ALREADY NAMES THE JOURNEY ────────────────────────────
    // ?track=publish / ?track=worker is a link sent to one specific audience, so
    // it goes straight into that audience's flow instead of opening the "which
    // one are you?" screen the link exists to skip. The choice is stored as the
    // visitor's track, so the journey they arrived in is the journey the app
    // continues from — on this visit and on the next one.
    const campaignTrack = campaignTrackFromUrl();
    if (campaignTrack) {
      setOnboardingTrack(campaignTrack);
      // BOTH campaign links open the EXPLAINER flow of their journey — the
      // screens that explain the app and what to do in it — and that flow ends
      // where the journey continues: the publish form for a publisher, the
      // sign-up step for a worker. The link carries the track, so the visitor is
      // never asked to choose one. (A direct link to the publish form is a
      // different link — /create-task — and is untouched.)
      if (location.pathname !== '/welcome') navigate(`/welcome?track=${campaignTrack}`, { replace: true });
      return;
    }

    // ── A SHARED LINK IS A TASK TO SEE, NOT AN ONBOARDING TO RUN ─────────────
    // Someone who opened a task link (a Facebook post, a forward) has already
    // been told what they came for. Sending them into the first-run flow is why
    // the link "did nothing": the task sheet was ready to open and this redirect
    // took the page out from under it. They continue as a GUEST instead — which
    // is exactly the audience a shared link is written for — and the sheet opens
    // over the home surface.
    if (readPendingTask()) {
      if (!effectiveGuest && guestAccessEnabled) enterGuestMode();
      if (location.pathname !== '/') navigate('/', { replace: true });
      return;
    }

    // A guest whose settings have not loaded yet is STILL a guest. Guest access
    // is a real choice and the setting that enables it arrives asynchronously;
    // for the moment before it does, `effectiveGuest` is false — and bouncing
    // the guest on that stale value painted the first-run flow over the feed
    // they had just entered.
    if (effectiveGuest) {
      // A guest IS a visitor with no account, and PUBLIC_PATHS_NO_AUTH is
      // precisely the set a visitor with no account may open — the publish
      // form included, which asks for a sign-in only at the PUBLISH step.
      //
      // A guest is sent home from a route they may not open, and NOTHING MORE.
      // This branch used to also call login(), which turned every navigation a
      // guest made into a sign-in prompt — including leaving the publish form.
      // Sign-in belongs to the protected ACTION (publishing, applying), never
      // to a navigation or a close button.
      if (location.pathname !== '/' && !isPublicPage) {
        navigate('/', { replace: true });
      }
      return;
    }
    if (isGuest) return;

    // ── A visitor with no account ────────────────────────────────────────────
    // They are never left on a route they cannot use, and they are NEVER
    // dropped on the worker sign-up by default. They continue the journey they
    // actually chose:
    //
    //   publish → the publish form, which a visitor may fill freely (the
    //             sign-in is asked for only at the PUBLISH step)
    //   worker  → the existing sign-up + worker profile flow
    //   no choice yet → the first-run screen
    //
    // This is the branch that used to send EVERY returning visitor to /join.
    // That single line is why closing the app after the publisher onboarding
    // and re-opening it dumped the visitor onto the worker sign-up page, with
    // no way forward that matched what they had picked.
    const seen = hasSeenFirstRun();
    const destination = seen ? destinationForTrack(getOnboardingTrack()) : '/welcome';
    bootMark('route', 'ok', `${seen ? 'returning' : 'first-run'} → ${destination}`);
    if (location.pathname !== destination) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, effectiveGuest, isGuest, enterGuestMode, guestAccessEnabled, navigate, location.pathname]);

  // Pre-launch gate: show waiting page for unapproved users (admins and agents always pass)
  // Placed AFTER all hooks to comply with Rules of Hooks
  if (!isAuthenticated) {
    // Public pages: render with minimal layout (no header, no bottom nav, no side menu)
    if (PUBLIC_PATHS_NO_AUTH.includes(location.pathname)) {
      return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-1)', overflow: 'hidden', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
          <div id="main-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', height: '100%' }}>
            <Outlet />
          </div>
        </div>
      );
    }
    if (!effectiveGuest) {
      return <AppLoading />;
    }
    // Guest: only home is allowed. If not on home yet, wait for the redirect to fire.
    if (location.pathname !== '/') {
      return <AppLoading />;
    }
    // Guest on home: fall through to the full layout (feed browsing only)
  }

  // ── ONE verdict rule, shared with the admin dashboard ────────────────────
  // The dashboard shows a user's access with resolveUserAccess(); this gate used
  // to re-implement that same rule inline, so the two could drift — and a user
  // the dashboard showed as "✓ מאושר" could be sitting on the waiting screen.
  // Both sides now call the ONE function with the ONE settings record
  // (useJobaSettings, the same hook the dashboard uses), so they cannot
  // disagree about a given user.
  //
  // Which values it is given matters just as much: the FRESH ones from the
  // database when the status check succeeded, and the session's own record when
  // it did not. A failed status CHECK says nothing about the user — treating it
  // as "not approved" is what locked out accounts the admin had already
  // approved, while the dashboard (which reads the record directly) kept showing
  // them as approved. The two were reading different things.
  const isAdmin = me?.role === 'admin';
  const fresh = approvalStatus?.data;
  const access = resolveUserAccess(
    {
      ...me,
      // The FRESH role too: a promotion made in the dashboard must not have to
      // wait for the session's copy of it to catch up.
      role: fresh?.role ?? me?.role,
      is_approved: fresh ? fresh.is_approved : me?.is_approved,
      is_blocked: fresh ? fresh.is_blocked : me?.is_blocked,
    },
    jobaSettings
  );
  const isApprovedUser = access.hasAccess;
  // No loading-window gap and no waiting-page flash: while the verdict is still
  // unknown the user stays on the splash, never on the app.
  const approvalLoading = isAuthenticated && !!me && !isAdmin && !approvalFailed && approvalStatus === undefined;
  if (approvalLoading) {
    return <AppLoading />;
  }
  // Authenticated but not-yet-approved users can still read Terms / Privacy / FAQ
  if (isAuthenticated && me && !isApprovedUser && PUBLIC_PAGES.includes(location.pathname)) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-1)', overflow: 'hidden', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
        <div id="main-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', height: '100%' }}>
          <Outlet />
        </div>
      </div>
    );
  }

  // ── THE WAITING PAGE IS THE PROFESSIONALS' ROOM, NOT EVERYONE'S ────────────
  // It exists to hold people who joined to TAKE work until there is work to
  // take. A visitor who came in to PUBLISH a task is not waiting for that: he
  // needs the feed and the publish form, which already work, and holding him on
  // a "we open soon" screen is exactly what made a publisher who filled the
  // form, signed in and closed the form land in a dead end.
  //
  // The journey is recorded on the account at first sign-in (signup_track); the
  // device's own choice is the fallback for accounts created before that field
  // existed. Anyone whose journey is NOT the professional one — a publisher, or
  // an account whose journey was never recorded — is not held here.
  const journeyTrack = me?.signup_track || getOnboardingTrack();
  const isWorkerJourney = journeyTrack === TRACKS.WORKER;

  if (isAuthenticated && me && !isApprovedUser && isWorkerJourney) {
    return <PreLaunchWaitingPage me={me} />;
  }

  // English fallback for bottom-nav labels — used when the translated label is
  // too long for the narrow tab bar (e.g. Russian "Опубликовать" = 12 chars,
  // Arabic "الملف الشخصي" = 13 chars). Keeps the nav clean and prevents overflow.
  const NAV_FALLBACK_EN = {
    nav_feed_short: 'Feed',
    nav_map_short: 'Map',
    nav_create_short: 'Post',
    nav_chats_short: 'Chats',
    nav_profile_short: 'Profile',
  };
  const MAX_NAV_LABEL_LEN = 8;
  const navLabel = (key) => {
    const label = t(key);
    return label && label.length > MAX_NAV_LABEL_LEN ? (NAV_FALLBACK_EN[key] || label) : label;
  };

  // ── A GUEST'S LOGIN PROMPT MUST NAME WHAT THEY JUST ASKED FOR ────────────
  // login() opens the shared modal with no `type`, so the modal fell back to
  // its 'apply' default and EVERY guest-gated destination announced "כדי להגיש
  // בקשה נשאר רק להתחבר". A visitor who tapped מפה was told they were applying
  // for a task — a sentence about something they had not asked to do. Each
  // destination now names itself.
  //
  // Publishing and applying were already right and are untouched: the publish
  // form renders its own modal with type="publish", and the task page passes
  // the apply key explicitly. Only the destinations below were wrong.
  const GUEST_LOGIN_TITLE_KEY = {
    '/map': 'login_title_map',
    '/chats': 'login_title_chats',
    '/profile': 'login_title_profile',
  };

  const navItems = [
    { to: '/', icon: Home, label: navLabel('nav_feed_short') },
    { to: '/map', icon: Map, label: navLabel('nav_map_short') },
    { to: '/create-task', icon: Plus, label: t('nav_create_short'), primary: true },
    { to: '/chats', icon: MessageCircle, label: navLabel('nav_chats_short'), badge: unreadMessages },
    { to: '/profile', icon: User, label: navLabel('nav_profile_short') },
  ];

  // The nav's own click behaviour, unchanged: a guest is asked to sign in for
  // anything but the feed, and tapping the tab you are ALREADY on scrolls it
  // back to the top. Kept here rather than inside the nav so the gesture and the
  // navigation stay separate concerns.
  // `e` is absent when the destination came from a DRAG rather than a tap — a
  // swipe has no click to cancel — so every use of it is optional.
  // ── EVERY ROOT TAB SCROLLS IN ITS OWN BOX ────────────────────────────────
  // So the box must be named after the tab. Only the feed's carried the name
  // 'main-scroll', and the nav looked up that one name for every tab — tapping
  // Profile scrolled the HIDDEN feed, so nothing moved on screen.
  const tabScrollId = (path) => (path === '/' ? 'main-scroll' : `main-scroll${path.replace(/\//g, '-')}`);

  const handleNavClick = (to, e) => {
    if (effectiveGuest && to !== '/') {
      e?.preventDefault?.();
      login(GUEST_LOGIN_TITLE_KEY[to]);
      return;
    }
    if (location.pathname === to) {
      e?.preventDefault?.();
      const el = document.getElementById(tabScrollId(to));
      if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-1)', overflow: 'hidden' }}>
      <ChatPushNotification />
      <AppHeader onOpenMenu={() => setSideMenuOpen(true)} />
      {createPortal(<SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />, document.body)}

      {showVerify && createPortal(<VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />, document.body)}
      {/* Task alerts (cancelled / revoked / cancel-success) render globally via GlobalPopups */}
      {ratingTask && me && createPortal(
        <RatingModal task={ratingTask} me={me} onClose={() => {
          localStorage.setItem(`rated_${ratingTask.id}_${me.id}`, '1');
          // ── THE THANK-YOU COMES AFTER THE ASK ────────────────────────────
          // Completion is three moments, in this order: the ✓ on the task card,
          // then the rating sheet, then this. Asking and then thanking is a
          // conversation; thanking and then asking is a transaction.
          //
          // This replaced the green completion notification rather than being
          // added beside it. The notification carried the same fact and the same
          // destination, so keeping both would have told the user the same news
          // twice with one copy underneath the other. The popup carries the
          // destination now (earnings for a worker, the task for a publisher).
          setCongratsTask({
            task: ratingTask,
            role: me.id === ratingTask.worker_id ? 'worker' : 'client',
          });
          setRatingTask(null);
        }} />,
        document.body
      )}

      {congratsTask && createPortal(
        <TaskCompletedCongratsPopup
          task={congratsTask.task}
          role={congratsTask.role}
          onClose={() => setCongratsTask(null)}
        />,
        document.body
      )}

      {cancelWarningTask && createPortal(
        <div className="mobile-sheet-overlay" style={{ zIndex: 100001 }}
          onClick={(e) => { if (e.target === e.currentTarget) setCancelWarningTask(null); }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}>
          <div dir="rtl" className="mobile-sheet" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>{t('cancel_warning_title')}</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                {t('cancel_warning_body').replace('{name}', cancelWarningTask.worker_name)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setCancelWarningTask(null)}
                style={{ width: '100%', height: 56, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg,var(--brand-nav-active, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary-dark)))', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}>
                {t('keep_task_btn')}
              </button>
              <button
                onClick={async () => {
                  setCancelWarningLoading(true);
                  const taskToCancel = cancelWarningTask;
                  try {
                    await base44.functions.invoke('cancelTaskPayment', { taskId: taskToCancel.id });
                    setCancelWarningTask(null);
                    setCancelSuccessTask(taskToCancel);
                  } catch {
                    setCancelWarningTask(null);
                  }
                  setCancelWarningLoading(false);
                }}
                disabled={cancelWarningLoading}
                style={{ width: '100%', height: 52, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {cancelWarningLoading ? <Loader2 size={18} className="animate-spin" /> : t('cancel_task_btn_label')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tab content — lazy-mount, keep-alive, swipeable */}
      {(() => {
        const isNonRootTab = !ROOT_TAB_PATHS.includes(location.pathname);
        return (
          <>
            <div
              style={{ flex: isNonRootTab ? 0 : 1, display: isNonRootTab ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
            >
              {ROOT_TAB_PATHS.map((tabPath) => {
                const isActive = location.pathname === tabPath;
                // Render the active tab immediately even on first visit (before
                // the visitedTabs effect runs) — otherwise the first navigation
                // to a root tab shows a blank frame for one render.
                if (!visitedTabs.has(tabPath) && !isActive) return null;
                const needsAuth = !isAuthenticated && (tabPath === '/chats' || tabPath === '/profile');
                const TabComponent = tabPath === '/' ? HomeFeed : tabPath === '/map' ? MapView : tabPath === '/chats' ? ChatInbox : Profile;
                return (
                  <div key={tabPath} id={tabScrollId(tabPath)}
                    style={{
                      flex: isActive ? 1 : undefined, display: isActive ? 'block' : 'none',
                      overflowY: tabPath === '/map' ? 'hidden' : 'auto', overflowX: 'hidden',
                      paddingBottom: tabPath === '/map' ? 0 : 'calc(58px + env(safe-area-inset-bottom))',
                      WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
                      height: isActive ? '100%' : 0,
                      }}>
                      {needsAuth ? (
                      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 24px', gap: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 4 }}>{tabPath === '/chats' ? '💬' : '👤'}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{t('login_required')}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                          {tabPath === '/chats' ? t('login_required_chats') : t('login_required_profile')}
                        </div>
                        <button onClick={login} style={{ height: 50, paddingInline: 32, borderRadius: 14, background: 'linear-gradient(135deg,var(--brand-nav-active, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary-dark)))', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,111,212,0.35)' }}>
                          {t('login_now')}
                        </button>
                      </div>
                    ) : (
                      <Suspense fallback={<TabSkeleton />}>
                        {tabPath === '/' ? <TabComponent key="home" /> : <TabComponent />}
                      </Suspense>
                    )}
                  </div>
                );
              })}
            </div>
            {isNonRootTab && (() => {
              // Bottom nav is hidden on these non-root paths — don't reserve its 88px padding
              const hideNavOnPath = ['/create-task', '/support'].includes(location.pathname) || location.pathname.startsWith('/task/') || location.pathname.startsWith('/chat/');
              const scrollPad = hideNavOnPath ? 'env(safe-area-inset-bottom)' : 'calc(58px + env(safe-area-inset-bottom))';
              // ── THIS CONTAINER'S SHAPE IS WHAT MAKES THE PUBLISH FORM SCROLL ──
              // It must be a FLEX COLUMN, exactly like the public container above
              // and like the root tabs' own scroller.
              //
              // The publish form fills its container with `flex: 1` and scrolls its
              // own body (the blue band is pinned, everything below it scrolls). That
              // only works when the container IS a flex column: there `flex: 1`
              // gives the form a definite height, the body inside it gets the
              // remaining space, and the body scrolls. In a plain BLOCK container
              // `flex: 1` is inert, the form fell back to its content height, its
              // body became exactly as tall as its content (so it had nothing to
              // scroll) and the rest was clipped by the layout's `overflow: hidden`
              // — the form simply would not scroll, with no error anywhere.
              //
              // That is why a guest could scroll the form (the public container above
              // is a flex column) while a signed-in user could not: the two
              // containers had different shapes. They are the same now.
              //
              // A flex item may SHRINK, which would clip a page that is taller than
              // the screen instead of letting it scroll — so every page is pinned at
              // its content height by the `#main-scroll-sub > *` rule in index.css.
              // A page that wants to fill the container exactly (the publish form)
              // sets its own inline `flex: 1`, which overrides that rule.
              return (
                <div id="main-scroll-sub" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', paddingBottom: scrollPad, WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                  <Suspense fallback={<TabSkeleton />}>
                    <Outlet />
                  </Suspense>
                </div>
              );
            })()}
          </>
        );
      })()}

      {/* Bottom Nav */}
      {/* ── THE NAV READS THE ROUTER'S LOCATION, NOT window.location ──────────
          This is the ONE place in Layout still reading `window.location`
          directly. It matters for two reasons:

          1. It is not reactive. `window.location` is a plain global — React
             does not re-render when it changes, so this condition was evaluated
             against whatever the URL happened to be at the last render rather
             than at the current route.
          2. It can DISAGREE with the router. `useLocation()` reports the
             location React Router is actually rendering; `window.location` is
             the raw URL, which other code rewrites in place (the deep-link
             handler calls history.replaceState to strip its parameters). When
             the two diverge, the nav was decided by one source while the page
             was decided by the other.

          The sibling check 38 lines above — the scroll padding — already reads
          `location.pathname`. Both now read the same source, so the nav's
          visibility and the space reserved for it can no longer disagree. */}
      {!navHiddenByModal && !['/map', '/create-task', '/support'].includes(location.pathname) && !location.pathname.startsWith('/task/') && !location.pathname.startsWith('/chat/') && createPortal(
        // The bar itself lives in its own component now: the sliding bubble and
        // the drag gesture are a self-contained interaction, and this file is
        // already long enough. The tab list, the guest gating and the
        // scroll-to-top behaviour are all unchanged — they are simply handed in.
        <BottomNav
          items={navItems}
          activePath={location.pathname}
          onNavigate={handleNavClick}
          onPrimary={() => navigate('/create-task')}
        />,
        document.body
      )}
      {boostOverlayData && createPortal(
        <BoostOverlay
          taskId={boostOverlayData.taskId}
          taskTitle={boostOverlayData.taskTitle}
          taskPrice={boostOverlayData.taskPrice}
          taskCategory={boostOverlayData.taskCategory}
          onDismiss={() => setBoostOverlayData(null)}
        />,
        document.body
      )}
      {/* Guests now get the direct login modal (login()) instead of a blocker popup */}
    </div>
  );
}