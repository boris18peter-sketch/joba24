import { Eye } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The single frame every explainer illustration sits in.
 *
 * One frame for all six slides is what makes them read as one design instead of
 * six screens built separately. It carries no chrome of its own, so the
 * illustration inside gets the whole frame and shows at its largest.
 *
 * ── IT MUST READ AS A PICTURE, NOT AS THE APP ────────────────────────────────
 * The stage has always been inert — nothing inside it can be typed into,
 * focused or tapped, so an illustration built from the app's real UI can never
 * behave like a live form and a real capture's buttons can never be pressed.
 *
 * That was never the problem. The problem was that it LOOKED live: a visitor
 * saw a screen that looked exactly like the real feed, pressed it, and nothing
 * happened — which reads as a broken app, not as an illustration. The clearest
 * sign a user had that this was an example was that it was broken.
 *
 * Two cues, and only these two, say "this is an example" the way the apps
 * people already use do it: a small labelled badge that names it, and a light
 * wash over the content so the screen sits behind glass. Neither dims the
 * illustration to the point of being unreadable — it still has to TEACH — it
 * simply stops inviting a press.
 */
export default function PreviewCard({ children }) {
  const { t, isRTL } = useLanguage();
  return (
    <div className="j-preview" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="j-preview-badge">
        <Eye size={11} strokeWidth={2.4} />
        {t('onb_demo_badge')}
      </div>
      <div className="j-preview-stage">
        {children}
        <div className="j-preview-veil" aria-hidden="true" />
      </div>
    </div>
  );
}