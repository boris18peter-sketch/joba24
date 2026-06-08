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
import { WorkerPoolPill } from '@/components/WorkerPoolScanner';

const STATUS_GRADIENT = {
  OPEN:      'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
  TAKEN:     'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
  COMPLETED: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  CANCELLED: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
  EXPIRED:   'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
};
const STATUS_LABEL = {
  OPEN: 'פתוח', TAKEN: 'בעבודה', COMPLETED: 'הושלם', CANCELLED: 'בוטל', EXPIRED: 'פג תוקף',
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
      navigate('/');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasksPage', me?.id] });
      toast.error('שגיאה בביטול, נסה שוב');
      setCancelTask(null);
    },
  });

  const handleReopen = async (task) => {
    // Reset applications + refund credits before reopening
    try {
      await base44.functions.invoke('resetTaskApplications', { taskId: task.id });
    } catch (e) {
      console.error('resetTaskApplications failed', e);
    }

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
      price: String(task.base_price || task.price || ''),
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
    <div className="min-h-screen" style={{ background: 'var(--surface-1)', paddingBottom: 'calc(400px + env(safe-area-inset-bottom))' }} dir="rtl">
      <PageHeader title="המשימות שלי" right={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{tasks.length} משימות</span>} />
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
            <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: 16 }}>אין משימות פעילות</p>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>פרסם משימה חדשה וקבל עובד תוך דקות</p>
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
            <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>אין משימות כאן</p>
          </div>
        ) : (
          filtered.map(task => {
            const gradient = STATUS_GRADIENT[task.status] || STATUS_GRADIENT.OPEN;
            const statusLabel = STATUS_LABEL[task.status] || task.status;
            const pendingApps = pendingCountForTask(task.id);
            return (
              <div key={task.id} onClick={() => navigate(`/task/${task.id}`)} style={{ borderRadius: 22, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.13)', cursor: 'pointer' }}>
                <div style={{ background: gradient, padding: '16px 16px 14px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 12, left: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {task.status === 'TAKEN' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'inline-block', boxShadow: '0 0 0 3px rgba(255,255,255,0.3)' }} />}
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.4 }}>{statusLabel}</span>
                  </div>
                  <div style={{ height: 18 }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'white', fontWeight: 900, fontSize: 16, lineHeight: 1.25, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.title}</div>
                      {task.location_name && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>📍 {task.location_name}</div>}
                      {task.worker_name && task.status === 'TAKEN' && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 3, fontWeight: 700 }}>👷 {task.worker_name}</div>}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '8px 14px', textAlign: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
                      <div style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>₪{task.price}</div>
                      {task.estimated_time && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>{task.estimated_time}</div>}
                    </div>
                  </div>
                </div>
                {task.status === 'OPEN' && pendingCountForTask(task.id) === 0 && task.city && task.category && (
                <div style={{ padding: '8px 14px' }} onClick={e => e.stopPropagation()}>
                  <WorkerPoolPill category={task.category} city={task.city} />
                </div>
              )}
              <div style={{ background: 'var(--card-bg)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-1)' }} onClick={e => e.stopPropagation()}>
                  {(task.views_count > 0 || task.clicks_count > 0) && (
                    <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 6, whiteSpace: 'nowrap', alignItems: 'center' }}>
                      <span>👁 <strong style={{ color: 'var(--text-2)' }}>{task.views_count || 0}</strong></span>
                      <span>·</span>
                      <span>🖱 <strong style={{ color: 'var(--text-2)' }}>{task.clicks_count || 0}</strong></span>
                    </div>
                  )}
                  {pendingApps > 0 && task.status === 'OPEN' && (
                    <div style={{ flex: 1, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pendingPulse 1.5s infinite', flexShrink: 0 }} />
                      {pendingApps} בקשות ממתינות
                    </div>
                  )}
                  {task.status === 'OPEN' || task.status === 'TAKEN' ? (
                    <Link to={`/task/${task.id}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                      <button style={{ height: 34, paddingInline: 14, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>פרטים</button>
                    </Link>
                  ) : null}
                  {task.status === 'TAKEN' && (
                    <Link to={`/chat/${task.id}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                      <button style={{ height: 34, paddingInline: 12, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MessageCircle size={13} /> צ'אט
                      </button>
                    </Link>
                  )}
                  {task.status === 'OPEN' && (
                    <button onClick={e => { e.stopPropagation(); setCancelTask(task); }} style={{ height: 34, paddingInline: 12, borderRadius: 10, background: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <X size={13} /> בטל
                    </button>
                  )}
                  {(task.status === 'EXPIRED' || task.status === 'CANCELLED') && (
                    <button onClick={e => { e.stopPropagation(); handleReopen(task); }} style={{ height: 34, paddingInline: 12, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <RefreshCw size={13} /> פתח שוב
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