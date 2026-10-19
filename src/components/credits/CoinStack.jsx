import CreditIcon from '@/components/CreditIcon';

/**
 * CoinStack — the official Joba24 coin, stacked.
 *
 * The stack is built ONLY from the app's existing official coin (CreditIcon),
 * so the branding is never redrawn or replaced: the same gold J coin is layered,
 * each one peeking a little below the coin above it, the way a real stack looks
 * when seen from slightly above. No generic gold coins, no dollar signs, no
 * crypto symbols.
 *
 * The number of coins is a visual illustration of how big the package is — not
 * the real number of jobas in it, and not a control. It is decoration only, so
 * it is hidden from screen readers and never receives a click.
 */
export default function CoinStack({ coins = 1 }) {
  const n = Math.max(1, Math.min(6, Math.round(coins) || 1));

  // Bigger packages get a slightly bigger coin as well as more of them, so the
  // growth is felt at a glance: one small coin for the entry package, a tall
  // stack of large coins for the biggest one.
  const size = 18 + n;
  const span = size * 1.3;        // CreditIcon's own box (the coin face is ~81% of it)
  const face = span * 0.8125;     // the visible coin diameter
  const step = face * 0.23;       // how far each coin peeks below the one above
  const faceTop = span * 0.0625;  // the coin's top edge inside CreditIcon's box

  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'inline-block',
        width: span,
        height: face + (n - 1) * step,
        flexShrink: 0,
      }}
    >
      {Array.from({ length: n }).map((_, idx) => {
        // idx 0 is the BOTTOM coin, painted first; the top coin is painted last
        // so it always sits in front of the coins beneath it. Only that bottom
        // coin keeps the coin's own ground shadow — between coins it would read
        // as a smudge rather than depth.
        const i = n - 1 - idx;
        return (
          <span key={i} style={{ position: 'absolute', left: 0, top: i * step - faceTop, lineHeight: 0 }}>
            <CreditIcon size={size} shadow={i === n - 1} />
          </span>
        );
      })}
    </span>
  );
}