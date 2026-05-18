/**
 * ScoringBar — מדד אמינות ויזואלי
 * Props:
 *   score: number (0 to 1, where 1 = 100%)
 */
export default function ScoringBar({ score }) {
  const pct = Math.round((score ?? 1) * 100);

  const color = pct >= 90
    ? { bar: '#22c55e', text: '#15803d', glow: 'rgba(34,197,94,0.3)', label: 'מצוין' }
    : pct >= 80
    ? { bar: '#f59e0b', text: '#b45309', glow: 'rgba(245,158,11,0.25)', label: 'טוב' }
    : { bar: '#ef4444', text: '#dc2626', glow: 'rgba(239,68,68,0.25)', label: 'נמוך' };

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #dce8f5', padding: '14px 16px', marginTop: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#1a6fd4', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          מדד אמינות
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: color.text }}>{pct}%</span>
          <span style={{ fontSize: 11, fontWeight: 700, background: color.bar + '20', color: color.text, padding: '2px 8px', borderRadius: 20 }}>
            {color.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color.bar}cc, ${color.bar})`,
          borderRadius: 99,
          boxShadow: `0 0 8px ${color.glow}`,
          transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      </div>

      {/* Warning for low score */}
      {pct < 80 && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: '7px 10px' }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>
            משתמש זה נטה לבטל ברגע האחרון
          </span>
        </div>
      )}
    </div>
  );
}