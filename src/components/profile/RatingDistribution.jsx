/**
 * RatingDistribution — 5→1 star breakdown bars for the reviews summary.
 * Pure presentational: it receives the already-computed per-star counts.
 */
export default function RatingDistribution({ counts, total, label }) {
  const max = Math.max(1, ...Object.values(counts));

  return (
    <div>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8 }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[5, 4, 3, 2, 1].map((star) => {
          const n = counts[star] || 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', width: 10, textAlign: 'center' }}>{star}</span>
              <div style={{ flex: 1, height: 7, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{
                  width: `${(n / max) * 100}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: star >= 4 ? 'var(--brand-primary)' : star === 3 ? '#fbbf24' : '#f87171',
                  transition: 'width 0.35s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', width: 34, textAlign: 'start' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}