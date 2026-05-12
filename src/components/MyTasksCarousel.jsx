import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronLeft, Plus, RefreshCw, Users, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

const statusConfig = {
  OPEN: { label: 'פתוח', color: '#dbeafe', textColor: '#1d4ed8', dot: '#3b82f6' },
  TAKEN: { label: 'בעבודה', color: '#fef9ec', textColor: '#92700a', dot: '#d4a017' },
  COMPLETED: { label: 'הושלם', color: '#dcfce7', textColor: '#166534', dot: '#10b981' },
  CANCELLED: { label: 'בוטל', color: '#fee2e2', textColor: '#991b1b', dot: '#ef4444' },
  EXPIRED: { label: 'פג תוקף', color: '#fef3ea', textColor: '#8a4a1a', dot: '#c2773a' },
};

function TaskMenu({ task, onClose, queryClient, navigate }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [onClose]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    onClose();
    await base44.entities.Task.update(task.id, { status: 'CANCELLED' });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('משימה בוטלה');
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onClose();
    navigate(`/edit-task/${task.id}`);
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div ref={ref} onClick={e => e.stopPropagation()} style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000,
        background: 'white', borderRadius: 14, border: 'none',
        boxShadow: '0 16px 32px rgba(0,0,0,0.15)', minWidth: 140, overflow: 'hidden',
      }}>
        {[
          { icon: Pencil, label: 'עריכה', onClick: handleEdit, color: '#1a6fd4' },
          { icon: Trash2, label: 'ביטול', onClick: handleDelete, color: '#dc2626' },
        ].map(({ icon: Icon, label, onClick }, idx) => (
          <button key={label} onClick={onClick}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: idx === 0 ? '#1a6fd4' : '#dc2626', borderBottom: idx === 0 ? '1px solid #f1f5f9' : 'none', textAlign: 'right' }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
    </>
  );
}

export default function MyTasksCarousel({ myTasks }) {
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
      const results = await Promise.all(
        openTaskIds.map(id => base44.entities.TaskApplication.filter({ task_id: id, status: 'pending' }))
      );
      return results.flat();
    },
    enabled: openTaskIds.length > 0,
    refetchInterval: 8000,
    staleTime: 0,
  });

  const pendingCountForTask = (taskId) => pendingApps.filter(a => a.task_id === taskId).length;

  const handleReopen = async (e, task) => {
    e.preventDefault();
    e.stopPropagation();
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.Task.update(task.id, { status: 'OPEN', expires_at: newExpiry, worker_id: null, worker_name: null, worker_status: null });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
  };

  // Empty state: show a "Post Task" button without title
  if (relevantTasks.length === 0) {
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

      <div className="my-tasks-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent', WebkitOverflowScrolling: 'touch' }}>
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
            <Link key={task.id} to={`/task/${task.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 280,
                minHeight: 320,
                background: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
                borderRadius: 24,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10,
                boxShadow: '0 8px 32px rgba(26,111,212,0.3)',
                position: 'relative',
                boxSizing: 'border-box',
                color: 'white',
              }}>
                {/* Header: Price + Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>₪{task.price}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'white', display: 'inline-block', flexShrink: 0 }} />
                    {status.label}
                  </div>
                </div>

                {/* Title */}
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                  {task.title}
                </div>

                {/* Worker info (if taken) */}
                {isTaken && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.worker_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                        ⭐ {task.worker_rating?.toFixed(1) || '—'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending applications badge (if open) */}
                {hasPending && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="white" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                      {pendingCount} בקשה{pendingCount > 1 ? 'ות' : ''} ממתינות
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  {isTaken ? (
                    <>
                      <Link to={`/chat/${task.id}`} onClick={e => e.stopPropagation()} style={{ flex: 1, textDecoration: 'none' }}>
                        <button style={{ width: '100%', height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <MessageCircle size={14} /> צ'אט
                        </button>
                      </Link>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/task/${task.id}`); }} style={{ flex: 1, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        פרטים
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === task.id ? null : task.id); }} style={{ flex: 1, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <MoreVertical size={14} /> אפשרויות
                      </button>
                      {openMenuId === task.id && (
                        <TaskMenu task={task} onClose={() => setOpenMenuId(null)} queryClient={queryClient} navigate={navigate} />
                      )}
                      {isExpired && (
                        <button onClick={(e) => handleReopen(e, task)} style={{ flex: 1, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <RefreshCw size={14} /> פתח מחדש
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </div>
  );
}