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
            <BrandLogo size={88} radius={0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        </div>

        {/* One line, above the shared footer: the way back in for someone who
            already has an account. Deliberately quiet — it is a shortcut past the
            flow, not a third journey competing with the two boxes above it. */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 8px', alignSelf: 'center',
              color: 'var(--brand-primary)', fontSize: 13.5, fontWeight: 800,
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            {t('onb_login_cta')}
          </button>
          <OnboardingFooter />
        </div>
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