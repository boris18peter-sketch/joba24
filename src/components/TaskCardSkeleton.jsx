/**
 * TaskCardSkeleton — premium shimmer skeleton for task cards
 */
export default function TaskCardSkeleton({ count = 4 }) {
  return (
    <>
      <style>{`
        @keyframes skeletonShimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .sk-line {
          border-radius: 8px;
          background: linear-gradient(
            90deg,
            var(--surface-3) 25%,
            var(--surface-4) 50%,
            var(--surface-3) 75%
          );
          background-size: 800px 100%;
          animation: skeletonShimmer 1.6s ease-in-out infinite;
        }
      `}</style>

      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border-1)',
            padding: '14px 14px 12px',
            opacity: 1 - i * 0.12,
            animationDelay: `${i * 80}ms`,
          }}
        >
          {/* Top row: badge + count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="sk-line" style={{ width: 56, height: 18 }} />
            <div className="sk-line" style={{ width: 44, height: 18 }} />
          </div>

          {/* Body: text + thumbnail */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sk-line" style={{ width: '80%', height: 16 }} />
              <div className="sk-line" style={{ width: '55%', height: 13 }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <div className="sk-line" style={{ width: 60, height: 12 }} />
                <div className="sk-line" style={{ width: 44, height: 12 }} />
              </div>
            </div>
            <div className="sk-line" style={{ width: 78, height: 72, borderRadius: 10, flexShrink: 0 }} />
          </div>

          {/* Footer: price + button */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 10, borderTop: '1px solid var(--border-1)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="sk-line" style={{ width: 52, height: 20 }} />
              <div className="sk-line" style={{ width: 38, height: 14 }} />
            </div>
            <div className="sk-line" style={{ width: 88, height: 36, borderRadius: 'var(--r-sm)' }} />
          </div>
        </div>
      ))}
    </>
  );
}