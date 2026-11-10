import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import {
  TRACKS, getOnboardingTrack, setOnboardingTrack, markExplainerDone,
} from '@/lib/onboardingTrack';
import { useLanguage } from '@/lib/LanguageContext';
import { useRegistrationCount } from '@/hooks/useRegistrationCount';
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
    proofKey: 'onb_box_publish_proof',
    // The ONE line that carries a number, and it is the app's own sign-up
    // counter — the same figure the join screen shows — so the two screens can
    // never quote different totals.
    proofCount: true,
    ctaKey: 'onb_box_publish_cta',
    plain: false,
  },
  {
    track: TRACKS.WORKER,
    titleKey: 'onb_box_worker_title',
    bodyKey: 'onb_box_worker_body',
    proofKey: 'onb_box_worker_proof',
    proofCount: false,
    ctaKey: 'onb_box_worker_cta',
    plain: true,
  },
];

export default function TrackChoice({ onChoose }) {
  const { t, isRTL } = useLanguage();
  const CtaArrow = isRTL ? ArrowLeft : ArrowRight;
  const navigate = useNavigate();
  const joinedCount = useRegistrationCount();

  // A returning visitor — someone who published here before and has now opened
  // the app, or landed on the campaign link again — already HAS an account. They
  // must not be walked through the whole first-run flow a second time, so the way
  // back in is offered right here, in one tap.
  const [showLogin, setShowLogin] = useState(false);

  // ── CONTINUE AS A GUEST, FROM THE FIRST SCREEN ───────────────────────────
  // The guest button inside the sign-in sheet only entered guest mode and closed
  // itself, expecting the app shell to route the guest home. That expectation is
  // true INSIDE the app — and false here: /welcome is a standalone route with no
  // app shell around it, so nothing happened at all and the tap read as dead.
  //
  // The press IS the end of the first run for this visitor: the journey and its
  // finished state are recorded (exactly as the worker join step does), so the
  // root gate cannot send the guest back here, and then the feed is opened.
  const continueAsGuest = () => {
    const current = getOnboardingTrack() || TRACKS.PUBLISH;
    setOnboardingTrack(current);
    markExplainerDone(current);
    setShowLogin(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="j-hero" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="j-hero-glow j-hero-glow-a" />
      <div className="j-hero-glow j-hero-glow-b" />

      <div className="j-hero-inner">
        <div className="j-hero-top">
          <div className="j-hero-logo">
            {/* ── THE MARK MUST BE AS WIDE AS THE FRAME, NEVER WIDER ──────────
                A fixed `size={88}` inside a 70px frame painted an 88px mark
                into a 70px box, so the frame cropped its right and bottom edges
                and the logo looked broken and off-centre. "100%" makes the mark
                exactly the frame's own square: nothing overflows, nothing is
                cropped, and it stays centred at every screen size. */}
            <BrandLogo size="100%" radius={0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span className="j-hero-brand">
            <BrandName />
          </span>
        </div>

        {/* ── NO HEADLINE: THE LOGO IS THE INTRODUCTION ─────────────────────
            "Need help? Someone is already on the way" repeated the first card's
            own question and spoke only to the visitor who needs help, on a screen
            that is equally for the one who wants to earn. The two cards say both
            halves well enough on their own, so they now sit directly under the
            lockup with nothing between them. */}
        <div className="j-hero-main j-hero-main-close">
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
                  {/* One quiet benefit line: a small brand-coloured tick and
                      muted ink, no frame. Same row on BOTH cards, so the two
                      choices stay visually equal. */}
                  <div className="j-hero-proof">
                    <CheckCircle size={13} strokeWidth={2.8} />
                    <span>{box.proofCount
                      ? t(box.proofKey, { n: joinedCount.toLocaleString() })
                      : t(box.proofKey)}</span>
                  </div>
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
          onGuest={continueAsGuest}
        />
      )}
    </div>
  );
}