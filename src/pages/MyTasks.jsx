import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { MessageCircle, X, RefreshCw, Loader2 } from 'lucide-react';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { getCategoryLabel } from '@/lib/categories';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';
import EmptyMyTasksState from '@/components/EmptyMyTasksState';
import { STATUS_GRADIENT, STATUS_LABEL, buildRepostUrl } from '@/lib/taskUtils';

const TABS = [
  { key: 'active',    label: 'Active',  statuses: ['OPEN', 'TAKEN'] },
  { key: 'completed', label: 'Completed',  statuses: ['COMPLETED'] },
  { key: 'other',     label: 'Archive',  statuses: ['CANCELLED', 'EXPIRED'] },
];

export default function MyTasks() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const [activeTab, setActiveTab] = useState('active');
  const [cancelTask, setCancelTask] = useState(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['myTasksPage', me?.id],
    queryFn: () => base44.entities.Task.filter({ client_id: me.id }, '-created_date', 100),
    enabled: !!me?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
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
    queryKey: ['allMyTaskApps', me?.id, openTaskIds.join(',')],
    queryFn: async () => {
      if (!openTaskIds.length) return [];
      return base44.entities.TaskApplication.filter({ task_id: { $in: openTaskIds }, status: 'pending' });
    },
    enabled: openTaskIds.length > 0,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Real-time sync for applications
  useEffect(() => {
    if (!me?.id) return;
    const unsub = base44.entities.TaskApplication.subscribe((event) => {
      const app = event.data;
      if (!app) return;
      queryClient.setQueryData(['allMyTaskApps', me.id], (old = []) => {
        if (event.type === 'create' && app.status === 'pending') return old.find(a => a.id === app.id) ? old : [...old, app];
        if (event.type === 'update') {
          if (app.status !== 'pending') return old.filter(a => a.id !== app.id);
          return old.map(a => a.id === app.id ? { ...a, ...app } : a);
        }
        if (event.type === 'delete') return old.filter(a => a.id !== app.id);
        return old;
      });
    });
    return unsub;
  }, [me?.id, queryClient]);

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
      toast.success('Task cancelled');
      setCancelTask(null);
      navigate('/');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasksPage', me?.id] });
      toast.error('Error cancelling task, try again');
      setCancelTask(null);
    },
  });

  const handleReopen = async (task) => {
    try {
      await base44.functions.invoke('resetTaskApplications', { taskId: task.id });
    } catch (_) {}
    navigate(buildRepostUrl(task));
  };

  const tab = TABS.find(t => t.key === activeTab);
  const filtered = tasks.filter(t => tab?.statuses.includes(t.status));
  const pendingCountForTask = (taskId) => allApps.filter(a => a.task_id === taskId).length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)', paddingBottom: 'calc(400px + env(safe-area-inset-bottom))' }} dir="rtl">
      <PageHeader title="My Tasks" right={<span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{tasks.length} tasks</span>} />
      {/* Tabs bar */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '12px 16px 14px', position: 'sticky', top: 47, zIndex: 49 }}>
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
          <EmptyMyTasksState />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>No tasks here</p>
          </div>
        ) : (
          filtered.map(task => {
            const gradient = STATUS_GRADIENT[task.status] || STATUS_GRADIENT.OPEN;
            const statusLabel = STATUS_LABEL[task.status] || task.status;
            const pendingApps = pendingCountForTask(task.id);
            return (
              <div key={task.id} onClick={() => openTaskSheet(task.id)} style={{ borderRadius: 22, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.13)', cursor: 'pointer' }}>
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
                      {pendingApps} pending applications
                    </div>
                  )}
                  {(task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') && (
                    <button onClick={e => { e.stopPropagation(); handleReopen(task); }} style={{ height: 34, paddingInline: 12, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <RefreshCw size={13} /> Repost
                    </button>
                  )}
                  {task.status === 'TAKEN' && (
                    <Link to={`/chat/${task.id}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                      <button style={{ height: 34, paddingInline: 12, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MessageCircle size={13} /> Chat
                      </button>
                    </Link>
                  )}
                  {task.status === 'OPEN' && (
                    <button onClick={e => { e.stopPropagation(); setCancelTask(task); }} style={{ height: 34, paddingInline: 12, borderRadius: 10, background: '#fff1f1', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <X size={13} /> Cancel
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