import { Link, useNavigate } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { MessageCircle, ChevronLeft, Plus, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const statusConfig = {
  OPEN: { label: 'פתוח', color: '#dbeafe', textColor: '#1d4ed8', dot: '#3b82f6' },
  TAKEN: { label: 'בעבודה', color: '#fef9ec', textColor: '#92700a', dot: '#d4a017' },
  COMPLETED: { label: 'הושלם', color: '#dcfce7', textColor: '#166534', dot: '#10b981' },
  CANCELLED: { label: 'בוטל', color: '#fee2e2', textColor: '#991b1b', dot: '#ef4444' },
  EXPIRED: { label: 'פג תוקף', color: '#fef3ea', textColor: '#8a4a1a', dot: '#c2773a' },
};

export default function MyTasksCarousel({ myTasks }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Show open, taken, and expired tasks
  // Show only active/actionable tasks — exclude COMPLETED and CANCELLED
  const relevantTasks = (myTasks || []).filter(t => ['OPEN', 'TAKEN', 'EXPIRED'].includes(t.status));

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
            boxShadow: '0 4px 18px rgba(26,111,212,0.28)',
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
    <div style={{ padding: '12px 16px 4px' }}>
      {/* Divider header — same style as "משימות שאחרים פרסמו" */}
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
      <div className="my-tasks-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent', WebkitOverflowScrolling: 'touch' }}>
        <style>{`
          .my-tasks-scroll::-webkit-scrollbar { height: 2px; }
          .my-tasks-scroll::-webkit-scrollbar-track { background: transparent; }
          .my-tasks-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        `}</style>
        {relevantTasks.map(task => {
          const status = statusConfig[task.status] || statusConfig.OPEN;
          const isTaken = task.status === 'TAKEN';
          const isExpired = task.status === 'EXPIRED';
          return (
            <Link key={task.id} to={`/task/${task.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 165,
                height: 110,
                background: isExpired ? '#fff7ed' : 'white',
                borderRadius: 16,
                border: isTaken ? `1.5px solid #c8903a` : isExpired ? '1.5px solid #c07040' : '1px solid #dce8f5',
                padding: '12px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isTaken ? '0 2px 12px rgba(192,135,58,0.18)' : isExpired ? '0 2px 10px rgba(192,112,64,0.12)' : '0 1px 4px rgba(26,111,212,0.07)',
                position: 'relative',
                boxSizing: 'border-box',
              }}>
                {/* Top row: status + chat button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot, display: 'inline-block', flexShrink: 0, ...(isTaken ? { animation: 'pulse 1.5s infinite' } : {}) }} />
                    <span style={{ fontSize: 10, color: status.textColor, fontWeight: 700 }}>{status.label}</span>
                  </div>
                  {isTaken && (
                    <Link to={`/chat/${task.id}`} onClick={e => e.stopPropagation()}>
                      <div style={{ width: 24, height: 24, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={12} color="#1a6fd4" />
                      </div>
                    </Link>
                  )}
                </div>

                {/* Title */}
                <div style={{ fontSize: 12, fontWeight: 800, color: isExpired ? '#9a3412' : '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </div>

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
                      onClick={(e) => handleReopen(e, task)}
                      style={{ height: 22, padding: '0 8px', borderRadius: 7, background: '#ea580c', border: 'none', color: 'white', fontWeight: 700, fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      <RefreshCw size={9} /> פתח מחדש
                    </button>
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