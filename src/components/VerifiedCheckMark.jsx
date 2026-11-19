/**
 * VerifiedCheckMark — THE green verification check. One mark, everywhere.
 *
 * ── WHY IT EXISTS ───────────────────────────────────────────────────────────
 * The app used to draw the verified tick in three different ways: a small round
 * badge next to a name, the same shape inside the feed banner, and — inside the
 * verification popup — a completely different icon (a filled circle containing a
 * second circle and a tick). Three drawings of one meaning read as three
 * different statuses, and the popup's mark was the odd one out: heavier, with a
 * ring around the check, and visibly not the badge the user was about to earn.
 *
 * This component is that one mark: a round green disc with a single clean tick.
 * It scales from 12px (inside a name line) to 88px (the celebration at the end of
 * the verification flow) with the same geometry and the same gradient, so the
 * badge promised on the banner is literally the badge shown in the popup.
 *
 * Props:
 *   size    — diameter in px (default 26)
 *   shadow  — a box-shadow string for the large celebratory sizes
 *   title   — accessible tooltip; pass null for a purely decorative mark
 */
export default function VerifiedCheckMark({ size = 26, shadow, title = 'משתמש מאומת' }) {
  return (
    <span
      title={title || undefined}
      aria-label={title || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg,#16a34a,#059669)',
        flexShrink: 0,
        boxShadow: shadow || 'none',
      }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 10 10" fill="none">
        <path
          d="M2 5.5L4 7.5L8 3"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}