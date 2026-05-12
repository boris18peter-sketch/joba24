import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, Plus, User, Wallet, Bell } from 'lucide-react';
import SideMenu from '@/components/SideMenu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect, useRef } from 'react';
import LiveNotificationPopup from '@/components/LiveNotificationPopup';
import VerifyModal from '@/components/VerifyModal';
import { useVerifyGuard } from '@/hooks/useVerifyGuard';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const prevTasksRef = useRef({});
  const prevApplicationsRef = useRef({});

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { gate, showVerify, onSuccess: onVerifySuccess, onClose: onVerifyClose } = useVerifyGuard(me);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasksLayout', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
    refetchInterval: 10000,
  });

  // Active task as worker
  const activeWorkerTask = workerTasks.find(t => t.status === 'TAKEN') || null;

  // Get my published tasks for real-time notifications
  const { data: myPublishedTasks = [] } = useQuery({
    queryKey: ['myPublishedTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id,
    refetchInterval: 10000,
  });

  // Get my applications
  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplicationsLayout', me?.id],
    queryFn: () => base44.entities.TaskApplication.filter({ worker_id: me?.id }, '-created_date', 50),
    enabled: !!me?.id,
    refetchInterval: 10000,
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

      // Worker notification: task was cancelled after being assigned
      if (
        prev.worker_id === me?.id &&
        prev.status === 'TAKEN' &&
        task.status === 'CANCELLED'
      ) {
        const compensation = Math.round((prev.price || task.price || 0) * 0.2);
        // Automatically credit the worker's wallet
        base44.entities.Transaction.create({
          user_id: me.id,
          task_id: task.id,
          task_title: prev.title || task.title,
          amount: compensation,
          type: 'earning',
          status: 'completed',
        }).then(() => {
          const newBalance = (me?.wallet_balance || 0) + compensation;
          base44.auth.updateMe({ wallet_balance: newBalance });
        });
        addNotification({
          type: 'task_cancelled_worker',
          taskTitle: prev.title || task.title,
          compensation,
        });
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
    refetchInterval: 5000,
    staleTime: 0,
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
      {showVerify && <VerifyModal onClose={onVerifyClose} onSuccess={onVerifySuccess} />}
      <SideMenu />
      
      {/* Live Notifications Stack */}
      <div style={{ position: 'fixed', top: 12, left: 0, right: 0, zIndex: 9999, pointerEvents: 'none' }}>
        {notifications.map(notif => (
          <div key={notif.id} style={{ pointerEvents: 'auto' }}>
            <LiveNotificationPopup 
              notification={notif} 
              onClose={() => removeNotification(notif.id)} 
            />
          </div>
        ))}
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 96 }}>
        <Outlet />
      </div>



      {/* Bottom Nav */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'white', borderTop: '1px solid #dce8f5',
        boxShadow: '0 -2px 20px rgba(10,90,190,0.08)',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '8px 16px 12px' }}>
          {navItems.map(({ to, icon: Icon, label, primary, badge }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <button key={to} onClick={() => gate(() => navigate(to))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -22, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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