// ג'יטון קרדיט תלת-מימדי בצבעי לוגו (כחול + צהוב)
export default function CreditIcon({ size = 24, style = {} }) {
  const s = size;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s,
        height: s,
        borderRadius: '50%',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        {/* Drop shadow */}
        <ellipse cx="16" cy="29" rx="10" ry="2.5" fill="rgba(10,82,176,0.25)" />

        {/* Coin bottom face (3D depth) */}
        <ellipse cx="16" cy="19" rx="13" ry="4" fill="#0a52b0" />

        {/* Coin side edge gradient */}
        <rect x="3" y="15" width="26" height="4" fill="url(#edgeGrad)" />

        {/* Main coin face */}
        <ellipse cx="16" cy="15" rx="13" ry="13" fill="url(#coinGrad)" />

        {/* Inner ring highlight */}
        <ellipse cx="16" cy="15" rx="10" ry="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />

        {/* Shine highlight */}
        <ellipse cx="12" cy="10" rx="4" ry="2.5" fill="rgba(255,255,255,0.4)" transform="rotate(-20 12 10)" />

        {/* Letter J in bold */}
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="900"
          fontFamily="'Inter', 'Arial', sans-serif"
          style={{ filter: 'drop-shadow(0 1.5px 2px rgba(10,82,176,0.5))' }}
        >
          J
        </text>

        <defs>
          <radialGradient id="coinGrad" cx="38%" cy="32%" r="70%" fx="38%" fy="32%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="45%" stopColor="#1a6fd4" />
            <stop offset="100%" stopColor="#0a52b0" />
          </radialGradient>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a6fd4" />
            <stop offset="100%" stopColor="#0a3d82" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}