import { Star } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// Single unified stats pill — the old profile layout: one card with 3 columns
// (rating + reviews | tasks posted | tasks completed). Replaces the separate
// reputation + activity cards.
export default function ProfileStatsPill({ rating, reviewCount, postedCount, completedCount }) {
  const { t } = useLanguage();
  const r = Number(rating) || 0;
  const hasRating = r > 0;
  const reviews = Number(reviewCount) || 0;
  const posted = Number(postedCount) || 0;
  const completed = Number(completedCount) || 0;

  const dividerStyle = { width: 1, alignSelf: 'stretch', background: 'var(--border-1)' };
  const colStyle = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '6px 6px', textAlign: 'center' };
  const valueStyle = (color) => ({ fontSize: 26, fontWeight: 900, color, lineHeight: 1 });
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-3)' };

  return (
    <div dir="rtl" style={{
      background: 'var(--surface-2)',
      borderRadius: 18,
      border: '1px solid var(--border-1)',
      padding: '14px 8px',
      boxShadow: 'var(--shadow-xs)',
      display: 'flex', alignItems: 'stretch',
    }}>
      <div style={colStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star size={15} color="#fbbf24" fill="#fbbf24" />
          <span style={valueStyle('#d97706')}>{hasRating ? r.toFixed(1) : '—'}</span>
        </div>
        <span style={labelStyle}>{reviews > 0 ? t('pr_reviews_count', { n: reviews }) : t('pr_no_reviews_yet')}</span>
      </div>
      <div style={dividerStyle} />
      <div style={colStyle}>
        <span style={valueStyle('#1a6fd4')}>{posted}</span>
        <span style={labelStyle}>{t('pr_tasks_posted_long')}</span>
      </div>
      <div style={dividerStyle} />
      <div style={colStyle}>
        <span style={valueStyle('#15803d')}>{completed}</span>
        <span style={labelStyle}>{t('pr_tasks_done_long')}</span>
      </div>
    </div>
  );
}