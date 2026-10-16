import PreviewCard from '@/components/onboarding/PreviewCard';

/**
 * The one slide layout shared by all six explainer screens.
 *
 * The header band has a fixed height, so the title, the illustration and the
 * continue button land in the same place on every screen — the flow reads as
 * one design rather than six screens built separately. The illustration then
 * takes EVERY remaining pixel of height, which is what removes the empty gap
 * that used to sit between the copy and the picture.
 */
export default function SlideShell({ slide, children }) {
  const Icon = slide.icon;

  return (
    <div className="j-slide" dir="rtl">
      <div className="j-slide-head">
        <span className="j-slide-badge">
          <Icon size={13} strokeWidth={2.3} />
          {slide.badge}
        </span>
        <h2 className="j-slide-title">{slide.title}</h2>
        <p className="j-slide-body">{slide.body}</p>
      </div>

      <div className="j-slide-art">
        <PreviewCard>{children}</PreviewCard>
      </div>
    </div>
  );
}