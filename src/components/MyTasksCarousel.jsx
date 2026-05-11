import { Link, useNavigate } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { MessageCircle, ChevronLeft, Plus, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const statusConfig = {
  OPEN: { label: 'פתוח', color: '#e8f0fc', textColor: '#1558b0', dot: '#1558b0' },
  TAKEN: { label: 'בעבודה', color: '#fdf6e8', textColor: '#8a5c10', dot: '#b07828' },
  COMPLETED: { label: 'הושלם', color: '#ecfdf5', textColor: '#065f46', dot: '#0d9266' },
  CANCELLED: { label: 'בוטל', color: '#fef2f2', textColor: '#991b1b', dot: '#ef4444' },
  EXPIRED: { label: 'פג תוקף', color: '#fff7ed', textColor: '#7c2d12', dot: '#b45309' },
};

export default function MyTasksCarousel({ myTasks }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Show open, taken, and expired tasks
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
    <div style={{ padding: '0 16px 4px' }}>
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
        משימות שפרסמתי
        <span style={{ fontSize: 11, fontWeight: 600, background: '#e8f0fc', color: '#1558b0', padding: '1px 7px', borderRadius: 6 }}>{relevantTasks.length}</span>
      </h2>
      <Link to="/my-tasks" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color: '#1558b0' }}>
        הכל <ChevronLeft size={13} />
      </Link>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {relevantTasks.map(task => {
          const status = statusConfig[task.status] || statusConfig.OPEN;
          const isTaken = task.status === 'TAKEN';
          const isExpired = task.status === 'EXPIRED';
          return (
            <Link key={task.id} to={`/task/${task.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                minWidth: 165,
                background: isExpired ? '#fff7ed' : 'white',
                borderRadius: 16,
                border: isTaken ? `1.5px solid #b07828` : isExpired ? '1.5px solid #b45309' : '1px solid #dde5f0',
                padding: '12px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: isTaken ? '0 2px 12px rgba(192,135,58,0.18)' : isExpired ? '0 2px 10px rgba(192,112,64,0.12)' : '0 1px 4px rgba(26,111,212,0.07)',
                position: 'relative',
              }}>
                {/* Status dot + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot, display: 'inline-block', ...(isTaken ? { animation: 'pulse 1.5s infinite' } : {}) }} />
                  <span style={{ fontSize: 10, color: status.textColor, fontWeight: 700 }}>{status.label}</span>
                </div>

                {/* Title */}
                <div style={{ fontSize: 12, fontWeight: 800, color: isExpired ? '#9a3412' : '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 141 }}>
                  {task.title}
                </div>

                {/* Price + chat/reopen */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: isExpired ? '#c2410c' : '#111' }}>₪{task.price}</span>
                  {isTaken && (
                    <Link to={`/chat/${task.id}`} onClick={e => e.stopPropagation()}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageCircle size={13} color="#1a6fd4" />
                      </div>
                    </Link>
                  )}
                </div>

                {/* Worker name if taken */}
                {isTaken && task.worker_name && (
                  <div style={{ fontSize: 10, color: '#b07030', fontWeight: 700 }}>
                    עובד: {task.worker_name}
                  </div>
                )}

                {/* Reopen button if expired */}
                {isExpired && (
                  <button
                    onClick={(e) => handleReopen(e, task)}
                    style={{ width: '100%', height: 26, borderRadius: 8, background: '#ea580c', border: 'none', color: 'white', fontWeight: 700, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <RefreshCw size={10} /> פתח מחדש
                  </button>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </div>
  );
}