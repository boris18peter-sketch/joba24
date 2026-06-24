import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { MessageCircle, ChevronLeft, Plus, RefreshCw, Users, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import CancelTaskConfirmModal from '@/components/CancelTaskConfirmModal';

const statusConfig = {
  OPEN: { label: 'פתוח', color: '#dbeafe', textColor: '#1d4ed8', dot: '#3b82f6' },
  TAKEN: { label: 'בעבודה', color: '#fef9ec', textColor: '#92700a', dot: '#d4a017' },
  COMPLETED: { label: 'הושלם', color: '#dcfce7', textColor: '#166534', dot: '#10b981' },
  CANCELLED: { label: 'בוטל', color: '#fee2e2', textColor: '#991b1b', dot: '#ef4444' },
  EXPIRED: { label: 'פג תוקף', color: '#fef3ea', textColor: '#8a4a1a', dot: '#c2773a' },
};

function TaskMenuSheet({ task, onClose, queryClient, navigate }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelTask = async () => {
    setCancelling(true);
    try {
      const res = await base44.functions.invoke('cancelTaskPayment', { taskId: task.id });
      if (!res.data?.success) throw new Error('שגיאה בביטול');
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });
      setCancelling(false);
      setShowCancelConfirm(false);
      onClose();
    } catch {
      setCancelling(false);
      toast.error('שגיאה בביטול, נסה שוב');
    }
  };

  const handleEdit = () => {
    onClose();
    navigate(`/create-task?editId=${task.id}`);
  };

  return createPortal(
    <>
      <div className="mobile-sheet-overlay" onClick={onClose} dir="rtl">
        <div className="mobile-sheet" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
          {/* Handle */}
          <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '12px auto 16px' }} />
          {/* Task name */}
          <div style={{ padding: '0 20px 14px', borderBottom: '1px solid #f0f4fa' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2b6b' }}>{task.title}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>₪{task.price}</div>
          </div>
          {/* Actions */}
          <div style={{ padding: '8px 12px 8px' }}>
            <button onClick={handleEdit}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#1a6fd4' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pencil size={16} color="#1a6fd4" />
              </div>
              ערוך משימה
            </button>
            <button onClick={() => setShowCancelConfirm(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} color="#dc2626" />
              </div>
              בטל משימה
            </button>
          </div>
          <div style={{ padding: '0 12px 8px' }}>
            <button onClick={onClose}
              style={{ width: '100%', height: 48, borderRadius: 14, background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#64748b' }}>
              ביטול
            </button>
          </div>
        </div>
      </div>
      {showCancelConfirm && (
        <CancelTaskConfirmModal
          task={task}
          isLoading={cancelling}
          onConfirm={handleCancelTask}
          onClose={() => setShowCancelConfirm(false)}
        />
      )}
    </>,
    document.body
  );
}

export default function MyTasksCarousel({ myTasks, hideWhenWorking }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openMenuId, setOpenMenuId] = useState(null);

  // Show active/actionable tasks — OPEN, EXPIRED, TAKEN
  const relevantTasks = (myTasks || []).filter(t => ['OPEN', 'EXPIRED', 'TAKEN'].includes(t.status));
  const openTaskIds = relevantTasks.filter(t => t.status === 'OPEN').map(t => t.id);

  // Fetch pending applications for open tasks to show badge
  const { data: pendingApps = [] } = useQuery({
    queryKey: ['carouselPendingApps', openTaskIds.join(',')],
    queryFn: async () => {
      if (!openTaskIds.length) return [];
      return base44.entities.TaskApplication.filter({ task_id: { $in: openTaskIds }, status: 'pending' });
    },
    enabled: openTaskIds.length > 0,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const pendingCountForTask = (taskId) => pendingApps.filter(a => a.task_id === taskId).length;

  const handleReopen = (e, task) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/create-task?editId=${task.id}&repost=1`);
  };

  // Empty state: show a "Post Task" button without title (unless user is currently working on a task)
  if (relevantTasks.length === 0 && !hideWhenWorking) {
    return (
      <div style={{ padding: '0 16px 12px' }}>
        <Link to="/create-task" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            borderRadius: 16, padding: '13px 20px',
            boxShadow: '0 4px 18px rgba(26,111,212,0.25)',
            cursor: 'pointer',
          }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={16} color="white" strokeWidth={3} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>פרסם ג'ובה חדשה</span>
          </div>
        </Link>
      </div>
    );
  }

  if (hideWhenWorking) {
    return null;
  }

  return (
    <div style={{ padding: '14px 16px 6px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          משימות שפרסמתי
          <span style={{ fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: 20 }}>{relevantTasks.length}</span>
        </h2>
        <div style={{ flex: 1, height: 1, background: '#e8eef8' }} />
        <Link to="/my-tasks" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: '#1a6fd4', whiteSpace: 'nowrap' }}>
          הכל <ChevronLeft size={13} />
        </Link>
      </div>

      <div className="my-tasks-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent', WebkitOverflowScrolling: 'touch', marginBottom: 0 }}>
        <style>{`
          .my-tasks-scroll::-webkit-scrollbar { height: 2px; }
          .my-tasks-scroll::-webkit-scrollbar-track { background: transparent; }
          .my-tasks-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        `}</style>
        {relevantTasks.map(task => {
          const status = statusConfig[task.status] || statusConfig.OPEN;
          const isTaken = task.status === 'TAKEN';
          const isExpired = task.status === 'EXPIRED';
          const isOpen = task.status === 'OPEN';
          const pendingCount = isOpen ? pendingCountForTask(task.id) : 0;
          const hasPending = pendingCount > 0;

          return (
            <div key={task.id} style={{ flexShrink: 0, position: 'relative' }}>
              <div
                onClick={() => { if (openMenuId !== task.id) navigate(`/task/${task.id}`); }}
                style={{
                  width: 168,
                  minHeight: hasPending ? 126 : 108,
                  background: isExpired ? '#fff7ed' : hasPending ? '#fffdf5' : 'white',
                  borderRadius: 16,
                  border: hasPending ? '1.5px solid #fbbf24' : isTaken ? '1.5px solid #c8903a' : isExpired ? '1.5px solid #c07040' : '1px solid #e8eef8',
                  padding: '11px 12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 6,
                  boxShadow: hasPending ? '0 2px 12px rgba(251,191,36,0.18)' : isTaken ? '0 2px 12px rgba(192,135,58,0.15)' : '0 2px 8px rgba(15,43,107,0.06)',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}>
                {/* Top row: status + actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot, display: 'inline-block', flexShrink: 0, ...(isTaken ? { animation: 'pulse 1.5s infinite' } : {}) }} />
                    <span style={{ fontSize: 10, color: status.textColor, fontWeight: 700 }}>{status.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isTaken && (
                      <div onClick={e => { e.stopPropagation(); navigate(`/chat/${task.id}`); }}>
                        <div style={{ width: 22, height: 22, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MessageCircle size={11} color="#1a6fd4" />
                        </div>
                      </div>
                    )}
                    {isOpen && (
                      <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === task.id ? null : task.id); }}
                        style={{ width: 22, height: 22, borderRadius: 7, background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MoreVertical size={11} color="#64748b" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div style={{ fontSize: 12, fontWeight: 800, color: isExpired ? '#9a3412' : '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </div>

                {/* Pending applications badge */}
                {hasPending && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={9} color="#d97706" />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#92400e', lineHeight: 1.2 }}>
                      {pendingCount} בקשה{pendingCount > 1 ? 'ות' : ''} ממתינות
                    </span>
                  </div>
                )}

                {/* Bottom row: price + worker/reopen */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: isExpired ? '#c2410c' : '#111' }}>₪{task.price}</span>
                  {isTaken && task.worker_name && (
                    <span style={{ fontSize: 9, color: '#b07030', fontWeight: 700, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.worker_name}
                    </span>
                  )}
                  {isExpired && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReopen(e, task); }}
                      style={{ height: 22, padding: '0 8px', borderRadius: 7, background: '#ea580c', border: 'none', color: 'white', fontWeight: 700, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      <RefreshCw size={9} /> ערוך ופתח
                    </button>
                  )}
                </div>
              </div>
              {openMenuId === task.id && (
                <TaskMenuSheet task={task} onClose={() => setOpenMenuId(null)} queryClient={queryClient} navigate={navigate} />
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  );
}