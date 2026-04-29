import { Link } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { MessageCircle, ChevronLeft } from 'lucide-react';

const statusConfig = {
  OPEN: { label: 'פתוח', color: '#dbeafe', textColor: '#1d4ed8', dot: '#3b82f6' },
  TAKEN: { label: 'בעבודה', color: '#fef3c7', textColor: '#b45309', dot: '#f59e0b' },
  COMPLETED: { label: 'הושלם', color: '#dcfce7', textColor: '#166534', dot: '#10b981' },
  CANCELLED: { label: 'בוטל', color: '#fee2e2', textColor: '#991b1b', dot: '#ef4444' },
  EXPIRED: { label: 'פג תוקף', color: '#fef3c7', textColor: '#92400e', dot: '#f97316' },
};

export default function MyTasksCarousel({ myTasks }) {
  if (!myTasks || myTasks.length === 0) return null;

  // Only show active/relevant tasks
  const relevantTasks = myTasks.filter(t => t.status === 'OPEN' || t.status === 'TAKEN');
  if (relevantTasks.length === 0) return null;

  return (
    <div style={{ padding: '0 16px 4px' }}>
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f2b6b', margin: 0 }}>
          משימות שפרסמתי
          <span style={{ marginRight: 6, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: 20 }}>{relevantTasks.length}</span>
        </h2>
        <Link to="/my-tasks" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: '#1a6fd4' }}>
          כל הג'ובות <ChevronLeft size={14} />
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {relevantTasks.map(task => {
          const status = statusConfig[task.status] || statusConfig.OPEN;
          const isTaken = task.status === 'TAKEN';
          return (
            <Link key={task.id} to={`/task/${task.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                minWidth: 160,
                background: 'white',
                borderRadius: 16,
                border: isTaken ? `1.5px solid #fbbf24` : '1px solid #dce8f5',
                padding: '12px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: isTaken ? '0 2px 12px rgba(251,191,36,0.2)' : '0 1px 4px rgba(26,111,212,0.07)',
                position: 'relative',
              }}>
                {/* Status dot + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot, display: 'inline-block', ...(isTaken ? { animation: 'pulse 1.5s infinite' } : {}) }} />
                  <span style={{ fontSize: 10, color: status.textColor, fontWeight: 700 }}>{status.label}</span>
                </div>

                {/* Title */}
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f2b6b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 136 }}>
                  {task.title}
                </div>

                {/* Price + chat */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#111' }}>₪{task.price}</span>
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
                  <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
                    👷 {task.worker_name}
                  </div>
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