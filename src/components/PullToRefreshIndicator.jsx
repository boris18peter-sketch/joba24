import { Loader2 } from 'lucide-react';

/**
 * Visual indicator for pull-to-refresh.
 * Place at the very top of the page content (before other elements).
 */
export default function PullToRefreshIndicator({ refreshing, pullProgress }) {
  const visible = refreshing || pullProgress > 0.05;
  if (!visible) return null;

  const size = refreshing ? 1 : pullProgress;
  const translateY = refreshing ? 0 : -20 + pullProgress * 20;

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: refreshing ? 48 : `${Math.round(pullProgress * 48)}px`,
        overflow: 'hidden',
        transition: refreshing ? 'height 0.2s ease' : 'none',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        transform: `scale(${size}) translateY(${translateY}px)`,
        transition: refreshing ? 'transform 0.2s ease' : 'none',
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-1)',
        borderRadius: 99,
        padding: '5px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <Loader2
          size={15}
          color="#1a6fd4"
          style={{ animation: refreshing ? 'spin 0.8s linear infinite' : `rotate(${pullProgress * 360}deg)`, transform: refreshing ? undefined : `rotate(${Math.round(pullProgress * 360)}deg)` }}
          className={refreshing ? 'animate-spin' : ''}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a6fd4' }}>
          {refreshing ? 'מרענן...' : 'משוך לרענון'}
        </span>
      </div>
    </div>
  );
}