/**
 * CompletionTimeline — vertical timeline of completed tasks with review chips.
 * Props:
 *   tasks   — array of completed Task records (worker)
 *   reviews — array of Review records for the user
 */
import { CheckCircle, MapPin, Calendar } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

const CHIPS = [
  { field: 'arrived_on_time', label: '⏱️ הגיע בזמן',    color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { field: 'professional',    label: '💼 מקצועי',       color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { field: 'good_communication', label: '💬 תקשורת טובה', color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe' },
  { field: 'fair_pricing',    label: '💰 מחיר הוגן',    color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { field: 'would_hire_again',label: '🔁 ממליץ',        color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CompletionTimeline({ tasks = [], reviews = [] }) {
  if (tasks.length === 0) return null;

  // Build a map of task_id → review
  const reviewByTask = {};
  reviews.forEach(r => {
    if (r.task_id && !reviewByTask[r.task_id]) reviewByTask[r.task_id] = r;
  });

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>
        היסטוריית ביצוע
      </div>

      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', right: 11, top: 8, bottom: 8,
          width: 2, background: 'linear-gradient(to bottom, #bfdbfe, #e0e7ff)',
          borderRadius: 99,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tasks.map((task, i) => {
            const review = reviewByTask[task.id];
            const chips = review ? CHIPS.filter(c => review[c.field] === true) : [];
            const isLast = i === tasks.length - 1;

            return (
              <div key={task.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* Timeline dot */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                  zIndex: 1,
                }}>
                  <CheckCircle size={13} color="white" strokeWidth={2.5} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f1e40', lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1a6fd4', flexShrink: 0 }}>
                      ₪{task.price}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: chips.length > 0 ? 7 : 0, flexWrap: 'wrap' }}>
                    {task.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#94a3b8' }}>
                        <MapPin size={9} strokeWidth={1.8} /> {task.city}
                      </span>
                    )}
                    {task.category && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{getCategoryLabel(task.category)}</span>
                    )}
                    {(task.completed_at || task.created_date) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#94a3b8', marginRight: 'auto' }}>
                        <Calendar size={9} strokeWidth={1.8} />
                        {formatDate(task.completed_at || task.created_date)}
                      </span>
                    )}
                  </div>

                  {/* Review chips */}
                  {chips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {chips.map(c => (
                        <span key={c.field} style={{
                          fontSize: 10, fontWeight: 700,
                          color: c.color, background: c.bg, border: `1px solid ${c.border}`,
                          borderRadius: 99, padding: '2px 8px',
                        }}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Review comment */}
                  {review?.comment && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#64748b', fontStyle: 'italic', lineHeight: 1.5, background: '#f8faff', borderRadius: 8, padding: '6px 10px', borderRight: '3px solid #bfdbfe' }}>
                      "{review.comment}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}