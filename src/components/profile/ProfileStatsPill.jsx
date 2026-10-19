import { Star } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// Single unified stats pill — one glass card with 3 columns
// (rating | tasks posted | tasks completed). Each column is exactly two rows
// (value, label), so the three are symmetrical and their numbers and labels sit
// at the same height.
// Rendered on the blue hero of Profile / PublicProfile, so it uses a
// translucent frosted style that blends with the gradient background.
export default function ProfileStatsPill({ rating, reviewCount, postedCount, completedCount }) {
  const { t } = useLanguage();
  const r = Number(rating) || 0;
  const hasRating = r > 0;
  const posted = Number(postedCount) || 0;
  const completed = Number(completedCount) || 0;

  const dividerStyle = { width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.25)' };
  const colStyle = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '6px 6px', textAlign: 'center' };
  const valueStyle = { fontSize: 26, fontWeight: 900, color: 'var(--brand-hero-text, white)', lineHeight: 1 };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--brand-hero-text, rgba(255,255,255,0.8))' };

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
        {/* The review count used to sit here as a third row, which made this
            column taller than the other two and pushed the whole row out of
            line. The data itself is untouched — only the display is gone. */}
        <span style={labelStyle}>{t('pr_rating')}</span>
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