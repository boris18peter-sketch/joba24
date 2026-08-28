import { Star, MessageCircle, ChevronLeft } from 'lucide-react';
import StarRating from './StarRating';
import { useLanguage } from '@/lib/LanguageContext';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

function relativeDate(date, t) {
  if (!date) return '';
  const raw = String(date);
  const d = new Date(raw.includes('T') && !raw.endsWith('Z') && !raw.includes('+') ? raw + 'Z' : raw);
  if (isToday(d)) return t('chat_today') || 'היום';
  if (isYesterday(d)) return t('chat_yesterday') || 'אתמול';
  const days = differenceInDays(new Date(), d);
  if (days < 30) return format(d, 'dd/MM/yyyy');
  return format(d, 'dd/MM/yyyy');
}

// Reviews preview — reputation header + 2-3 most recent reviews + "view all".
export default function ProfileReviewsPreview({ reviews = [], rating, onViewAll }) {
  const { t } = useLanguage();
  const r = Number(rating) || 0;
  const hasReviews = reviews.length > 0;
  const preview = reviews.slice(0, 3);

  return (
    <div dir="rtl" style={{
      background: 'var(--surface-2)',
      borderRadius: 18,
      border: '1px solid var(--border-1)',
      padding: '16px 16px 14px',
      boxShadow: 'var(--shadow-xs)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <MessageCircle size={14} color="#1a6fd4" />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3 }}>{t('pr_reviews')}</span>
      </div>

      {/* Rating summary line */}
      {hasReviews ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#0f2b6b', lineHeight: 1 }}>{r > 0 ? r.toFixed(1) : '—'}</span>
          <Star size={16} color="#fbbf24" fill="#fbbf24" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>/ 5</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', marginRight: 'auto' }}>
            · {t('pr_reviews_count', { n: reviews.length })}
          </span>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text-3)', fontSize: 13, fontWeight: 600 }}>
          {t('pr_no_reviews_yet')}
        </div>
      )}

      {/* Review previews */}
      {preview.map((rv, i) => {
        const roleLabel = rv.role === 'worker' ? t('pr_after_task') : (rv.role === 'client' ? t('pr_tasks_posted_long') : '');
        return (
          <div key={rv.id || i} style={{
            paddingTop: i === 0 ? 0 : 12,
            paddingBottom: i < preview.length - 1 ? 12 : 0,
            borderBottom: i < preview.length - 1 ? '1px solid var(--border-1)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <StarRating value={rv.rating || 0} size={13} gap={1} />
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{relativeDate(rv.created_date, t)}</span>
            </div>
            {rv.comment && (
              <div className="selectable-text" style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.55, marginBottom: 5 }}>
                {rv.comment.length > 160 ? rv.comment.slice(0, 160) + '…' : rv.comment}
              </div>
            )}
            {roleLabel && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', borderRadius: 6, padding: '2px 8px' }}>
                {roleLabel}
              </span>
            )}
          </div>
        );
      })}

      {/* View all */}
      {hasReviews && reviews.length > preview.length && (
        <button
          onClick={onViewAll}
          style={{
            width: '100%', marginTop: 14, padding: '11px 0', borderRadius: 12,
            background: 'var(--surface-3)', border: '1px solid var(--border-1)',
            color: '#1a6fd4', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {t('pr_view_all_reviews')} <ChevronLeft size={15} />
        </button>
      )}
    </div>
  );
}