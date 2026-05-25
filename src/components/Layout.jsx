import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import { Home, Map, Plus, User, MessageCircle, Loader2 } from 'lucide-react';
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

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const prevTasksRef = useRef({});
  const prevApplicationsRef = useRef({});
  const prevCreditsRef = useRef(null);
  // Dedicated map: taskId → worker_id for tasks I'm working on as a TAKEN worker
  // This is never cleared, so cancellation detection always has the worker_id
  const takenWorkerRef = useRef({});

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
      window.dispatchEvent(new CustomEvent('coin_earned', { detail: { amount: gained, label: 'קרדיטים' } }));
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
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Active task as worker
  const activeWorkerTask = workerTasks.find(t => t.status === 'TAKEN') || null;

  // Get my published tasks for real-time notifications
  const { data: myPublishedTasks = [] } = useQuery({
    queryKey: ['myPublishedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id && isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Get my applications
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsLayout', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id && isAuthenticated,
    staleTime: 60000,
  });

  // Watch for task status changes — keep prevTasksRef up to date for all relevant tasks
  useEffect(() => {
    myPublishedTasks.forEach(task => {
      prevTasksRef.current[task.id] = task;
    });
  }, [myPublishedTasks]);

  useEffect(() => {
    workerTasks.forEach(task => {
      if (task.status === 'TAKEN') {
        prevTasksRef.current[task.id] = task;
        takenWorkerRef.current[task.id] = task.worker_id; // always me.id for TAKEN tasks
      } else if (!prevTasksRef.current[task.id]) {
        prevTasksRef.current[task.id] = task;
      }
    });
  }, [workerTasks]);

  // Seed prevTasksRef + takenWorkerRef with TAKEN tasks I'm a worker on
  // fetch once on mount so cancellation detection works reliably
  useEffect(() => {
    if (!me?.id) return;
    base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50).then(tasks => {
      tasks.forEach(task => {
        if (task.status === 'TAKEN') {
          prevTasksRef.current[task.id] = task;
          takenWorkerRef.current[task.id] = task.worker_id; // = me.id
        }
      });
    });
  }, [me?.id]);

  // Watch for application status changes
  useEffect(() => {
    myApplications.forEach(app => {
      const prevApp = prevApplicationsRef.current[app.id];
      if (prevApp && prevApp.status !== app.status) {
      if (app.status === 'approved') {
        const relatedTask = [...(myPublishedTasks || []), ...(workerTasks || [])].find(t => t.id === app.task_id);
        addNotification({
          type: 'application_approved',
          taskTitle: relatedTask?.title || 'משימה',
          taskId: app.task_id,
        });
        }
      }
      prevApplicationsRef.current[app.id] = app;
    });
  }, [myApplications]);

  // Real-time chat message push notifications
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const unsub = base44.entities.ChatMessage.subscribe(event => {
      if (event.type !== 'create' || !event.data) return;
      const msg = event.data;
      if (msg.sender_id === me.id) return; // my own message
      // Find task to get context
      const task = [...(myPublishedTasks || []), ...(workerTasks || [])].find(t => t.id === msg.task_id);
      if (!task) return;
      setUnreadMessages(prev => prev + 1);
      addNotification({
        type: 'new_message',
        senderName: msg.sender_name,
        preview: msg.content?.slice(0, 60),
        taskId: msg.task_id,
      });
    });
    return unsub;
  }, [me?.id, myPublishedTasks, workerTasks]);

  // Clear unread when visiting chat inbox
  useEffect(() => {
    if (location.pathname === '/chats') setUnreadMessages(0);
  }, [location.pathname]);

  // CreditTransaction subscription — detect Loyalty_Reward (5-star bonus) in real-time
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const unsub = base44.entities.CreditTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const tx = event.data;
      if (tx.user_id !== me.id) return;
      if (tx.type === 'Loyalty_Reward') {
        // Fire coin toast with specific label
        window.dispatchEvent(new CustomEvent('coin_earned', { detail: { amount: tx.amount, label: 'בונוס 5 כוכבים ⭐' } }));
        addNotification({
          type: 'new_review',
          reviewerName: 'מפרסם המשימה',
          rating: 5,
          preview: `קיבלת ${tx.amount} קרדיטים בונוס על דירוג 5 כוכבים! ⭐`,
        });
        // Refresh me to reflect updated balance
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    });
    return unsub;
  }, [me?.id, isAuthenticated]);

  // Real-time notification when someone reviews ME (reviewee_id === me.id)
  useEffect(() => {
    if (!me?.id || !isAuthenticated) return;
    const unsub = base44.entities.Review.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      if (event.data.reviewee_id !== me.id) return;
      addNotification({
        type: 'new_review',
        taskId: event.data.task_id,
        rating: event.data.rating,
        preview: `קיבלת ביקורת ${event.data.rating} כוכבים`,
      });
    });
    return unsub;
  }, [me?.id, isAuthenticated]);

  // Listen for approval revoked by client — notification only (popup handled by Task subscription)
  useEffect(() => {
    const handleRevoked = (e) => {
      const { task } = e.detail;
      // Only notify the worker (not the task owner/client)
      if (!me?.id || me?.id === task?.client_id) return;
      // Don't call setRevokedTask here — the Task subscription already handles the popup
      // to avoid showing it twice when both triggers fire on the same device
      addNotification({
        type: 'approval_revoked',
        taskTitle: task?.title || 'משימה',
        taskId: task?.id,
      });
    };
    window.addEventListener('approval_revoked_by_client', handleRevoked);
    return () => window.removeEventListener('approval_revoked_by_client', handleRevoked);
  }, [me?.id]);

  // Listen for no-show report — notify worker
  useEffect(() => {
    const handleNoShow = (e) => {
      const { task } = e.detail;
      if (!me?.id || me?.id === task?.client_id) return;
      addNotification({
        type: 'no_show_reported',
        taskTitle: task?.title || 'משימה',
        taskId: task?.id,
      });
      setCancelledTask({ ...task, title: task.title });
    };
    window.addEventListener('worker_no_show_reported', handleNoShow);
    return () => window.removeEventListener('worker_no_show_reported', handleNoShow);
  }, [me?.id]);

  // Listen for cancel warning request from TaskDetail — owner wants to cancel task with active worker
  useEffect(() => {
    const handleShowCancelWarning = (e) => {
      const { task } = e.detail;
      setCancelWarningTask(task);
    };
    window.addEventListener('show_cancel_warning', handleShowCancelWarning);
    return () => window.removeEventListener('show_cancel_warning', handleShowCancelWarning);
  }, []);

  // Real-time task events for client (push-like) + worker cancellation alert
  useEffect(() => {
    if (!isAuthenticated || !me?.id) return;
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type !== 'update') return;
      const task = event.data;
      if (!task) return;
      const prev = prevTasksRef.current[task.id];

      // Always update prevTasksRef AFTER reading prev, so next event has fresh data
      // But only if this task is relevant to me (I'm client or worker)
      if (task.client_id === me?.id || task.worker_id === me?.id || prev?.worker_id === me?.id) {
        // Store a snapshot BEFORE updating — we already have prev above
        // Update after processing (at end of handler)
      }

      if (!prev) {
        // If no prev but task is relevant, seed it now for future events
        if (task.client_id === me?.id || task.worker_id === me?.id) {
          prevTasksRef.current[task.id] = task;
        }
        return;
      }

      // When task becomes TAKEN, snapshot the worker_id immediately so cancellation detection works later
      if (task.status === 'TAKEN' && task.worker_id) {
        prevTasksRef.current[task.id] = { ...prev, ...task };
        takenWorkerRef.current[task.id] = task.worker_id;
      }

      // Client notifications
      if (task.client_id === me?.id) {
        if (task.worker_status && task.worker_status !== prev.worker_status) {
          // Worker on the way: skip separate task_taken notification — this covers it
               if (task.worker_status === 'on_the_way') addNotification({ type: 'worker_on_the_way', taskTitle: task.title, taskId: task.id });
               else if (task.worker_status === 'arrived') addNotification({ type: 'worker_arrived', taskTitle: task.title, taskId: task.id });
               else if (task.worker_status === 'done') addNotification({ type: 'worker_done', taskTitle: task.title, taskId: task.id });
        } else if (task.status === 'TAKEN' && prev.status === 'OPEN' && !task.worker_status) {
          // Only fire task_taken if worker hasn't already set status (to avoid double notification)
          addNotification({ type: 'task_taken', taskTitle: task.title, taskId: task.id });
        }
      }

      // TAKEN → OPEN: worker_id cleared (worker left voluntarily or approval revoked)
      const prevWorkerId = prev.worker_id || takenWorkerRef.current[task.id];
      if (prev.status === 'TAKEN' && task.status === 'OPEN' && prevWorkerId && !task.worker_id) {
        // Client: worker left voluntarily — only notify client, never the worker
        if (task.client_id === me?.id && me?.id !== prevWorkerId) {
          addNotification({
            type: 'worker_left_task',
            taskTitle: task.title,
            taskId: task.id,
            workerName: prev.worker_name,
          });
        }
        // Worker: publisher revoked the approval — only show to the worker, never to the client
        if (prevWorkerId === me?.id && me?.id !== task.client_id && !prev.worker_status) {
          addNotification({
            type: 'approval_revoked',
            taskTitle: task.title,
            taskId: task.id,
          });
          setRevokedTask(task);
        }
      }

      // Worker notification: task was cancelled after being assigned (only show to the worker, not the client)
      // Use takenWorkerRef as the most reliable source — never cleared, even if worker_id was nulled
      const workerIdForTask = takenWorkerRef.current[task.id] || prev.worker_id;
      if (
        task.status === 'CANCELLED' &&
        prev.status === 'TAKEN' &&
        workerIdForTask === me?.id &&
        me?.id !== task.client_id
      ) {
        addNotification({
          type: 'task_cancelled_worker',
          taskTitle: prev.title || task.title,
        });
        // Show popup to worker
        setCancelledTask({ ...task, worker_id: workerIdForTask, title: prev.title || task.title });
      }

      // Client notification: task was cancelled (only show to the client, not the worker)
      // Note: prev.worker_id holds the worker before cancellation since task.worker_id is now null
      if (
        task.client_id === me?.id &&
        me?.id !== prev.worker_id &&   // don't show to the worker even if they're also a client
        prev.status === 'TAKEN' &&
        task.status === 'CANCELLED'
      ) {
        setCancelSuccessTask(task);
      }

      // Update prevTasksRef with latest data for future comparisons
      prevTasksRef.current[task.id] = { ...prev, ...task };
    });
    return unsubscribe;
  }, [me?.id]);

  // Listen for real-time application events
  useEffect(() => {
    if (!isAuthenticated || !me?.id) return;
    const unsubscribe = base44.entities.TaskApplication.subscribe((event) => {
      if (event.type === 'create' && event.data?.task_id) {
        // Someone applied to my task - notify client
        const task = myPublishedTasks.find(t => t.id === event.data.task_id);
        if (task && event.data.worker_id !== me?.id) {
          addNotification({
            type: 'application_received',
            taskTitle: task.title,
            taskId: task.id,
          });
        }
        // I applied to a task - notify me (worker)
        if (event.data.worker_id === me?.id) {
          const appliedTask = myPublishedTasks.find(t => t.id === event.data.task_id);
          addNotification({
            type: 'application_sent',
            taskTitle: appliedTask?.title || 'משימה',
            taskId: event.data.task_id,
          });
        }
      } else if (event.type === 'update') {
        if (event.data?.status === 'approved' && event.data.worker_id === me?.id) {
          // My application was approved
          const task = myPublishedTasks.find(t => t.id === event.data.task_id) ||
                      workerTasks.find(t => t.id === event.data.task_id);
          addNotification({
            type: 'application_approved',
            taskTitle: task?.title || 'משימה',
            taskId: event.data.task_id,
          });
        } else if ((event.data?.status === 'rejected' || event.data?.status === 'cancelled') && event.data.worker_id === me?.id) {
          // My application was rejected/cancelled
          const rejectedTask = [...(myPublishedTasks || []), ...(workerTasks || [])].find(t => t.id === event.data.task_id);
          addNotification({
            type: 'application_rejected',
            taskTitle: rejectedTask?.title || 'משימה',
            taskId: event.data.task_id,
          });
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

  const addNotification = (notification) => {
    // Dedup: same type+task within 10 seconds won't fire twice
    const dedupKey = `${notification.type}__${notification.taskTitle || ''}__${notification.taskId || ''}`;
    if (recentNotifKeysRef.current.has(dedupKey)) return;
    recentNotifKeysRef.current.add(dedupKey);
    setTimeout(() => recentNotifKeysRef.current.delete(dedupKey), 10000);

    const id = Date.now();
    persistNotification(notification);
    setNotifications(prev => {
      const capped = prev.length >= 3 ? prev.slice(0, 2) : prev;
      return [{ ...notification, id }, ...capped];
    });
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Active task I published that a worker is currently doing
  const activeClientTask = myPublishedTasks.find(t => t.status === 'TAKEN') || null;

  // Tasks in progress = TAKEN and worker confirmed (active work)
  const inProgressCount = workerTasks.filter(t => t.status === 'TAKEN').length;

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ['notifUnread'],
    queryFn: () => {
      if (!isAuthenticated) return 0;
      const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
      return stored.filter(n => !n.read).length;
    },
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const navItems = [
    { to: '/', icon: Home, label: 'פיד' },
    { to: '/map', icon: Map, label: 'מפה' },
    { to: '/create-task', icon: Plus, label: 'ג\'ובה', primary: true },
    { to: '/chats', icon: MessageCircle, label: 'צ\'אט', badge: unreadMessages },
    { to: '/profile', icon: User, label: 'פרופיל' },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-1)', overflow: 'hidden' }}>
      <ChatPushNotification />
      <CoinEarnedToast />
      <AppHeader onOpenMenu={() => setSideMenuOpen(true)} />
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Portals — rendered directly to body to escape stacking context */}
      {showGiftModal && (
        <SignupGiftModal onClose={() => setShowGiftModal(false)} />
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
          onClick={(e) => { if (e.target === e.currentTarget) setCancelWarningTask(null); }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div dir="rtl" className="mobile-sheet" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>רגע לפני ביטול</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                העובד <strong style={{ color: '#0f1e40' }}>{cancelWarningTask.worker_name}</strong> טרח ויצא במיוחד עבורך.
                <br />ביטול המשימה תחזור לסטטוס פתוחה.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setCancelWarningTask(null)}
                style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,212,0.35)' }}
              >
                השאר את המשימה
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
                style={{ width: '100%', height: 48, borderRadius: 16, background: 'white', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {cancelWarningLoading ? <Loader2 size={18} className="animate-spin" /> : 'בטל משימה'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Live Notifications Stack */}
      {createPortal(
        <div style={{ position: 'fixed', top: 12, left: 0, right: 0, zIndex: 99999, pointerEvents: 'none' }}>
          {notifications.map(notif => (
            <div key={notif.id} style={{ pointerEvents: 'auto' }}>
              <LiveNotificationPopup 
                notification={notif} 
                onClose={() => removeNotification(notif.id)} 
              />
            </div>
          ))}
        </div>,
        document.body
      )}
      
      {/* Scrollable content area — paddingBottom leaves space for bottom nav */}
      <div id="main-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <Outlet />
      </div>



      {/* Bottom Nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
        background: 'var(--nav-bg)', borderTop: '1px solid var(--border-2)',
        boxShadow: '0 -2px 20px rgba(10,90,190,0.08)',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '8px 16px 12px' }}>
          {navItems.map(({ to, icon: Icon, label, primary, badge }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <button id="onboarding-create-btn" key={to} onClick={() => {
                  if (!isAuthenticated) {
                    navigate(to);
                    return;
                  }
                  gate(() => navigate(to));
                }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -22, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(26,111,212,0.45)',
                  }}>
                    <Icon size={24} color="white" />
                  </div>
                  <span style={{ fontSize: 10, color: '#1a6fd4', marginTop: 4, fontWeight: 600 }}>{label}</span>
                </button>
              );
            }
            return (
              <Link key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', textDecoration: 'none', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Icon size={20} color={active ? '#1a6fd4' : '#a0b8d8'} />
                  {badge > 0 && (
                    <div style={{
                      position: 'absolute', top: -6, right: -8,
                      background: '#dc2626', color: 'white',
                      fontSize: 9, fontWeight: 900,
                      width: 16, height: 16, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid white',
                    }}>{badge}</div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: active ? '#1a6fd4' : 'var(--text-3)', fontWeight: active ? 700 : 500 }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}