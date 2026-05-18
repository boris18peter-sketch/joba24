// ג'יטון קרדיט תלת-מימדי — bold, gamification
export default function CreditIcon({ size = 16, style = {} }) {
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
        <ellipse cx="16" cy="29" rx="10" ry="2.5" fill="rgba(0,0,0,0.18)" />

        {/* Coin bottom face (3D depth) */}
        <ellipse cx="16" cy="19" rx="13" ry="4" fill="#b45309" />

        {/* Coin side edge gradient */}
        <rect x="3" y="15" width="26" height="4" fill="url(#edgeGrad)" />

        {/* Main coin face */}
        <ellipse cx="16" cy="15" rx="13" ry="13" fill="url(#coinGrad)" />

        {/* Inner ring */}
        <ellipse cx="16" cy="15" rx="10" ry="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />

        {/* Shine highlight */}
        <ellipse cx="12" cy="10" rx="4" ry="2.5" fill="rgba(255,255,255,0.35)" transform="rotate(-20 12 10)" />

        {/* Letter J */}
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="900"
          fontFamily="'Inter', 'Arial', sans-serif"
          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }}
        >
          J
        </text>

        <defs>
          <radialGradient id="coinGrad" cx="38%" cy="32%" r="70%" fx="38%" fy="32%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}