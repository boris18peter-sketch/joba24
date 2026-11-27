/**
 * SectionCard — the one container every step of the publish form sits in.
 *
 * ── IT IS A SECTION, NOT A CARD ─────────────────────────────────────────────
 * It used to paint a bordered, shadowed card around every group of fields, so a
 * form with eight groups was eight cards stacked on one screen: the eye had to
 * cross a frame, a shadow and an inner padding before it reached a field, and
 * the form read as a pile of separate forms rather than one flow.
 *
 * It is now a plain, transparent section — no background, no border, no shadow,
 * no padding. The form's own surface and its even 20px rhythm do the grouping,
 * which is what makes the whole thing one continuous, calm screen. Every
 * section keeps its own spacing, so nothing collapses onto its neighbour.
 *
 * The name is kept on purpose: it is the seam the form (and the requirements
 * card) already render through, so this one change reaches all of them and they
 * can never drift apart again.
 */
export default function SectionCard({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}