import PreviewCard from '@/components/onboarding/PreviewCard';

/**
 * The one slide layout shared by all six explainer screens.
 *
 * A screen holds exactly four things and nothing else: the headline, one line of
 * explanation, the illustration, and the continue button (which lives in the
 * screen's footer). The header band has a fixed height, so the headline starts
 * at the same Y on every screen and the illustration begins at the same Y too —
 * the flow reads as one design rather than six screens built separately.
 *
 * The illustration then takes EVERY remaining pixel of height, which is what
 * keeps it large and clear and leaves no empty gap under the copy.
 */
export default function SlideShell({ slide, children }) {
  return (
    <div className="j-slide" dir="rtl">
      <div className="j-slide-head">
        <h2 className="j-slide-title">{slide.title}</h2>
        <p className="j-slide-body">{slide.body}</p>
      </div>

      <div className="j-slide-art">
        <PreviewCard>{children}</PreviewCard>
      </div>
    </div>
  );
}