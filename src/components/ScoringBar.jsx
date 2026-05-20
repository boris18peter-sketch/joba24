import { useState, useEffect, useRef } from 'react';

/**
 * ScoringBar — מדד אמינות עם אנימציה דינמית
 * Props:
 *   score: number (0 to 1, where 1 = 100%)
 */
export default function ScoringBar({ score }) {
  const targetPct = Math.round((score ?? 1) * 100);
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);

  // Animate from 0 → target on mount/change
  useEffect(() => {
    setCurrent(0);
    const duration = 800;
    let startTime = null;

    const tick = (now) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(targetPct * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    // Small delay so the element is mounted before animating
    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 60);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [targetPct]);

  // Dynamic color that CHANGES as the bar fills
  const getColor = (pct) => {
    if (pct >= 85) return {
      bar: '#22c55e',
      barFrom: '#4ade80',
      text: '#15803d',
      glow: 'rgba(34,197,94,0.45)',
      label: 'מצוין',
    };
    if (pct >= 50) return {
      bar: '#f59e0b',
      barFrom: '#fcd34d',
      text: '#b45309',
      glow: 'rgba(245,158,11,0.35)',
      label: 'טוב',
    };
    return {
      bar: '#ef4444',
      barFrom: '#f87171',
      text: '#dc2626',
      glow: 'rgba(239,68,68,0.35)',
      label: 'נמוך',
    };
  };

  const color = getColor(current);       // live color (changes during animation)
  const finalColor = getColor(targetPct); // final color (for the label)

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          מדד אמינות
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Counter — synced with bar fill */}
          <span style={{
            fontSize: 18,
            fontWeight: 900,
            color: color.text,
            transition: 'color 0.12s',
            fontVariantNumeric: 'tabular-nums',
            minWidth: 44,
            textAlign: 'right',
          }}>
            {current}%
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            background: finalColor.bar + '22',
            color: finalColor.text,
            padding: '2px 8px',
            borderRadius: 20,
            transition: 'background 0.2s, color 0.2s',
          }}>
            {finalColor.label}
          </span>
        </div>
      </div>

      {/* Progress bar — width driven by JS counter */}
      <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${current}%`,
          background: `linear-gradient(90deg, ${color.barFrom}, ${color.bar})`,
          borderRadius: 99,
          boxShadow: current > 5 ? `0 0 10px ${color.glow}` : 'none',
          transition: 'box-shadow 0.15s',
        }} />
      </div>

      {/* Neon glow burst at 85%+ */}
      {targetPct >= 85 && current >= 85 && (
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#15803d', fontWeight: 700, animation: 'scorePop 0.4s ease' }}>
          ✨ פרופיל אמין מאוד
        </div>
      )}

      {/* Warning for low score */}
      {targetPct < 80 && current >= targetPct && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: '7px 10px' }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
            מדד האמינות שלך נמוך — שפר אותו על ידי עמידה בהתחייבויות
          </span>
        </div>
      )}

      <style>{`
        @keyframes scorePop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}