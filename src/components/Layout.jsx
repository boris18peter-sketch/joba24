import { Outlet, Link, useLocation, useNavigate, matchPath } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { Home, Map, Plus, User, MessageCircle, Loader2 } from 'lucide-react';
import HomeFeed from '@/pages/HomeFeed';
import MapView from '@/pages/MapView';
import ChatInbox from '@/pages/ChatInbox';
import Profile from '@/pages/Profile';
import SideMenu from '@/components/SideMenu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import LiveNotificationPopup from '@/components/LiveNotificationPopup';
import VerifyModal from '@/components/VerifyModal';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import ChatPushNotification from '@/components/ChatPushNotification';
import CoinEarnedToast from '@/components/CoinEarnedToast';
import ApprovalRevokedPopup from '@/components/ApprovalRevokedPopup';
import CancelSuccessPopup from '@/components/CancelSuccessPopup';

import WorkerCancelledPopup from '@/components/WorkerCancelledPopup';
import SignupGiftModal from '@/components/SignupGiftModal';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import usePushNotifications from '@/hooks/usePushNotifications';

export default function Layout() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  // Startup logging
  useEffect(() => {
    console.log('[Joba24] Layout: mounted — path=' + location.pathname + ' isAuthenticated=' + isAuthenticated);
  }, []);

  // Initialize push notifications (FCM) — auto-registers token on mount
  usePushNotifications();
  const [notifications, setNotifications] = useState([]);
  const notifQueueRef = useRef([]);
  const notifActiveRef = useRef(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Lazy-mount tabs: track which tabs have been visited so we only mount them on first visit
  const ROOT_TAB_PATHS = ['/', '/map', '/chats', '/profile'];
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
    // Save scroll of the tab we're leaving
    scrollPositions.current[prevPathRef.current] = el.scrollTop;
    prevPathRef.current = location.pathname;
    // Restore scroll for the tab we're entering (0 if never visited)
    const saved = scrollPositions.current[location.pathname] ?? 0;
    el.scrollTop = saved;
  }, [location.pathname]);

  const prevTasksRef = useRef({});
  const prevApplicationsRef = useRef({});
  const prevCreditsRef = useRef(null);
  // Dedicated map: taskId → worker_id for tasks I'm working on as a TAKEN worker
  // This is never cleared, so cancellation detection always has the worker_id
  const takenWorkerRef = useRef({});
  // Tracks application statuses to detect approved→rejected (revocation)
  const appStatusRef = useRef({});

  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), enabled: isAuthenticated });

  // Show signup gift modal for brand-new users
  const [showGiftModal, setShowGiftModal] = useState(false);
  useEffect(() => {
    if (!me || !isAuthenticated) return;
    const alreadyClaimed = localStorage.getItem('joba24_gift_claimed');
    if (alreadyClaimed) return;
    if (me.worker_credits === null || me.worker_credits === undefined) {
      setShowGiftModal(true);
    }
  }, [me?.id, isAuthenticated]);

  // Fire coin_earned event when worker_credits increases
  useEffect(() => {
    if (!me?.worker_credits) return;
    const prev = prevCreditsRef.current;
    if (prev !== null && me.worker_credits > prev) {
      const gained = me.worker_credits - prev;
      window.dispatchEvent(new CustomEvent('coin_earned', { detail: { amount: gained, label: t('credits_label') } }));
    }
    prevCreditsRef.current = me.worker_credits;
  }, [me?.worker_credits]);
  // Update last_active_at once per calendar day per user
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const key = `joba24_active_${me.id}_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    base44.auth.updateMe({ last_active_at: new Date().toISOString() }).catch(() => {});
  }, [me?.id, isAuthenticated]);

  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [revokedTask, setRevokedTask] = useState(null);
  const [cancelledTask, setCancelledTask] = useState(null);
  const [cancelSuccessTask, setCancelSuccessTask] = useState(null);
  const [cancelWarningTask, setCancelWarningTask] = useState(null);
  const [cancelWarningLoading, setCancelWarningLoading] = useState(false);
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasksLayout', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id && isAuthenticated,
    staleTime: 10000,
    refetchInterval: 15000,
    refetchOnWindowFocus: true
  });

  // Active task as worker
  const activeWorkerTask = workerTasks.find((t) => t.status === 'TAKEN') || null;

  // Get my published tasks for real-time notifications
  const { data: myPublishedTasks = [] } = useQuery({
    queryKey: ['myPublishedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id && isAuthenticated,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Get my applications
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsLayout', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id && isAuthenticated,
    staleTime: 30000
  });

  // Seed appStatusRef with current approved applications
  useEffect(() => {
    myApplications.forEach((app) => {
      if (!appStatusRef.current[app.id]) {
        appStatusRef.current[app.id] = app.status;
      }
    });
  }, [myApplications]);

  // Seed prevTasksRef from published + worker tasks
  useEffect(() => {
    myPublishedTasks.forEach((task) => {prevTasksRef.current[task.id] = task;});
  }, [myPublishedTasks]);

  useEffect(() => {
    workerTasks.forEach((task) => {
      if (task.status === 'TAKEN') {
        prevTasksRef.current[task.id] = task;
        takenWorkerRef.current[task.id] = task.worker_id;
      } else if (!prevTasksRef.current[task.id]) {
        prevTasksRef.current[task.id] = task;
      }
    });
  }, [workerTasks]);

  // Seed prevTasksRef + takenWorkerRef on mount so cancellation detection works reliably
  useEffect(() => {
    if (!me?.id) return;
    base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50).then((tasks) => {
      tasks.forEach((task) => {
        if (task.status === 'TAKEN') {
          prevTasksRef.current[task.id] = task;
          takenWorkerRef.current[task.id] = task.worker_id;
        }
      });
    });
  }, [me?.id]);

  // Keep prevApplicationsRef up to date for revocation detection
  useEffect(() => {
    myApplications.forEach((app) => {prevApplicationsRef.current[app.id] = app;});
  }, [myApplications]);

  // ── SINGLE merged Task subscription: handles both cache sync AND notifications ──
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const unsub = base44.entities.Task.subscribe((event) => {
      const t = event.data || {};

      // ── 1. Cache sync ──
      // workerTasksLayout
      queryClient.setQueryData(['workerTasksLayout', me.id], (old = []) => {
        if (event.type === 'delete') return old.filter((x) => x.id !== event.id);
        if (event.type === 'update') {
          const exists = old.find((x) => x.id === event.id);
          if (exists) return old.map((x) => x.id === event.id ? { ...x, ...t } : x);
          if (t.worker_id === me.id && t.status === 'TAKEN') return [t, ...old];
          return old;
        }
        return old;
      });
      // myPublishedTasks
      queryClient.setQueryData(['myPublishedTasks', me.id], (old = []) => {
        if (event.type === 'delete') return old.filter((x) => x.id !== event.id);
        if (event.type === 'create' && t.client_id === me.id) return old.find((x) => x.id === t.id) ? old : [t, ...old];
        if (event.type === 'update') return old.map((x) => x.id === event.id ? { ...x, ...t } : x);
        return old;
      });
      // myTasks (HomeFeed)
      queryClient.setQueryData(['myTasks', me.id], (old = []) => {
        if (!Array.isArray(old)) return old;
        if (event.type === 'create' && t.client_id === me.id && !old.find((x) => x.id === t.id)) return [t, ...old];
        if (event.type === 'update') return old.map((x) => x.id === event.id ? { ...x, ...t } : x);
        if (event.type === 'delete') return old.filter((x) => x.id !== event.id);
        return old;
      });
      // activeWorkerTask — the critical one for ActiveTaskBanner
      queryClient.setQueryData(['activeWorkerTask', me.id], (old) => {
        if (event.type === 'delete') return old?.id === event.id ? null : old;
        if (event.type === 'update') {
          if (t.worker_id === me.id && t.status === 'TAKEN') {
            return old?.id === event.id ? { ...old, ...t } : old ?? t;
          }
          if (old?.id === event.id) {
            return t.status !== 'TAKEN' ? null : { ...old, ...t };
          }
        }
        return old;
      });
      // COMPLETED — refresh me stats
      if (event.type === 'update' && t.status === 'COMPLETED') {
        if (t.worker_id === me.id || t.client_id === me.id) {
          queryClient.invalidateQueries({ queryKey: ['me'] });
        }
      }

      // ── 2. Notifications (update events only) ──
      if (event.type !== 'update') return;
      const task = t;
      const prev = prevTasksRef.current[task.id];

      if (!prev) {
        if (task.client_id === me.id || task.worker_id === me.id) {
          prevTasksRef.current[task.id] = task;
        }
        return;
      }

      if (task.status === 'TAKEN' && task.worker_id) {
        takenWorkerRef.current[task.id] = task.worker_id;
      }

      // Client notifications
      if (task.client_id === me.id) {
        if (task.status === 'TAKEN' && prev.status !== 'TAKEN') {
          addNotification({ type: 'task_taken', taskTitle: task.title, taskId: task.id });
        }
        if (task.worker_status && task.worker_status !== prev.worker_status) {
          if (task.worker_status === 'on_the_way') addNotification({ type: 'worker_on_the_way', taskTitle: task.title, taskId: task.id });else
          if (task.worker_status === 'arrived') addNotification({ type: 'worker_arrived', taskTitle: task.title, taskId: task.id });else
          if (task.worker_status === 'done') addNotification({ type: 'worker_done', taskTitle: task.title, taskId: task.id });
        }
      }

      // TAKEN → OPEN (worker left)
      const prevWorkerId = prev.worker_id || takenWorkerRef.current[task.id];
      if (prev.status === 'TAKEN' && task.status === 'OPEN' && prevWorkerId && !task.worker_id) {
        if (task.client_id === me.id && me.id !== prevWorkerId) {
          addNotification({ type: 'worker_left_task', taskTitle: task.title, taskId: task.id, workerName: prev.worker_name });
        }
      }

      // Task CANCELLED — notify worker
      const workerIdForTask = takenWorkerRef.current[task.id] || prev.worker_id;
      const prevWasActiveForWorker = ['TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(prev.status);
      if (task.status === 'CANCELLED' && prevWasActiveForWorker && workerIdForTask === me.id && me.id !== task.client_id) {
        addNotification({ type: 'task_cancelled_worker', taskTitle: prev.title || task.title });
        setCancelledTask({ ...task, worker_id: workerIdForTask, title: prev.title || task.title });
      }

      // Task CANCELLED — notify client
      if (task.client_id === me.id && me.id !== prev.worker_id && prev.status === 'TAKEN' && task.status === 'CANCELLED') {
        setCancelSuccessTask(task);
      }

      prevTasksRef.current[task.id] = { ...prev, ...task };
    });
    return unsub;
  }, [me?.id, isAuthenticated, queryClient]);

  // Real-time chat message push notifications
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const msg = event.data;
      if (msg.sender_id === me.id) return;
      const task = [...(myPublishedTasks || []), ...(workerTasks || [])].find((t) => t.id === msg.task_id);
      if (!task) return;
      setUnreadMessages((prev) => prev + 1);
      addNotification({ type: 'new_message', senderName: msg.sender_name, preview: msg.content?.slice(0, 60), taskId: msg.task_id });
    });
    return unsub;
  }, [me?.id, myPublishedTasks, workerTasks]);

  // Clear unread when visiting chat inbox
  useEffect(() => {
    if (location.pathname === '/chats') setUnreadMessages(0);
  }, [location.pathname]);

  // CreditTransaction subscription
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const unsub = base44.entities.CreditTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const tx = event.data;
      if (tx.user_id !== me.id) return;
      if (tx.type === 'Loyalty_Reward') {
        window.dispatchEvent(new CustomEvent('coin_earned', { detail: { amount: tx.amount, label: t('loyalty_reward_toast') } }));
        addNotification({ type: 'new_review', reviewerName: 'מפרסם המשימה', rating: 5, preview: t('loyalty_reward_notif').replace('{n}', tx.amount) });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    });
    return unsub;
  }, [me?.id, isAuthenticated]);

  // Review subscription
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const unsub = base44.entities.Review.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      if (event.data.reviewee_id !== me.id) return;
      addNotification({ type: 'new_review', taskId: event.data.task_id, rating: event.data.rating, preview: t('review_received_notif').replace('{n}', event.data.rating) });
    });
    return unsub;
  }, [me?.id, isAuthenticated]);

  // Approval revoked event (from client action in TaskApplicants)
  useEffect(() => {
    const handleRevoked = (e) => {
      const { task } = e.detail;
      if (!me?.id || me.id === task?.client_id) return;
      setRevokedTask(task || { id: task?.id, title: task?.title || 'משימה' });
      addNotification({ type: 'approval_revoked', taskTitle: task?.title || 'משימה', taskId: task?.id });
    };
    window.addEventListener('approval_revoked_by_client', handleRevoked);
    return () => window.removeEventListener('approval_revoked_by_client', handleRevoked);
  }, [me?.id]);

  // No-show reported event
  useEffect(() => {
    const handleNoShow = (e) => {
      const { task } = e.detail;
      if (!me?.id || me.id === task?.client_id) return;
      addNotification({ type: 'no_show_reported', taskTitle: task?.title || 'משימה', taskId: task?.id });
      setCancelledTask({ ...task, title: task.title });
    };
    window.addEventListener('worker_no_show_reported', handleNoShow);
    return () => window.removeEventListener('worker_no_show_reported', handleNoShow);
  }, [me?.id]);

  // Cancel warning from TaskDetail
  useEffect(() => {
    const handler = (e) => setCancelWarningTask(e.detail?.task);
    window.addEventListener('show_cancel_warning', handler);
    return () => window.removeEventListener('show_cancel_warning', handler);
  }, []);

  // Real-time application events — notifications + cache sync for applications-pulse
  useEffect(() => {
    if (!isAuthenticated || !me?.id) return;
    const unsubscribe = base44.entities.TaskApplication.subscribe((event) => {
      const appData = event.data || {};
      let prevAppStatus = null;

      // Sync applications-pulse cache so TaskDetail applicant counter updates live
      if (appData.task_id) {
        queryClient.setQueryData(['applications-pulse', appData.task_id], (old = []) => {
          if (event.type === 'create') return old.find((a) => a.id === appData.id) ? old : [...old, appData];
          if (event.type === 'update') return old.map((a) => a.id === appData.id ? { ...a, ...appData } : a);
          if (event.type === 'delete') return old.filter((a) => a.id !== appData.id);
          return old;
        });
      }

      // Detect when MY approved application is rejected → approval revoked
      if (event.type === 'update' && appData.worker_id === me.id) {
        const appId = event.id || appData.id;
        const prevStatus = appStatusRef.current[appId];
        prevAppStatus = prevStatus;
        appStatusRef.current[appId] = appData.status;
        if (prevStatus === 'approved' && appData.status === 'rejected') {
          const relatedTask = [...(myPublishedTasks || []), ...(workerTasks || [])].find((t) => t.id === appData.task_id);
          setRevokedTask(relatedTask || { id: appData.task_id, title: appData.task_title || 'משימה' });
        }
      }

      if (event.type === 'create' && appData.task_id) {
        const isMyTask = myPublishedTasks.some((t) => t.id === appData.task_id);
        const iAmApplicant = appData.worker_id === me.id;
        if (isMyTask && !iAmApplicant) {
          const task = myPublishedTasks.find((t) => t.id === appData.task_id);
          addNotification({ type: 'application_received', taskTitle: task?.title || 'משימה', taskId: appData.task_id });
        }
        if (iAmApplicant && !isMyTask) {
          const appliedTask = workerTasks.find((t) => t.id === appData.task_id);
          addNotification({ type: 'application_sent', taskTitle: appliedTask?.title || appData.task_title || 'משימה', taskId: appData.task_id });
        }
      } else if (event.type === 'update') {
        if (appData.status === 'approved' && appData.worker_id === me.id) {
          const isMyOwnTaskAsClient = myPublishedTasks.some((t) => t.id === appData.task_id);
          if (!isMyOwnTaskAsClient) {
            const task = workerTasks.find((t) => t.id === appData.task_id);
            addNotification({ type: 'application_approved', taskTitle: task?.title || appData.task_title || 'משימה', taskId: appData.task_id });
          }
        } else if (appData.status === 'rejected' && appData.worker_id === me.id) {
          const isMyOwnTask = myPublishedTasks.some((t) => t.id === appData.task_id);
          if (isMyOwnTask) return;
          if (prevAppStatus !== 'approved') {
            const rejectedTask = [...(myPublishedTasks || []), ...(workerTasks || [])].find((t) => t.id === appData.task_id);
            addNotification({ type: 'application_rejected', taskTitle: rejectedTask?.title || 'משימה', taskId: appData.task_id });
          }
        }
      }
    });
    return unsubscribe;
  }, [me?.id, myPublishedTasks, workerTasks]);

  const recentNotifKeysRef = useRef(new Set());

  // Persist notifications to localStorage
  const persistNotification = (notification) => {
    const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
    const newNotif = { ...notification, timestamp: new Date().toISOString(), read: false };
    const updated = [newNotif, ...stored].slice(0, 50);
    localStorage.setItem('joba24_notifications', JSON.stringify(updated));
  };

  const showNextNotif = () => {
    if (notifQueueRef.current.length === 0) {
      notifActiveRef.current = false;
      return;
    }
    notifActiveRef.current = true;
    const next = notifQueueRef.current.shift();
    setNotifications([next]);
  };

  const addNotification = (notification) => {
    // Dedup: same type+task within 10 seconds won't fire twice
    const dedupKey = `${notification.type}__${notification.taskTitle || ''}__${notification.taskId || ''}`;
    if (recentNotifKeysRef.current.has(dedupKey)) return;
    recentNotifKeysRef.current.add(dedupKey);
    setTimeout(() => recentNotifKeysRef.current.delete(dedupKey), 10000);

    const id = Date.now() + Math.random();
    persistNotification(notification);
    const notifObj = { ...notification, id };

    if (!notifActiveRef.current) {
      notifActiveRef.current = true;
      setNotifications([notifObj]);
    } else {
      notifQueueRef.current.push(notifObj);
    }
  };

  const removeNotification = (id) => {
    setNotifications([]);
    // Small delay before showing next so there's a visual gap
    setTimeout(showNextNotif, 400);
  };

  // Active task I published that a worker is currently doing
  const activeClientTask = myPublishedTasks.find((t) => t.status === 'TAKEN') || null;

  // Boost available alert — fire ONCE per session per task (stored in sessionStorage)
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const HOUR_MS = 60 * 60 * 1000;
    const openTasksWithNoApps = myPublishedTasks.filter((t) =>
    t.status === 'OPEN' && !t.worker_id
    );
    openTasksWithNoApps.forEach((task) => {
      const sessionKey = `boost_notif_${task.id}`;
      if (sessionStorage.getItem(sessionKey)) return; // already shown this session
      const refMs = task.last_boost_at ?
      new Date(task.last_boost_at + (task.last_boost_at.endsWith('Z') || task.last_boost_at.includes('+') ? '' : 'Z')).getTime() :
      new Date(task.created_date + (task.created_date?.endsWith('Z') || task.created_date?.includes('+') ? '' : 'Z')).getTime();
      const elapsed = Date.now() - refMs;
      if (elapsed >= HOUR_MS) {
        sessionStorage.setItem(sessionKey, '1');
        addNotification({ type: 'boost_available', taskTitle: task.title, taskId: task.id });
      }
    });
  }, [myPublishedTasks, me?.id]);

  // Tasks in progress = TAKEN and worker confirmed (active work)
  const inProgressCount = workerTasks.filter((t) => t.status === 'TAKEN').length;

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ['notifUnread'],
    queryFn: () => {
      if (!isAuthenticated) return 0;
      const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
      return stored.filter((n) => !n.read).length;
    },
    enabled: isAuthenticated,
    staleTime: 30000
  });

  const navItems = [
  { to: '/', icon: Home, label: t('nav_feed_short') },
  { to: '/map', icon: Map, label: t('nav_map_short') },
  { to: '/create-task', icon: Plus, label: t('nav_create_short'), primary: true },
  { to: '/chats', icon: MessageCircle, label: t('nav_chats_short'), badge: unreadMessages },
  { to: '/profile', icon: User, label: t('nav_profile_short') }];


  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#f4f7fb', background: 'var(--surface-1)', overflow: 'hidden' }}>
      <ChatPushNotification />
      <CoinEarnedToast />
      <AppHeader onOpenMenu={() => setSideMenuOpen(true)} />
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Portals — rendered directly to body to escape stacking context */}
      {showGiftModal && createPortal(
        <SignupGiftModal onClose={() => setShowGiftModal(false)} />,
        document.body
      )}
      {showVerify && createPortal(
        <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />,
        document.body
      )}
      {revokedTask && createPortal(
        <ApprovalRevokedPopup task={revokedTask} onClose={() => setRevokedTask(null)} />,
        document.body
      )}
      {cancelledTask && createPortal(
        <WorkerCancelledPopup task={cancelledTask} onClose={() => setCancelledTask(null)} />,
        document.body
      )}
      {cancelSuccessTask && createPortal(
        <CancelSuccessPopup task={cancelSuccessTask} onClose={() => setCancelSuccessTask(null)} />,
        document.body
      )}
      {cancelWarningTask && createPortal(
        <div className="mobile-sheet-overlay"
        style={{ zIndex: 100001 }}
        onClick={(e) => {if (e.target === e.currentTarget) setCancelWarningTask(null);}}
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
              <button
                onClick={() => setCancelWarningTask(null)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}>
                
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
                    // Invalidate queries so the feed updates
                    // (worker popup comes via subscription in the worker's Layout instance)
                  } catch (err) {
                    console.error('Cancel failed:', err);
                    setCancelWarningTask(null);
                  }
                  setCancelWarningLoading(false);
                }}
                disabled={cancelWarningLoading}
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                
                {cancelWarningLoading ? <Loader2 size={18} className="animate-spin" /> : t('cancel_task_btn_label')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Live Notifications Stack */}
      {createPortal(
        <div style={{ position: 'fixed', top: 12, left: 0, right: 0, zIndex: 9999999, pointerEvents: 'none' }}>
          {notifications.map((notif) =>
          <div key={notif.id} style={{ pointerEvents: 'auto' }}>
              <LiveNotificationPopup
              notification={notif}
              onClose={() => removeNotification(notif.id)} />
            
            </div>
          )}
        </div>,
        document.body
      )}
      
      {/* Scrollable content area — lazy-mount tabs: only mount on first visit, keep alive after */}
      {(() => {
        const isRootTab = ROOT_TAB_PATHS.includes(location.pathname);
        const isNonRootTab = !isRootTab;
        return (
          <>
            {ROOT_TAB_PATHS.map((tabPath) => {
              const isActive = location.pathname === tabPath;
              const hasBeenVisited = visitedTabs.has(tabPath);
              // Only render if this tab has been visited at least once
              if (!hasBeenVisited) return null;
              // Guard: if not authenticated, show login prompt for chat/profile instead of the actual page
              const needsAuth = !isAuthenticated && (tabPath === '/chats' || tabPath === '/profile');
              const TabComponent = tabPath === '/' ? HomeFeed : tabPath === '/map' ? MapView : tabPath === '/chats' ? ChatInbox : Profile;
              return (
                <div
                  key={tabPath}
                  id={tabPath === '/' ? 'main-scroll' : undefined}
                  style={{
                    flex: isActive ? 1 : undefined,
                    display: isActive ? 'block' : 'none',
                    overflowY: tabPath === '/map' ? 'hidden' : 'auto',
                    overflowX: 'hidden',
                    paddingBottom: tabPath === '/map' ? 0 : 'calc(100px + env(safe-area-inset-bottom))',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    height: isActive ? '100%' : 0
                  }}>
                  
                  {needsAuth ?
                  <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 24px', gap: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 48, marginBottom: 4 }}>{tabPath === '/chats' ? '💬' : '👤'}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{t('login_required')}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                        {tabPath === '/chats' ? t('login_required_chats') : t('login_required_profile')}
                      </div>
                      <button
                      onClick={login}
                      style={{ height: 50, paddingInline: 32, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,111,212,0.35)' }}>
                      
                        {t('login_now')}
                      </button>
                    </div> :
                  tabPath === '/' ? <TabComponent key="home" /> : <TabComponent />}
                  </div>);

            })}
            {/* Non-root routes rendered via Outlet */}
            {isNonRootTab &&
            <div
              id="main-scroll"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                height: '100%'
              }} className="opacity-100">
              
                <Outlet />
              </div>
            }
          </>);

      })()}



      {/* Bottom Nav — hidden on map, create-task, edit-task pages */}
      {!['/map', '/create-task'].includes(location.pathname) && !location.pathname.startsWith('/edit-task') && <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--nav-bg)', borderTop: '1px solid var(--border-2)',
        boxShadow: '0 -2px 20px rgba(10,90,190,0.08)',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '8px 16px 12px' }}>
          {navItems.map(({ to, icon: Icon, label, primary, badge }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <button id="onboarding-create-btn" key={to} onClick={() => {
                  if (!isAuthenticated) {navigate(to);return;}
                  gate(() => navigate(to));
                }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -22, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(26,111,212,0.45)'
                  }}>
                    <Icon size={24} color="white" />
                  </div>
                  <span style={{ fontSize: 10, color: '#1a6fd4', marginTop: 4, fontWeight: 600 }}>{label}</span>
                </button>);

            }
            return (
              <Link key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', textDecoration: 'none', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={20} color={active ? '#1a6fd4' : '#a0b8d8'} />
                  {badge > 0 &&
                  <div style={{
                    position: 'absolute', top: -6, right: -8,
                    background: '#dc2626', color: 'white',
                    fontSize: 9, fontWeight: 900,
                    width: 16, height: 16, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid white'
                  }}>{badge}</div>
                  }
                </div>
                <span style={{ fontSize: 10, color: active ? '#1a6fd4' : 'var(--text-3)', fontWeight: active ? 700 : 500 }}>{label}</span>
              </Link>);

          })}
        </div>
      </div>}
    </div>);

}