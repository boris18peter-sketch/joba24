/**
 * GoldCheckBadge — the gold "social verified" mark, ONE implementation.
 *
 * It is drawn as the official badge reads: a white disc that lifts it off a dark
 * or gold surface, a gold gradient disc inside it, and the white check on top.
 * That is exactly what the gold CTA banner renders, and it is what the connect
 * sheet must render too — before this file existed the sheet used a rounded
 * SQUARE with a shield glyph, so the same achievement wore two different marks on
 * two screens.
 *
 * `size` is the outer white disc. The inner disc and the check are ratios of it,
 * so the badge is identical at every size instead of a different drawing.
 */
export default function GoldCheckBadge({ size = 42, ring = true, style }) {
  const inner = Math.round(size * 0.667);
  const check = Math.round(size * 0.38);

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: ring ? 'rgba(255,255,255,0.97)' : 'transparent',
        boxShadow: ring ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          width: inner,
          height: inner,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#fbbf24,#d97706)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={check} height={check} viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5.5L4 7.5L8 3"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}