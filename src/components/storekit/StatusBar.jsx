/**
 * Consistent device status bar, drawn inside the scaled app viewport so it
 * scales with the UI. Same rendering on every frame — no inconsistent clocks,
 * no mixed icon styles, no double status bars.
 *
 * iOS frames get the standard 9:41 reading + Dynamic Island.
 * Android frames get the neutral Android reading, no island.
 */
export default function StatusBar({ platform, height }) {
  const isIOS = platform === 'ios';
  const barH = height;
  const fontSize = isIOS ? 17 : 15;
  const iconW = isIOS ? 18 : 15;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: barH,
        zIndex: 60,
        pointerEvents: 'none',
        direction: 'ltr',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isIOS ? '0 34px' : '0 16px',
        paddingTop: isIOS ? 6 : 0,
        boxSizing: 'border-box',
        color: '#0d1e40',
      }}
    >
      <span style={{ fontSize, fontWeight: 700, letterSpacing: -0.2, fontVariantNumeric: 'tabular-nums' }}>
        {isIOS ? '9:41' : '9:41'}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: isIOS ? 6 : 5 }}>
        {/* Signal */}
        <svg width={iconW} height={iconW * 0.72} viewBox="0 0 18 13" fill="none">
          {[0, 1, 2, 3].map(i => (
            <rect
              key={i}
              x={i * 4.6}
              y={13 - (i + 1) * 2.8}
              width={3}
              height={(i + 1) * 2.8}
              rx={1}
              fill="#0d1e40"
            />
          ))}
        </svg>
        {/* Wi-Fi */}
        <svg width={iconW * 0.92} height={iconW * 0.72} viewBox="0 0 16 12" fill="none">
          <path d="M8 10.6a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z" fill="#0d1e40" />
          <path d="M3.4 6.4a6.4 6.4 0 019.2 0" stroke="#0d1e40" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M1.1 3.9a9.8 9.8 0 0113.8 0" stroke="#0d1e40" strokeWidth="1.7" strokeLinecap="round" opacity="0.35" />
        </svg>
        {/* Battery */}
        <svg width={iconW * 1.4} height={iconW * 0.72} viewBox="0 0 25 12" fill="none">
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="3" stroke="#0d1e40" strokeOpacity="0.38" strokeWidth="1.1" />
          <rect x="2.2" y="2.2" width="16" height="7.6" rx="1.9" fill="#0d1e40" />
          <path d="M23.2 4.2v3.6a2 2 0 000-3.6z" fill="#0d1e40" fillOpacity="0.38" />
        </svg>
      </div>

      {isIOS && (
        <div
          style={{
            position: 'absolute',
            top: 11,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 126,
            height: 37,
            borderRadius: 999,
            background: '#0d1e40',
          }}
        />
      )}
    </div>
  );
}