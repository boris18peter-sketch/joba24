import { Star } from 'lucide-react';
import StarRating from './StarRating';
import { useLanguage } from '@/lib/LanguageContext';

// Reputation card — the single most important trust signal on the profile.
// Big rating number, 5-star visual, review count — like a review platform.
export default function ProfileReputationCard({ rating, reviewCount }) {
  const { t } = useLanguage();
  const r = Number(rating) || 0;
  const hasRating = r > 0 && reviewCount > 0;

  let statement = t('pr_no_rating');
  if (hasRating) {
    if (r >= 4.5) statement = t('pr_high_rating');
    else if (r >= 3.5) statement = t('pr_good_rating');
  }

  return (
    <div dir="rtl" style={{
      background: 'var(--surface-2)',
      borderRadius: 18,
      border: '1px solid var(--border-1)',
      padding: '18px 18px 16px',
      boxShadow: 'var(--shadow-xs)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Star size={14} color="#d97706" fill="#fbbf24" />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.3 }}>{t('pr_reputation')}</span>
      </div>

      {/* Big rating + stars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: '#0f2b6b', lineHeight: 1, letterSpacing: -1 }}>
            {hasRating ? r.toFixed(1) : '—'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginTop: 2 }}>/ 5</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StarRating value={r} size={22} />
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
            {reviewCount > 0 ? t('pr_reviews_count', { n: reviewCount }) : t('pr_no_reviews_yet')}
          </div>
          {hasRating && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>{statement}</div>
          )}
        </div>
      </div>
    </div>
  );
}