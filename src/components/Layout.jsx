import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, Plus, User, Wallet } from 'lucide-react';
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

  // Watch for task status changes on MY published tasks (polling fallback — real-time subscription handles main flow)
  useEffect(() => {
    const isInitial = Object.keys(prevTasksRef.current).length === 0;
    myPublishedTasks.forEach(task => {
      const prevTask = prevTasksRef.current[task.id];
      if (prevTask && !isInitial) {
        if (task.status === 'TAKEN' && prevTask.status === 'OPEN') {
          addNotification({ type: 'task_taken', taskTitle: task.title, workerName: task.worker_name });
        }
      }
      prevTasksRef.current[task.id] = task;
    });
  }, [myPublishedTasks]);

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

  // Real-time task events for client (push-like)
  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type !== 'update') return;
      const task = event.data;
      if (!task || task.client_id !== me?.id) return;
      const prev = prevTasksRef.current[task.id];
      if (!prev) return;

      if (task.status === 'TAKEN' && prev.status === 'OPEN') {
        addNotification({ type: 'task_taken', taskTitle: task.title, workerName: task.worker_name });
      }
      if (task.worker_status && task.worker_status !== prev.worker_status) {
        if (task.worker_status === 'on_the_way') addNotification({ type: 'worker_on_the_way', taskTitle: task.title, workerName: task.worker_name });
        else if (task.worker_status === 'arrived') addNotification({ type: 'worker_arrived', taskTitle: task.title, workerName: task.worker_name });
        else if (task.worker_status === 'done') addNotification({ type: 'worker_done', taskTitle: task.title, workerName: task.worker_name });
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
            workerName: event.data.worker_name,
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
          });
        }
      }
    });
    return unsubscribe;
  }, [me?.id, myPublishedTasks, workerTasks]);

  const recentNotifKeysRef = useRef(new Set());

  const addNotification = (notification) => {
    // Dedup: same type+task within 10 seconds won't fire twice
    const dedupKey = `${notification.type}__${notification.taskTitle || ''}__${notification.taskId || ''}`;
    if (recentNotifKeysRef.current.has(dedupKey)) return;
    recentNotifKeysRef.current.add(dedupKey);
    setTimeout(() => recentNotifKeysRef.current.delete(dedupKey), 10000);

    const id = Date.now();
    setNotifications(prev => {
      // Max 3 notifications at once
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

  const navItems = [
    { to: '/', icon: Home, label: 'פיד' },
    { to: '/map', icon: Map, label: 'מפה' },
    { to: '/create-task', icon: Plus, label: 'ג\'ובה', primary: true },
    { to: '/wallet', icon: Wallet, label: 'ארנק', badge: inProgressCount },
    { to: '/profile', icon: User, label: 'פרופיל' },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#f4f7fb', overflow: 'hidden' }}>
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
      
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 80 }}>
        <Outlet />
      </div>

      {/* Floating Active Task Buttons */}
      {(activeWorkerTask || activeClientTask) && !location.pathname.includes('/chat/') && (
        <div style={{ position: 'absolute', bottom: 82, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
          {activeWorkerTask && !location.pathname.includes(`/task/${activeWorkerTask.id}`) && (
            <button
              onClick={() => navigate(`/task/${activeWorkerTask.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#0b6e4f',
                color: 'white', fontWeight: 600, fontSize: 13,
                padding: '9px 16px', borderRadius: 24,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(11,110,79,0.45)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'livePing 1.8s ease-in-out infinite' }} />
                <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: 'white' }} />
              </span>
              משימה בביצוע
            </button>
          )}
          {activeClientTask && !location.pathname.includes(`/task/${activeClientTask.id}`) && activeClientTask.id !== activeWorkerTask?.id && (
            <button
              onClick={() => navigate(`/task/${activeClientTask.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#7a4e10',
                color: 'white', fontWeight: 600, fontSize: 13,
                padding: '9px 16px', borderRadius: 24,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(122,78,16,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', animation: 'livePing 1.8s ease-in-out infinite' }} />
                <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: 'white' }} />
              </span>
              משימה שלי בביצוע
            </button>
          )}
          <style>{`
            @keyframes livePing { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(2.2);opacity:0} }
          `}</style>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'rgba(255,255,255,0.97)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 -1px 0 rgba(0,0,0,0.05)',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 8px 12px' }}>
          {navItems.map(({ to, icon: Icon, label, primary, badge }) => {
            const active = location.pathname === to;
            if (primary) {
              return (
                <button key={to} onClick={() => gate(() => navigate(to))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: 'linear-gradient(135deg, #1a6fd4, #1558b0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 3px 12px rgba(26,111,212,0.35)',
                    transition: 'transform 0.1s ease',
                  }}>
                    <Icon size={22} color="white" strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 10, color: '#1a6fd4', fontWeight: 600 }}>{label}</span>
                </button>
              );
            }
            return (
              <Link key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 10px', textDecoration: 'none', position: 'relative', minWidth: 44 }}>
                <div style={{ position: 'relative', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={21} color={active ? '#1a6fd4' : '#b0bec5'} strokeWidth={active ? 2.2 : 1.8} />
                  {active && (
                    <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#1a6fd4' }} />
                  )}
                  {badge > 0 && (
                    <div style={{
                      position: 'absolute', top: -5, right: -6,
                      background: '#ef4444', color: 'white',
                      fontSize: 9, fontWeight: 700,
                      minWidth: 15, height: 15, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px',
                      border: '1.5px solid white',
                    }}>{badge}</div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: active ? '#1a6fd4' : '#b0bec5', fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}