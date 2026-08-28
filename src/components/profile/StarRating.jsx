import { Star } from 'lucide-react';

// Renders 5 stars with fractional fill for the last star (e.g. 4.8 → 4 full + 1 80%).
export default function StarRating({ value = 0, size = 18, gap = 2 }) {
  const v = Number(value) || 0;
  const full = Math.floor(v);
  const frac = v - full;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const isFull = i < full;
    const isFrac = i === full && frac > 0;
    const fillPct = isFull ? 100 : isFrac ? Math.round(frac * 100) : 0;
    stars.push(
      <div key={i} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        {/* Empty base star */}
        <Star size={size} color="#e2e8f0" fill="#e2e8f0" strokeWidth={0} style={{ position: 'absolute', inset: 0 }} />
        {/* Filled overlay (clipped to fillPct) */}
        <div style={{ position: 'absolute', inset: 0, width: `${fillPct}%`, overflow: 'hidden' }}>
          <Star size={size} color="#fbbf24" fill="#fbbf24" strokeWidth={0} />
        </div>
      </div>
    );
  }
  return <div style={{ display: 'flex', gap, alignItems: 'center' }}>{stars}</div>;
}