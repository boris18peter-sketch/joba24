import { Star } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// Single unified stats pill — one glass card with 3 columns
// (rating + reviews | tasks posted | tasks completed).
// Rendered on the blue hero of Profile / PublicProfile, so it uses a
// translucent frosted style that blends with the gradient background.
export default function ProfileStatsPill({ rating, reviewCount, postedCount, completedCount }) {
  const { t } = useLanguage();
  const r = Number(rating) || 0;
  const hasRating = r > 0;
  const reviews = Number(reviewCount) || 0;
  const posted = Number(postedCount) || 0;
  const completed = Number(completedCount) || 0;

  const dividerStyle = { width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.25)' };
  const colStyle = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '6px 6px', textAlign: 'center' };
  const valueStyle = { fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1 };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' };

  return (
    <div dir="rtl" style={{
      background: 'rgba(255,255,255,0.14)',
      borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.25)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      padding: '13px 8px',
      display: 'flex', alignItems: 'stretch',
    }}>
      <div style={colStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Star size={14} color="#fbbf24" fill="#fbbf24" />
          <span style={valueStyle}>{hasRating ? r.toFixed(1) : '—'}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{t('pr_rating')}</span>
        <span style={labelStyle}>{reviews > 0 ? t('pr_reviews_count', { n: reviews }) : t('pr_no_reviews_yet')}</span>
      </div>
      <div style={dividerStyle} />
      <div style={colStyle}>
        <span style={valueStyle}>{posted}</span>
        <span style={labelStyle}>{t('pr_tasks_posted_long')}</span>
      </div>
      <div style={dividerStyle} />
      <div style={colStyle}>
        <span style={valueStyle}>{completed}</span>
        <span style={labelStyle}>{t('pr_tasks_done_long')}</span>
      </div>
    </div>
  );
}