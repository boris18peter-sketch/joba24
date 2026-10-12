import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import TrustCard from '@/components/TrustCard';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ReputationSummary — the whole reputation story in one quiet block.
 *
 * Rating + review count on the first line (taps through to the full reviews
 * view), reliability on the second (taps through to the existing breakdown
 * popup). The rating distribution, review list and trust breakdown all live
 * behind those two destinations, so the main page carries none of the noise.
 */
export default function ReputationSummary({ me, reviews, tasks, rating, reviewCount, onOpenReviews }) {
  const { t, isRTL } = useLanguage();
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const r = Number(rating) || 0;
  const count = Number(reviewCount) || 0;
  const filled = Math.round(r);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      margin: '16px 16px 0',
      borderRadius: 18,
      background: 'rgba(26,111,212,0.05)',
      padding: '0 16px',
    }}>
      <div
        onClick={onOpenReviews}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 0', cursor: 'pointer' }}
      >
        <span style={{
          fontSize: 30, fontWeight: 900, color: 'var(--text-1)',
          lineHeight: 1, letterSpacing: -1, minWidth: 44,
        }}>
          {r > 0 ? r.toFixed(1) : '—'}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={13}
                color={i <= filled ? '#fbbf24' : 'var(--border-2)'}
                fill={i <= filled ? '#fbbf24' : 'var(--border-2)'}
              />
            ))}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', marginTop: 4 }}>
            {count > 0 ? t('pr_reviews_count', { n: count }) : t('pr_no_reviews_yet')}
            {count > 0 && <span style={{ color: 'var(--brand-primary)', fontWeight: 800 }}> · {t('pr_view_all_reviews')}</span>}
          </div>
        </div>

        <Chevron size={17} color="var(--text-3)" style={{ flexShrink: 0 }} />
      </div>

      {/* Reliability line — renders its own top hairline, and nothing when the
          user has no trust score yet. */}
      <TrustCard variant="compact" user={me} reviews={reviews} tasks={tasks} />
    </div>
  );
}