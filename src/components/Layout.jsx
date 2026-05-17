import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, Plus, User, Wallet, Bell, Loader2 } from 'lucide-react';
import SideMenu from '@/components/SideMenu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import LiveNotificationPopup from '@/components/LiveNotificationPopup';
import VerifyModal from '@/components/VerifyModal';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';
import ChatPushNotification from '@/components/ChatPushNotification';
import ApprovalRevokedPopup from '@/components/ApprovalRevokedPopup';
import CancelSuccessPopup from '@/components/CancelSuccessPopup';
import WorkerCancelledPopup from '@/components/WorkerCancelledPopup';
import LoginPromptModal from '@/components/LoginPromptModal';
import { useAuth } from '@/lib/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const prevTasksRef = useRef({});
  const prevApplicationsRef = useRef({});

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
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
    enabled: !!me?.id,
    staleTime: 60000,
  });

  // Active task as worker
  const activeWorkerTask = workerTasks.find(t => t.status === 'TAKEN') || null;

  // Get my published tasks for real-time notifications
  const { data: myPublishedTasks = [] } = useQuery({
    queryKey: ['myPublishedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id,
    staleTime: 60000,
  });

  // Get my applications
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsLayout', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id,
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
      prevTasksRef.current[task.id] = task;
    });
  }, [workerTasks]);

  // Also seed prevTasksRef on first load for active worker tasks
  // so cancellation detection works even if task isn't in workerTasks yet
  useEffect(() => {
    if (!me?.id) return;
    base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }).then(tasks => {
      tasks.forEach(task => {
        if (!prevTasksRef.current[task.id]) {
          prevTasksRef.current[task.id] = task;
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
          addNotification({
            type: 'application_approved',
            taskTitle: app.task_id,
          });
        }
      }
      prevApplicationsRef.current[app.id] = app;
    });
  }, [myApplications]);

  // Real-time chat message push notifications
  useEffect(() => {
    if (!me?.id) return;
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

  // Listen for new review notifications
  useEffect(() => {
    const handleNewReview = (e) => {
      const { reviewerName, rating, comment } = e.detail;
      addNotification({
        type: 'new_review',
        reviewerName,
        rating,
        preview: comment,
      });
    };
    window.addEventListener('new_review', handleNewReview);
    return () => window.removeEventListener('new_review', handleNewReview);
  }, []);

  // Listen for approval revoked by client — show popup + notification to worker ONLY
  useEffect(() => {
    const handleRevoked = (e) => {
      const { task } = e.detail;
      // Only show to the worker (not to the task owner/client)
      if (!me?.id || me?.id === task?.client_id) return;
      setRevokedTask(task);
      addNotification({
        type: 'approval_revoked',
        taskTitle: task?.title || 'משימה',
        taskId: task?.id,
      });
    };
    window.addEventListener('approval_revoked_by_client', handleRevoked);
    return () => window.removeEventListener('approval_revoked_by_client', handleRevoked);
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
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type !== 'update') return;
      const task = event.data;
      if (!task) return;
      const prev = prevTasksRef.current[task.id];
      if (!prev) return;

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

      // TAKEN → OPEN: worker_id cleared
      if (prev.status === 'TAKEN' && task.status === 'OPEN' && prev.worker_id && !task.worker_id) {
        // Client: worker left voluntarily — only notify client, never the worker
        if (task.client_id === me?.id && me?.id !== prev.worker_id) {
          addNotification({
            type: 'worker_left_task',
            taskTitle: task.title,
            taskId: task.id,
            workerName: prev.worker_name,
          });
        }
        // Worker: publisher revoked the approval — only show to the worker, never to the client
        if (prev.worker_id === me?.id && me?.id !== task.client_id && !prev.worker_status) {
          addNotification({
            type: 'approval_revoked',
            taskTitle: task.title,
            taskId: task.id,
          });
          setRevokedTask(task);
        }
      }

      // Worker notification: task was cancelled after being assigned (only show to the worker, not the client)
      if (
        task.status === 'CANCELLED' &&
        me?.id !== task.client_id &&
        (prev.worker_id === me?.id || task.worker_id === me?.id) &&
        (prev.status === 'TAKEN' || (!prev.status && task.worker_id === me?.id))
      ) {
        addNotification({
          type: 'task_cancelled_worker',
          taskTitle: prev.title || task.title,
        });
        // Show popup to worker only
        setCancelledTask(prev.status ? task : { ...task, worker_id: me?.id });
      }

      // Client notification: task was cancelled (only show to the client, not the worker)
      if (
        task.client_id === me?.id &&
        me?.id !== prev.worker_id &&
        prev.status === 'TAKEN' &&
        task.status === 'CANCELLED'
      ) {
        setCancelSuccessTask(task);
      }
    });
    return unsubscribe;
  }, [me?.id]);

  // Listen for real-time application events
  useEffect(() => {
    const unsubscribe = base44.entities.TaskApplication.subscribe((event) => {
      if (event.type === 'create' && event.data?.task_id) {
        // Someone applied to my task - notify client
        const task = myPublishedTasks.find(t => t.id === event.data.task_id);
        if (task) {
          addNotification({
            type: 'application_received',
            taskTitle: task.title,
            taskId: task.id,
          });
        }
      } else if (event.type === 'update' && event.data?.status === 'approved') {
        // My application was approved
        if (event.data.worker_id === me?.id) {
          const task = myPublishedTasks.find(t => t.id === event.data.task_id) || 
                      workerTasks.find(t => t.id === event.data.task_id);
          addNotification({
            type: 'application_approved',
            taskTitle: task?.title || 'משימה',
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
      const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
      return stored.filter(n => !n.read).length;
    },
    staleTime: 30000,
  });

  const navItems = [
    { to: '/', icon: Home, label: 'פיד' },
    { to: '/map', icon: Map, label: 'מפה' },
    { to: '/create-task', icon: Plus, label: 'ג\'ובה', primary: true },
    { to: '/notifications', icon: Bell, label: 'התראות', badge: unreadNotifCount },
    { to: '/profile', icon: User, label: 'פרופיל' },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#f8f9fc', overflow: 'hidden' }}>
      <ChatPushNotification />
      <SideMenu />

      {/* Portals — rendered directly to body to escape stacking context */}
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
      {showLoginPrompt && createPortal(
        <LoginPromptModal
          onLogin={() => {
            login('/create-task');
            setShowLoginPrompt(false);
          }}
          onClose={() => setShowLoginPrompt(false)}
          type="publish"
        />,
        document.body
      )}

      {cancelWarningTask && createPortal(
        <div className="mobile-sheet-overlay">
          <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480, padding: '20px 20px 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#0f1e40', marginBottom: 8 }}>רגע לפני ביטול</div>
              <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                העובד <strong style={{ color: '#0f1e40' }}>{cancelWarningTask.worker_name}</strong> טרח ויצא במיוחד עבורך.
                <br />בביטול הכסף יוחזר אליך במלואו.
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
                  try {
                    await base44.functions.invoke('cancelTaskPayment', { taskId: cancelWarningTask.id });
                  } catch (err) {
                    console.error('Cancel failed:', err);
                  }
                  setCancelWarningTask(null);
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <Outlet />
      </div>



      {/* Bottom Nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'white', borderTop: '1px solid #dce8f5',
        boxShadow: '0 -2px 20px rgba(10,90,190,0.08)',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '8px 16px 12px' }}>
          {navItems.map(({ to, icon: Icon, label, primary, badge }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <button key={to} onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginPrompt(true);
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
                <span style={{ fontSize: 10, color: active ? '#1a6fd4' : '#a0b8d8', fontWeight: active ? 700 : 500 }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}