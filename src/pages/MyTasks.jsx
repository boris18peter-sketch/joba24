import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, X, RefreshCw, Loader2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { getCategoryLabel } from '@/lib/categories';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';

const STATUS = {
  OPEN:      { label: 'פתוח',     bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  TAKEN:     { label: 'בעבודה',   bg: '#fef3c7', color: '#b45309', dot: '#f59e0b' },
  COMPLETED: { label: 'הושלם',    bg: '#dcfce7', color: '#166534', dot: '#10b981' },
  CANCELLED: { label: 'בוטל',     bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  EXPIRED:   { label: 'פג תוקף',  bg: '#fef3c7', color: '#92400e', dot: '#f97316' },
};

const TABS = [
  { key: 'active',    label: 'פעילות',  statuses: ['OPEN', 'TAKEN'] },
  { key: 'completed', label: 'הושלמו',  statuses: ['COMPLETED'] },
  { key: 'other',     label: 'ארכיון',  statuses: ['CANCELLED', 'EXPIRED'] },
];

export default function MyTasks() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [cancelTask, setCancelTask] = useState(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['myTasksPage', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
    staleTime: 0,
  });

  // Real-time task sync
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.Task.subscribe((event) => {
      const t = event.data || {};
      queryClient.setQueryData(['myTasksPage', me.id], (old = []) => {
        if (event.type === 'create') {
          if (t.client_id !== me.id) return old;
          if (old.find(x => x.id === event.id)) return old;
          return [t, ...old];
        }
        if (event.type === 'update') {
          return old.map(x => x.id === event.id ? { ...x, ...t } : x);
        }
        if (event.type === 'delete') {
          return old.filter(x => x.id !== event.id);
        }
        return old;
      });
    });
    return unsub;
  }, [me?.id, queryClient]);

  const openTaskIds = tasks.filter(t => t.status === 'OPEN').map(t => t.id);

  const { data: allApps = [] } = useQuery({
    queryKey: ['allMyTaskApps', openTaskIds.join(',')],
    queryFn: async () => {
      if (!openTaskIds.length) return [];
      const results = await Promise.all(
        openTaskIds.map(id => base44.entities.TaskApplication.filter({ task_id: id, status: 'pending' }))
      );
      return results.flat();
    },
    enabled: openTaskIds.length > 0,
    refetchInterval: 8000,
    staleTime: 0,
  });

  const cancelMutation = useMutation({
    mutationFn: (taskId) => base44.functions.invoke('cancelTaskPayment', { taskId }).then(r => { if (!r.data?.success) throw new Error(); }),
    onMutate: (taskId) => {
      // Optimistic update
      queryClient.setQueryData(['myTasksPage', me?.id], (old = []) =>
        old.map(t => t.id === taskId ? { ...t, status: 'CANCELLED' } : t)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasksPage', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['myTasks', me?.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('המשימה בוטלה');
      setCancelTask(null);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasksPage', me?.id] });
      toast.error('שגיאה בביטול, נסה שוב');
      setCancelTask(null);
    },
  });

  const handleReopen = (task) => {
    // Only EXPIRED tasks that were already paid don't need a new payment
    if (task.status === 'EXPIRED' && task.payment_status === 'funded') {
      navigate(`/edit-task/${task.id}`, { state: { repostMode: true } });
      return;
    }
    // All other cases (CANCELLED, EXPIRED without payment) → new task with payment
    const params = new URLSearchParams({
      repost: '1',
      title: task.title || '',
      description: task.description || '',
      price: String(task.price || ''),
      city: task.city || '',
      location_name: task.location_name || '',
      category: task.category || '',
      estimated_time: task.estimated_time || '',
      approval_mode: task.approval_mode || 'manual',
    });
    navigate(`/create-task?${params.toString()}`);
  };

  const tab = TABS.find(t => t.key === activeTab);
  const filtered = tasks.filter(t => tab?.statuses.includes(t.status));
  const pendingCountForTask = (taskId) => allApps.filter(a => a.task_id === taskId).length;

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb' }} dir="rtl">
      <PageHeader title="הג'ובות שלי" right={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{tasks.length} ג'ובות</span>} />
      {/* Tabs bar */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '12px 16px 14px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(t => {
            const count = tasks.filter(x => t.statuses.includes(x.status)).length;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ flex: 1, height: 34, borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeTab === t.key ? 'white' : 'rgba(255,255,255,0.15)',
                  color: activeTab === t.key ? '#0f2b6b' : 'rgba(255,255,255,0.8)',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span style={{ marginRight: 4, fontSize: 10, background: activeTab === t.key ? '#1a6fd4' : '#fbbf24', color: 'white', padding: '1px 5px', borderRadius: 8 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes pendingPulse { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
      <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="animate-spin text-primary mx-auto" /></div>
        ) : filtered.length === 0 && activeTab === 'active' ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>📭</div>
            <p style={{ fontWeight: 700, color: '#0f2b6b', margin: 0, fontSize: 16 }}>אין ג'ובות פעילות</p>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>פרסם ג'ובה חדשה וקבל עובד תוך דקות</p>
            <Link to="/create-task" style={{ textDecoration: 'none' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 8, height: 50, paddingInline: 28, borderRadius: 14, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,111,212,0.35)' }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>+</span>
                פרסם משימה
              </button>
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <p style={{ fontWeight: 700, color: '#0f2b6b', margin: 0 }}>אין ג'ובות כאן</p>
          </div>
        ) : (
          filtered.map(task => {
            const st = STATUS[task.status] || STATUS.OPEN;
            const pendingApps = pendingCountForTask(task.id);
            return (
              <div key={task.id} style={{ background: 'white', borderRadius: 20, border: '1px solid #dce8f5', padding: 16, boxShadow: '0 2px 10px rgba(26,111,212,0.06)' }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <Link to={`/task/${task.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2b6b', lineHeight: 1.3 }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{getCategoryLabel(task.category)} · {formatDistanceToNow(new Date(task.created_date), { addSuffix: true })}</div>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, display: 'inline-block' }} />
                      {st.label}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: '#0f2b6b' }}>₪{task.price}</span>
                  </div>
                </div>

                {/* Worker info */}
                {task.worker_name && task.status === 'TAKEN' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '8px 12px', marginBottom: 10, fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                    👷 {task.worker_name} מבצע את הג'ובה
                  </div>
                )}

                {/* Pending applicants badge */}
                {pendingApps > 0 && task.status === 'OPEN' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '8px 12px', marginBottom: 10, fontSize: 12, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pendingPulse 1.5s infinite' }} />
                    {pendingApps} בקשות ממתינות לאישורך
                    <span style={{ marginRight: 'auto', background: '#fbbf24', color: 'white', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 900 }}>{pendingApps}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to={`/task/${task.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                    <button style={{ width: '100%', height: 36, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      👁 פרטים
                    </button>
                  </Link>

                  {task.status === 'TAKEN' && (
                    <Link to={`/chat/${task.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{ height: 36, paddingInline: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MessageCircle size={14} /> צ'אט
                      </button>
                    </Link>
                  )}

                  {task.status === 'OPEN' && (
                    <Link to={`/task/${task.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{ height: 36, paddingInline: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users size={14} /> מועמדים
                      </button>
                    </Link>
                  )}

                  {task.status === 'OPEN' && (
                    <button
                      onClick={() => setCancelTask(task)}
                      style={{ height: 36, paddingInline: 14, borderRadius: 10, background: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <X size={14} /> בטל
                    </button>
                  )}

                  {(task.status === 'EXPIRED' || task.status === 'CANCELLED') && (
                    <button
                      onClick={() => handleReopen(task)}
                      style={{ height: 36, paddingInline: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <RefreshCw size={14} /> ערוך ופתח
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {cancelTask && createPortal(
        <CancelTaskConfirmModal
          task={cancelTask}
          isLoading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(cancelTask.id)}
          onClose={() => setCancelTask(null)}
        />,
        document.body
      )}
    </div>
  );
}