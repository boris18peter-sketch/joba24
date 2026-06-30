import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { Home, Map, Plus, User, MessageCircle, Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';

const HomeFeed = lazy(() => import('@/pages/HomeFeed'));
const MapView = lazy(() => import('@/pages/MapView'));
const ChatInbox = lazy(() => import('@/pages/ChatInbox'));
const Profile = lazy(() => import('@/pages/Profile'));

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
import LiveNotificationPopup from '@/components/LiveNotificationPopup';
import VerifyModal from '@/components/VerifyModal';
import NotificationsPermissionPrompt from '@/components/NotificationsPermissionPrompt';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import ChatPushNotification from '@/components/ChatPushNotification';
import ApprovalRevokedPopup from '@/components/ApprovalRevokedPopup';
import CancelSuccessPopup from '@/components/CancelSuccessPopup';
import RatingModal from '@/components/RatingModal';
import WorkerCancelledPopup from '@/components/WorkerCancelledPopup';

import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import usePushNotifications from '@/hooks/usePushNotifications';
import useRealtimeSync from '@/hooks/useRealtimeSync';
import PreLaunchWaitingPage from '@/pages/PreLaunchWaitingPage';


const ROOT_TAB_PATHS = ['/', '/map', '/chats', '/profile'];

export default function Layout() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const queryClient = useQueryClient();

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

  const [notifications, setNotifications] = useState([]);
  const notifQueueRef = useRef([]);
  const notifActiveRef = useRef(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [navHiddenByModal, setNavHiddenByModal] = useState(false);

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
  const { data: approvalStatus } = useQuery({
    queryKey: ['approvalStatus', me?.id],
    queryFn: () => base44.functions.invoke('checkApprovalStatus', {}),
    enabled: !!me?.id && isAuthenticated,
    refetchInterval: 60000,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Send welcome email for brand-new users (covers all registration methods)
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const emailKey = `joba24_welcome_email_${me.id}`;
    if (localStorage.getItem(emailKey)) return;
    localStorage.setItem(emailKey, '1');
    if (!me.created_date) return;
    const createdMs = new Date(me.created_date).getTime();
    if (isNaN(createdMs) || Date.now() - createdMs > 2 * 60 * 1000) return;
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
    staleTime: 60000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  // Seed activeWorkerTask cache on load
  useEffect(() => {
    if (!me?.id || workerTasks.length === 0) return;
    const takenTask = workerTasks.find((t) => t.status === 'TAKEN') || null;
    queryClient.setQueryData(['activeWorkerTask', me.id], (old) => old !== undefined ? old : takenTask);
  }, [workerTasks, me?.id]);

  // Seed activeClientTask cache on load — ensures TaskDetail banner works from first render
  useEffect(() => {
    if (!me?.id || myPublishedTasks.length === 0) return;
    const takenTask = myPublishedTasks.find((t) => t.status === 'TAKEN') || null;
    queryClient.setQueryData(['activeClientTask', me.id], (old) => old !== undefined ? old : takenTask);
  }, [myPublishedTasks, me?.id]);

  const { data: myPublishedTasks = [] } = useQuery({
    queryKey: ['myPublishedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id && isAuthenticated,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsLayout', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id && isAuthenticated,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

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
  const shownRatingRef = useRef(new Set());
  const maybeShowRating = useCallback((task) => {
    if (!me?.id || !task?.id || task.status !== 'COMPLETED') return;
    if (me.id !== task.client_id && me.id !== task.worker_id) return;
    const key = `rated_${task.id}_${me.id}`;
    if (localStorage.getItem(key) || shownRatingRef.current.has(task.id)) return;
    shownRatingRef.current.add(task.id);
    localStorage.setItem(key, '1');
    setTimeout(() => setRatingTask(task), 800);
  }, [me?.id]);

  useEffect(() => {
    const handler = (e) => maybeShowRating(e.detail?.task);
    window.addEventListener('show_rating_modal', handler);
    return () => window.removeEventListener('show_rating_modal', handler);
  }, [maybeShowRating]);

  // Notification queue
  const persistNotification = (notification) => {
    const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
    const updated = [{ ...notification, timestamp: new Date().toISOString(), read: false }, ...stored].slice(0, 50);
    localStorage.setItem('joba24_notifications', JSON.stringify(updated));
  };

  const showNextNotif = () => {
    if (notifQueueRef.current.length === 0) { notifActiveRef.current = false; return; }
    notifActiveRef.current = true;
    setNotifications([notifQueueRef.current.shift()]);
  };

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    persistNotification(notification);
    const notifObj = { ...notification, id };
    if (!notifActiveRef.current) { notifActiveRef.current = true; setNotifications([notifObj]); }
    else notifQueueRef.current.push(notifObj);
  }, []);

  const removeNotification = () => {
    setNotifications([]);
    setTimeout(showNextNotif, 400);
  };

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

  // ── All WebSocket subscriptions via hook ─────────────────────────────────
  useRealtimeSync({
    me, isAuthenticated,
    myPublishedTasksRef, workerTasksRef,
    prevTasksRef, takenWorkerRef, appStatusRef,
    addNotification, setUnreadMessages,
    setRevokedTask, setCancelledTask, setCancelSuccessTask,
    maybeShowRating, t,
  });

  // Boost alert — once per session per open task older than 1 hour
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const HOUR_MS = 60 * 60 * 1000;
    myPublishedTasks.filter((t) => t.status === 'OPEN' && !t.worker_id).forEach((task) => {
      const sessionKey = `boost_notif_${task.id}`;
      if (sessionStorage.getItem(sessionKey)) return;
      const refMs = task.last_boost_at
        ? new Date(task.last_boost_at + (task.last_boost_at.endsWith('Z') || task.last_boost_at.includes('+') ? '' : 'Z')).getTime()
        : new Date(task.created_date + (task.created_date?.endsWith('Z') || task.created_date?.includes('+') ? '' : 'Z')).getTime();
      if (Date.now() - refMs >= HOUR_MS) {
        sessionStorage.setItem(sessionKey, '1');
        addNotification({ type: 'boost_available', taskTitle: task.title, taskId: task.id });
      }
    });
  }, [myPublishedTasks, me?.id]);

  const activeClientTask = useMemo(() => myPublishedTasks.find((t) => t.status === 'TAKEN') || null, [myPublishedTasks]);

  usePushNotifications();

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
    if (!isAuthenticated) {
      navigate('/join');
    }
  }, [isAuthenticated, navigate]);

  // Pre-launch gate: show waiting page for unapproved users (admins and agents always pass)
  // Placed AFTER all hooks to comply with Rules of Hooks
  if (!isAuthenticated) {
    return <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}><Loader2 size={32} color="#1a6fd4" className="animate-spin" /></div>;
  }

  const isBlocked = approvalStatus?.data?.is_blocked;
  const dbIsApproved = approvalStatus?.data?.is_approved;
  // Use DB value if available (freshest); fall back to JWT value while loading
  const isApprovedUser = isBlocked
    ? false
    : (dbIsApproved !== undefined ? dbIsApproved : me?.is_approved) || me?.role === 'admin' || me?.role === 'agent';
  if (isAuthenticated && me && !isApprovedUser) {
    return <PreLaunchWaitingPage me={me} />;
  }

  const navItems = [
    { to: '/', icon: Home, label: t('nav_feed_short') },
    { to: '/map', icon: Map, label: t('nav_map_short') },
    { to: '/create-task', icon: Plus, label: t('nav_create_short'), primary: true },
    { to: '/chats', icon: MessageCircle, label: t('nav_chats_short'), badge: unreadMessages },
    { to: '/profile', icon: User, label: t('nav_profile_short') },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-1)', overflow: 'hidden' }}>
      <ChatPushNotification />
      <NotificationsPermissionPrompt />
      <AppHeader onOpenMenu={() => setSideMenuOpen(true)} />
      {createPortal(<SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />, document.body)}

      {showVerify && createPortal(<VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />, document.body)}
      {revokedTask && createPortal(<ApprovalRevokedPopup task={revokedTask} onClose={() => setRevokedTask(null)} />, document.body)}
      {cancelledTask && createPortal(<WorkerCancelledPopup task={cancelledTask} onClose={() => setCancelledTask(null)} />, document.body)}
      {cancelSuccessTask && createPortal(<CancelSuccessPopup task={cancelSuccessTask} onClose={() => setCancelSuccessTask(null)} />, document.body)}
      {ratingTask && me && createPortal(
        <RatingModal task={ratingTask} me={me} onClose={() => {
          localStorage.setItem(`rated_${ratingTask.id}_${me.id}`, '1');
          setRatingTask(null);
        }} />,
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
                style={{ width: '100%', height: 56, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}>
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

      {createPortal(
        <div style={{ position: 'fixed', top: 12, left: 0, right: 0, zIndex: 9999999, pointerEvents: 'none' }}>
          {notifications.map((notif) => (
            <div key={notif.id} style={{ pointerEvents: 'auto' }}>
              <LiveNotificationPopup notification={notif} onClose={() => removeNotification(notif.id)} />
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Tab content — lazy-mount, keep-alive */}
      {(() => {
        const isNonRootTab = !ROOT_TAB_PATHS.includes(location.pathname);
        return (
          <>
            {ROOT_TAB_PATHS.map((tabPath) => {
              if (!visitedTabs.has(tabPath)) return null;
              const isActive = location.pathname === tabPath;
              const needsAuth = !isAuthenticated && (tabPath === '/chats' || tabPath === '/profile');
              const TabComponent = tabPath === '/' ? HomeFeed : tabPath === '/map' ? MapView : tabPath === '/chats' ? ChatInbox : Profile;
              return (
                <div key={tabPath} id={tabPath === '/' ? 'main-scroll' : undefined}
                  style={{
                    flex: isActive ? 1 : undefined, display: isActive ? 'block' : 'none',
                    overflowY: tabPath === '/map' ? 'hidden' : 'auto', overflowX: 'hidden',
                    paddingBottom: tabPath === '/map' ? 0 : 'calc(80px + max(16px, env(safe-area-inset-bottom)))',
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
                      <button onClick={login} style={{ height: 50, paddingInline: 32, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,111,212,0.35)' }}>
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
            {isNonRootTab && (
              <div id="main-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(80px + max(16px, env(safe-area-inset-bottom)))', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', height: '100%' }}>
                <Outlet />
              </div>
            )}
          </>
        );
      })()}

      {/* Bottom Nav */}
      {!navHiddenByModal && !['/map', '/create-task'].includes(window.location.pathname) && !window.location.pathname.startsWith('/task/') && !window.location.pathname.startsWith('/chat/') && createPortal(
        <div className="j-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'var(--nav-bg)', borderTop: '1px solid var(--border-2)', boxShadow: '0 -2px 20px rgba(10,90,190,0.08)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '6px 8px 4px' }}>
            {navItems.map(({ to, icon: Icon, label, primary, badge }) => {
              const active = location.pathname === to;
              if (primary) {
                return (
                  <button id="onboarding-create-btn" key={to} onClick={() => { if (!isAuthenticated) { navigate(to); return; } gate(() => navigate(to)); }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -26, background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', minWidth: 64, WebkitTapHighlightColor: 'transparent' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(26,111,212,0.45)' }}>
                      <Icon size={26} color="white" />
                    </div>
                    <span style={{ fontSize: 10, color: '#1a6fd4', marginTop: 4, fontWeight: 700 }}>{label}</span>
                  </button>
                );
              }
              return (
                <Link key={to} to={to} onClick={(e) => { if (active) { e.preventDefault(); const el = document.getElementById('main-scroll'); if (el) el.scrollTo({ top: 0, behavior: 'smooth' }); } }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 12px 4px', textDecoration: 'none', position: 'relative', minWidth: 52, minHeight: 56, justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ position: 'relative' }}>
                    <Icon size={22} color={active ? '#1a6fd4' : '#a0b8d8'} />
                    {badge > 0 && (
                      <div style={{ position: 'absolute', top: -6, right: -8, background: '#dc2626', color: 'white', fontSize: 9, fontWeight: 900, width: 17, height: 17, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>{badge}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: active ? '#1a6fd4' : 'var(--text-3)', fontWeight: active ? 700 : 500 }}>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}