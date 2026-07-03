import { Star, CheckCircle2 } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';

function ReviewChips({ review }) {
  const chips = [
    review.arrived_on_time && { label: '⏱️ הגיע בזמן', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    review.professional && { label: '💼 מקצועי', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    review.good_communication && { label: '💬 תקשורת', color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe' },
    review.fair_pricing && { label: '💰 מחיר הוגן', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
    review.would_hire_again && { label: '🔁 ממליץ', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  ].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {chips.map(c => (
        <span key={c.label} style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 99, padding: '2px 8px' }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

/**
 * TaskReviewHistory — unified timeline of completed tasks and their reviews.
 * Shows each task with its review (if any) inline, then standalone reviews at the end.
 */
export default function TaskReviewHistory({ tasks = [], reviews = [] }) {
  // Match reviews to tasks by task_id
  const reviewsByTaskId = {};
  const unmatchedReviews = [];
  reviews.forEach(r => {
    if (r.task_id && tasks.some(t => t.id === r.task_id)) {
      reviewsByTaskId[r.task_id] = r;
    } else {
      unmatchedReviews.push(r);
    }
  });

  // Sort tasks by completed_at desc
  const sortedTasks = [...tasks].sort((a, b) =>
    new Date(b.completed_at || b.updated_date || b.created_date) - new Date(a.completed_at || a.updated_date || a.created_date)
  );

  const allItems = [
    ...sortedTasks.map(t => ({ type: 'task', task: t, review: reviewsByTaskId[t.id] })),
    ...unmatchedReviews.map(r => ({ type: 'review', review: r })),
  ];

  if (allItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>אין היסטוריה עדיין</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {allItems.map((item, idx, arr) => {
        const isLast = idx === arr.length - 1;
        return (
          <div key={idx} style={{
            display: 'flex', flexDirection: 'column', gap: 0,
            paddingTop: idx > 0 ? 14 : 0,
            paddingBottom: isLast ? 0 : 14,
            borderTop: idx > 0 ? '1px solid var(--border-1)' : 'none',
          }}>
            {item.type === 'task' ? (
              <>
                {/* Task row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#dcfce7', border: '2px solid #16a34a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 10, color: '#16a34a', fontWeight: 900,
                  }}>✓</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                      {item.task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                      {item.task.category && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-3)', borderRadius: 8, padding: '1px 7px', fontWeight: 600 }}>
                          {getCategoryLabel(item.task.category)}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(item.task.completed_at || item.task.updated_date)}</span>
                      {item.task.price > 0 && (
                        <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>₪{item.task.price}</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Inline review for this task */}
                {item.review && (
                  <div style={{
                    marginTop: 10, marginRight: 34,
                    background: 'var(--surface-3)', borderRadius: 14,
                    padding: '12px 14px', border: '1px solid var(--border-1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} className={s <= item.review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                      <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 'auto' }}>
                        {item.review.role === 'worker' ? 'מלקוח' : 'ממבצע'}
                      </span>
                    </div>
                    {item.review.comment && (
                      <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>
                        "{item.review.comment}"
                      </p>
                    )}
                    <ReviewChips review={item.review} />
                  </div>
                )}
              </>
            ) : (
              /* Standalone review (no matching task) */
              <div style={{
                background: 'var(--surface-3)', borderRadius: 14,
                padding: '12px 14px', border: '1px solid var(--border-1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={12} className={s <= item.review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                  <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 'auto' }}>
                    {item.review.role === 'worker' ? 'מלקוח' : 'ממבצע'} · {formatDate(item.review.created_date)}
                  </span>
                </div>
                {item.review.comment && (
                  <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>
                    "{item.review.comment}"
                  </p>
                )}
                <ReviewChips review={item.review} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}