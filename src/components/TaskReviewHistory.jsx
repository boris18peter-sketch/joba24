import { useNavigate } from 'react-router-dom';
import { Star, ChevronLeft, Briefcase, User, MessageSquare } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
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

function RoleBadge({ userId, task }) {
  const isWorker = task.worker_id === userId;
  const isClient = task.client_id === userId;
  if (!isWorker && !isClient) return null;
  const cfg = isWorker
    ? { label: 'מבצע', icon: Briefcase, color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe' }
    : { label: 'מפרסם', icon: User, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  const Icon = cfg.icon;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 99, padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={10} strokeWidth={2.2} /> {cfg.label}
    </span>
  );
}

function Stars({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  );
}

/**
 * TaskReviewHistory — clean, card-based history of completed tasks and reviews.
 * Each task is a clickable card that opens the task detail. Reviews are shown
 * inline (Trustpilot-style) with a clear role badge for the profile owner.
 */
export default function TaskReviewHistory({ tasks = [], reviews = [], userId }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const reviewsByTaskId = {};
  const unmatchedReviews = [];
  reviews.forEach(r => {
    if (r.task_id && tasks.some(t => t.id === r.task_id)) {
      reviewsByTaskId[r.task_id] = r;
    } else {
      unmatchedReviews.push(r);
    }
  });

  const sortedTasks = [...tasks].sort((a, b) =>
    new Date(b.completed_at || b.updated_date || b.created_date) - new Date(a.completed_at || a.updated_date || a.created_date)
  );

  const allItems = [
    ...sortedTasks.map(t => ({ type: 'task', task: t, review: reviewsByTaskId[t.id] })),
    ...unmatchedReviews.map(r => ({ type: 'review', review: r })),
  ];

  if (allItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>אין היסטוריה עדיין</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>משימות וביקורות שהושלמו יופיעו כאן</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {allItems.map((item, idx) => {
        if (item.type === 'task') {
          const hasReview = !!item.review;
          return (
            <div
              key={`t-${item.task.id}`}
              onClick={() => navigate(`/task/${item.task.id}`)}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-1)',
                borderRadius: 16,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
            >
              {/* Header: role badge + date + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <RoleBadge userId={userId} task={item.task} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(item.task.completed_at || item.task.updated_date)}</span>
                  <ChevronLeft size={14} color="var(--text-3)" />
                </div>
              </div>

              {/* Title */}
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.35 }}>
                {item.task.title}
              </div>

              {/* Category + price */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                {item.task.category && (
                  <span style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 8, padding: '2px 8px', fontWeight: 600 }}>
                    {getCategoryLabel(item.task.category, t)}
                  </span>
                )}
                {item.task.price > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>₪{item.task.price}</span>
                )}
              </div>

              {/* Inline review */}
              {hasReview && (
                <div style={{
                  marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-1)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Stars rating={item.review.rating} size={13} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)' }}>
                      {item.review.role === 'worker' ? 'ביקורת מלקוח' : 'ביקורת ממבצע'}
                    </span>
                  </div>
                  {item.review.comment && (
                    <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                      "{item.review.comment}"
                    </p>
                  )}
                  <ReviewChips review={item.review} />
                </div>
              )}
            </div>
          );
        }

        // Standalone review (no matching task in the list)
        return (
          <div
            key={`r-${item.review.id}-${idx}`}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-1)',
              borderRadius: 16,
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Stars rating={item.review.rating} size={13} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={10} /> {item.review.role === 'worker' ? 'ביקורת מלקוח' : 'ביקורת ממבצע'} · {formatDate(item.review.created_date)}
              </span>
            </div>
            {item.review.comment && (
              <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                "{item.review.comment}"
              </p>
            )}
            <ReviewChips review={item.review} />
          </div>
        );
      })}
    </div>
  );
}