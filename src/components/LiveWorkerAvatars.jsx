import { User } from 'lucide-react';

/**
 * LiveWorkerAvatars — the overlapping avatar stack that sits ON the publish
 * form's title line.
 *
 * Its one job is to make the marketplace feel INHABITED at the moment a
 * publisher is deciding whether to post. An empty form asks "will anyone even
 * see this?"; a stack of faces answers that before the question is finished.
 *
 * ── IT BELONGS ON THE TITLE LINE, NOT UNDER IT ──────────────────────────────
 * It used to be a row of its own below the header, which cost ~38px of height
 * for four 28px circles and pushed the actual form further down the screen.
 * The header then read as two stacked bars instead of one. Here it shares the
 * title's row — the title on the right (RTL), the faces on the left — so the
 * reassurance is exactly where the eye already is and the header stays one bar.
 *
 * ── WHY THESE ARE DRAWN, NOT FETCHED ────────────────────────────────────────
 * Real profile photos would mean either shipping strangers' faces as marketing
 * or pulling random users out of the database to decorate a form — neither is
 * something a publisher should see. So the circles are drawn from the app's own
 * palette with a person glyph: unmistakably an avatar stack, unmistakably not a
 * claim about a specific person. The count is not printed either, because the
 * honest number already sits one row below in the worker-availability bar, and
 * two different numbers on one screen is worse than one.
 */
const TINTS = [
  ['#1a6fd4', '#0a52b0'],
  ['#f59e0b', '#d97706'],
  ['#10b981', '#059669'],
  ['#8b5cf6', '#6d28d9'],
];

// Sized to live beside a 17px title without crowding it: the whole stack is
// ~82px, which is the most four faces can take before the title loses the line.
const SIZE = 22;
const OVERLAP = -7;
const RING = '2px solid rgba(255,255,255,0.85)';

export default function LiveWorkerAvatars() {
  return (
    <div
      dir="ltr"
      aria-hidden="true"
      style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      {TINTS.map(([from, to], i) => (
        <div
          key={from}
          style={{
            width: SIZE, height: SIZE, borderRadius: '50%',
            marginInlineStart: i === 0 ? 0 : OVERLAP,
            background: `linear-gradient(135deg, ${from}, ${to})`,
            // A light ring, not a background-coloured one: the header behind this
            // is a gradient, so no single solid colour would ever match it. The
            // ring is what makes the overlap read as separate faces.
            border: RING,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            // Later circles sit ON TOP of earlier ones, so each tucks under the
            // right edge of the one before it — the standard avatar stack.
            zIndex: i + 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          }}
        >
          <User size={11} color="rgba(255,255,255,0.92)" strokeWidth={2.4} />
        </div>
      ))}

      {/* The trailing "+" — the stack continues past the edge of the line. That
          is what turns four circles into "many people". On top of the last
          circle rather than under it, so the sign itself is always readable. */}
      <div
        style={{
          width: SIZE, height: SIZE, borderRadius: '50%',
          marginInlineStart: OVERLAP,
          background: 'rgba(255,255,255,0.18)',
          border: RING,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--brand-hero-text, #ffffff)',
          fontSize: 11, fontWeight: 900, lineHeight: 1,
          zIndex: TINTS.length + 1,
        }}
      >
        +
      </div>
    </div>
  );
}