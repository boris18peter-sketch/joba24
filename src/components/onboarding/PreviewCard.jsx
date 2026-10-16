/**
 * The single frame every explainer illustration sits in.
 *
 * One frame for all six slides is what makes them read as one design instead of
 * six screens built separately. It carries no label and no chrome of its own, so
 * the illustration inside gets the whole frame and shows at its largest.
 *
 * The stage is inert: nothing inside it can be typed into, focused or tapped, so
 * an illustration built from the app's real UI can never behave like a live
 * form, and a real capture's buttons can never be pressed.
 */
export default function PreviewCard({ children }) {
  return (
    <div className="j-preview" dir="rtl">
      <div className="j-preview-stage">{children}</div>
    </div>
  );
}