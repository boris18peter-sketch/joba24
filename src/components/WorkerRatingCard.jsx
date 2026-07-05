/**
 * WorkerRatingCard — Prominent rating display for worker profile
 * Shows average rating, star visualization, rating distribution, and trust indicators
 */
import { Star, ShieldCheck, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

function RatingStars({ rating, size = 18 }) {
  const numRating = parseFloat(rating) || 0;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = numRating >= i;
        const half = !filled && numRating >= i - 0.5;
        return (
          <Star
            key={i}
            size={size}
            style={{
              color: filled || half ? '#fbbf24' : '#e2e8f0',
              fill: filled ? '#fbbf24' : 'transparent',
            }}
            strokeWidth={2}
          />
        );
      })}
    </div>
  );
}

function RatingBar({ stars, count, total }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', width: 28, flexShrink: 0 }}>{stars}★</span>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'linear-gradient(90deg,#fbbf24,#f59e0b)', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', width: 20, textAlign: 'left', flexShrink: 0 }}>{count}</span>
    </div>
  );
}

export default function WorkerRatingCard({ avgRating, reviewCount = 0, reviews = [], completedCount = 0, isVerified = false, on_time_rate = null }) {
  const hasRating = avgRating && avgRating !== '—' && reviewCount > 0;
  const numRating = hasRating ? parseFloat(avgRating) : 0;

  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.round(r.rating) === stars).length,
  }));

  // Calculate trust metrics from reviews
  const arrivedOnTime = reviews.filter(r => r.arrived_on_time).length;
  const professional = reviews.filter(r => r.professional).length;
  const goodComm = reviews.filter(r => r.good_communication).length;
  const wouldHire = reviews.filter(r => r.would_hire_again).length;

  const onTimePct = reviewCount > 0 ? Math.round((arrivedOnTime / reviewCount) * 100) : null;
  const professionalPct = reviewCount > 0 ? Math.round((professional / reviewCount) * 100) : null;
  const wouldHirePct = reviewCount > 0 ? Math.round((wouldHire / reviewCount) * 100) : null;

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: 22,
      border: '1px solid var(--border-1)',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(15,40,107,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px',
        background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
        borderBottom: '1px solid #fde68a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#fbbf24,#d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Star size={17} color="white" fill="white" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#92400e', letterSpacing: -0.2 }}>
              דירוג לקוחות
            </div>
            <div style={{ fontSize: 11, color: '#b45309', marginTop: 1, fontWeight: 600 }}>
              {reviewCount > 0 ? `${reviewCount} ביקורות מלקוחות` : 'אין עדיין ביקורות'}
            </div>
          </div>
        </div>

        {/* Big rating display */}
        {hasRating ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: '#92400e', lineHeight: 1, letterSpacing: -1 }}>
                {numRating.toFixed(1)}
              </div>
              <div style={{ marginTop: 4 }}>
                <RatingStars rating={numRating} size={16} />
              </div>
            </div>
            {/* Distribution */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {distribution.map(d => (
                <RatingBar key={d.stars} stars={d.stars} count={d.count} total={reviewCount} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309' }}>
              {completedCount > 0 ? 'ביצע משימות — מחכה לביקורת ראשונה' : 'טרם בוצעו משימות'}
            </div>
          </div>
        )}
      </div>

      {/* Trust indicators */}
      {hasRating && (
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {onTimePct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Clock size={15} color="#059669" strokeWidth={2.2} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{onTimePct}%</div>
                <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 600, marginTop: 1 }}>הגיע בזמן</div>
              </div>
            </div>
          )}
          {professionalPct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <CheckCircle2 size={15} color="#7c3aed" strokeWidth={2.2} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>{professionalPct}%</div>
                <div style={{ fontSize: 9, color: '#6d28d9', fontWeight: 600, marginTop: 1 }}>מקצועיות</div>
              </div>
            </div>
          )}
          {wouldHirePct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <TrendingUp size={15} color="#1a6fd4" strokeWidth={2.2} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#1a6fd4', lineHeight: 1 }}>{wouldHirePct}%</div>
                <div style={{ fontSize: 9, color: '#1e40af', fontWeight: 600, marginTop: 1 }}>היו ממליצו</div>
              </div>
            </div>
          )}
          {isVerified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <ShieldCheck size={15} color="#059669" strokeWidth={2.2} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#059669', lineHeight: 1 }}>מאומת</div>
                <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 600, marginTop: 1 }}>זהות מאומתת</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verified-only badge when no ratings but verified */}
      {!hasRating && isVerified && (
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <ShieldCheck size={20} color="#059669" strokeWidth={2} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>זהות מאומתת ✓</div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 1 }}>העובד עבר אימות זהות במערכת</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}