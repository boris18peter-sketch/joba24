import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

const statusConfig = {
  OPEN: { label: 'פתוח', color: '#dbeafe', textColor: '#1d4ed8' },
  TAKEN: { label: 'בעבודה', color: '#fed7aa', textColor: '#b45309' },
  COMPLETED: { label: 'הושלם', color: '#dcfce7', textColor: '#166534' },
  CANCELLED: { label: 'בוטל', color: '#ffe2e2', textColor: '#991b1b' },
  EXPIRED: { label: 'פג תוקף', color: '#fef3c7', textColor: '#92400e' },
};

export default function MyTasksCarousel({ myTasks }) {
  if (!myTasks || myTasks.length === 0) return null;

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f2b6b', margin: 0 }}>המשימות שלי</h2>
        <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>{myTasks.length} משימות</span>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollBehavior: 'smooth', paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {myTasks.map(task => {
          const status = statusConfig[task.status] || statusConfig.OPEN;
          return (
            <Link key={task.id} to={`/task/${task.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ minWidth: 160, background: 'white', borderRadius: 14, border: '1px solid #dce8f5', padding: 12, display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(26,111,212,0.08)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,111,212,0.15)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(26,111,212,0.08)'}
              >
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, background: status.color, color: status.textColor, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                    {status.label}
                  </span>
                  <span style={{ fontSize: 10, background: '#f1f5f9', color: '#333', padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                    {getCategoryLabel(task.category)}
                  </span>
                </div>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#0f2b6b', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#111' }}>₪{task.price}</span>
                  <ChevronRight size={14} color="#999" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}