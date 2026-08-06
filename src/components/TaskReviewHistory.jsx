import { useNavigate } from 'react-router-dom';
import { Star, ChevronLeft, Briefcase, User, MessageSquare } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/LanguageContext';

const LOCALE_MAP = { he: 'he-IL', ar: 'ar-IL', en: 'en-US', es: 'es-ES', fr: 'fr-FR', ru: 'ru-RU', fil: 'fil-PH', hi: 'hi-IN', zh: 'zh-CN' };

function ReviewChips({ review, t }) {
  const chips = [
    review.arrived_on_time && { label: t('arrived_on_time'), color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    review.professional && { label: t('professional'), color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    review.good_communication && { label: t('good_communication'), color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe' },
    review.fair_pricing && { label: t('fair_pricing'), color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
    review.would_hire_again && { label: t('would_hire_again'), color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
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

function formatDate(dateStr, t, lang) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return t('days_ago', { n: diffDays });
  return date.toLocaleDateString(LOCALE_MAP[lang] || 'he-IL', { day: 'numeric', month: 'short' });
}

function RoleBadge({ userId, task, t }) {
  const isWorker = task.worker_id === userId;
  const isClient = task.client_id === userId;
  if (!isWorker && !isClient) return null;
  const cfg = isWorker
    ? { label: t('role_doer'), icon: Briefcase, color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe' }
    : { label: t('role_poster'), icon: User, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
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
  const { t, lang } = useLanguage();

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
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{t('no_history_yet')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{t('history_will_appear')}</div>
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
                <RoleBadge userId={userId} task={item.task} t={t} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(item.task.completed_at || item.task.updated_date, t, lang)}</span>
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
                      {item.review.role === 'worker' ? t('review_from_client') : t('review_from_worker')}
                    </span>
                  </div>
                  {item.review.comment && (
                    <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                      "{item.review.comment}"
                    </p>
                  )}
                  <ReviewChips review={item.review} t={t} />
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
                <MessageSquare size={10} /> {item.review.role === 'worker' ? t('review_from_client') : t('review_from_worker')} · {formatDate(item.review.created_date, t, lang)}
              </span>
            </div>
            {item.review.comment && (
              <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                "{item.review.comment}"
              </p>
            )}
            <ReviewChips review={item.review} t={t} />
          </div>
        );
      })}
    </div>
  );
}