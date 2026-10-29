import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import { TRACKS } from '@/lib/onboardingTrack';
import { useLanguage } from '@/lib/LanguageContext';
import OnboardingFooter from '@/components/onboarding/OnboardingFooter';
import LoginPromptModal from '@/components/LoginPromptModal';

/**
 * The first screen: which journey are you here for?
 *
 * Presentation only — choosing stores a local preference and opens that track's
 * explainer. It authenticates nobody and creates nothing.
 *
 * It uses the SAME shell as Join (`j-hero`): the brand lockup at the top, the
 * headline block in the middle, the actions under it and the shared footer at
 * the bottom. Only the middle differs — here it is two equally weighted boxes.
 *
 * The WHOLE box is the tap target, not just the button: on a phone that is a
 * far easier target than a 52px bar, and the button inside it is the visual
 * promise of what the tap does. The two buttons are deliberately different —
 * the first carries the brand colour, the second stays clean — so the screen
 * reads as one clear choice followed by its alternative instead of two
 * identical blocks.
 *
 * The copy is held as translation keys (see @/lib/i18n-onboarding) and the
 * direction follows the chosen language, so the screen reads correctly in all
 * nine languages rather than always right-to-left.
 */
const BOXES = [
  {
    track: TRACKS.PUBLISH,
    titleKey: 'onb_box_publish_title',
    bodyKey: 'onb_box_publish_body',
    ctaKey: 'onb_box_publish_cta',
    plain: false,
  },
  {
    track: TRACKS.WORKER,
    titleKey: 'onb_box_worker_title',
    bodyKey: 'onb_box_worker_body',
    ctaKey: 'onb_box_worker_cta',
    plain: true,
  },
];

export default function TrackChoice({ onChoose }) {
  const { t, isRTL } = useLanguage();
  const CtaArrow = isRTL ? ArrowLeft : ArrowRight;
  // A returning visitor — someone who published here before and has now opened
  // the app, or landed on the campaign link again — already HAS an account. They
  // must not be walked through the whole first-run flow a second time, so the way
  // back in is offered right here, in one tap.
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="j-hero" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="j-hero-glow j-hero-glow-a" />
      <div className="j-hero-glow j-hero-glow-b" />

      <div className="j-hero-inner">
        <div className="j-hero-top">
          <div className="j-hero-logo">
            {/* `contain`, never `cover`: the mark is a picture with its own
                margins, so cropping it to fill the square cut the character's
                head off. Shown whole, it reads as a logo instead of a mistake. */}
            <BrandLogo size={88} radius={0} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="j-hero-brand">
            <BrandName />
          </span>
        </div>

        <div className="j-hero-main">
          <h1 className="j-hero-title">{t('onb_choice_title')}</h1>
          <p className="j-hero-body">{t('onb_choice_body')}</p>

          <div className="j-hero-boxes">
            {BOXES.map((box, i) => (
              <motion.div
                key={box.track}
                className="j-hero-box"
                role="button"
                tabIndex={0}
                onClick={() => onChoose(box.track)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoose(box.track); } }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i, duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              >
                <div>
                  <div className="j-hero-box-title">{t(box.titleKey)}</div>
                  <p className="j-hero-box-body">{t(box.bodyKey)}</p>
                </div>

                <span className={`j-hero-box-cta${box.plain ? ' j-hero-box-cta-plain' : ''}`}>
                  {t(box.ctaKey)}
                  <CtaArrow size={18} />
                </span>
              </motion.div>
            ))}
          </div>

          {/* The way back in for someone who already has an account — directly
              under the two boxes, at the same type size as the buttons inside
              them. Sitting down at the page footer made it read as a footnote;
              here it reads as the third thing you can do on this screen. */}
          <button type="button" className="j-hero-login" onClick={() => setShowLogin(true)}>
            {t('onb_login_cta')}
          </button>
        </div>

        <OnboardingFooter />
      </div>

      {showLogin && (
        <LoginPromptModal
          type="publish"
          titleKey="onb_login_cta"
          onLogin={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}