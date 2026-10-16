import { Eye } from 'lucide-react';

/**
 * The single frame every explainer illustration sits in.
 *
 * One frame for all six slides is what makes them read as one design instead of
 * six screens built separately, and the small label is what tells the visitor
 * this is a PREVIEW of the product — not a form they are meant to fill in.
 *
 * The stage is inert: nothing inside it can be typed into, focused or tapped,
 * so an illustration built from the app's real UI can never behave like a live
 * form, and a real capture's buttons can never be pressed.
 */
export default function PreviewCard({ children }) {
  return (
    <div className="j-preview" dir="rtl">
      <div className="j-preview-bar">
        <Eye size={13} strokeWidth={2.3} />
        <span>הצצה לאפליקציה</span>
      </div>
      <div className="j-preview-stage">{children}</div>
    </div>
  );
}