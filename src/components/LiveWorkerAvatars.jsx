import { User } from 'lucide-react';

/**
 * LiveWorkerAvatars — the overlapping avatar stack in the publish form's header.
 *
 * Its one job is to make the marketplace feel INHABITED at the moment a
 * publisher is deciding whether to post. An empty form asks "will anyone even
 * see this?"; a stack of faces answers that before the question is finished.
 *
 * ── WHY THESE ARE DRAWN, NOT FETCHED ────────────────────────────────────────
 * Real profile photos would mean either shipping strangers' faces as marketing
 * or pulling random users out of the database to decorate a form — neither is
 * something a publisher should see. So the circles are drawn from the app's own
 * palette with a person glyph: unmistakably an avatar stack, unmistakably not a
 * claim about a specific person. The count is not printed either, because the
 * honest number already sits one row below in the worker-availability bar, and
 * two different numbers on one screen is worse than one.
 *
 * Deliberately small and quiet: it is reassurance in the header, not a feature.
 * The overlap, the white ring and the trailing "+" are the whole vocabulary.
 */
const TINTS = [
  ['#1a6fd4', '#0a52b0'],
  ['#f59e0b', '#d97706'],
  ['#10b981', '#059669'],
  ['#8b5cf6', '#6d28d9'],
];

const SIZE = 28;
const OVERLAP = -9;

export default function LiveWorkerAvatars() {
  return (
    <div
      dir="ltr"
      aria-hidden="true"
      style={{ display: 'flex', alignItems: 'center', padding: '0 16px 10px' }}
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
            border: '2px solid rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            // Later circles sit ON TOP of earlier ones, so each tucks under the
            // right edge of the one before it — the standard avatar stack.
            zIndex: i + 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          }}
        >
          <User size={14} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
        </div>
      ))}

      {/* The trailing "+" — the stack continues past the edge of the screen.
          That is what turns four circles into "many people". */}
      <div
        style={{
          width: SIZE, height: SIZE, borderRadius: '50%',
          marginInlineStart: OVERLAP,
          background: 'rgba(255,255,255,0.18)',
          border: '2px solid rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--brand-hero-text, #ffffff)',
          fontSize: 12, fontWeight: 900, lineHeight: 1,
          zIndex: 0,
        }}
      >
        +
      </div>
    </div>
  );
}