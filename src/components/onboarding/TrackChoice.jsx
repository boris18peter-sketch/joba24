import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import { TRACKS } from '@/lib/onboardingTrack';
import OnboardingFooter from '@/components/onboarding/OnboardingFooter';

/**
 * The first screen: which journey are you here for?
 *
 * Presentation only — choosing stores a local preference and opens that track's
 * explainer. It authenticates nobody and creates nothing.
 *
 * It uses the SAME shell as Join (`j-hero`): the brand lockup at the top, the
 * headline block in the middle, the actions under it and the shared footer at
 * the bottom. Only the middle differs — here it is two equally weighted boxes,
 * each with its button pinned to the bottom edge so both line up.
 */
const BOXES = [
  {
    track: TRACKS.PUBLISH,
    title: 'צריכים עזרה?',
    body: 'פרסמו משימה בחינם וקבלו בקשות מאנשים שרוצים לבצע אותה.',
    cta: 'פרסם משימה',
  },
  {
    track: TRACKS.WORKER,
    title: 'רוצים להרוויח?',
    body: 'מצאו משימות באזור שלכם, הגישו בקשה והתחילו להרוויח.',
    cta: 'בצע משימה',
  },
];

export default function TrackChoice({ onChoose }) {
  return (
    <div className="j-hero" dir="rtl">
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
          <h1 className="j-hero-title">ברוכים הבאים ל־Joba24</h1>

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
                  <div className="j-hero-box-title">{box.title}</div>
                  <p className="j-hero-box-body">{box.body}</p>
                </div>

                <span className="j-hero-box-cta">
                  {box.cta}
                  <ArrowLeft size={18} />
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <OnboardingFooter />
      </div>
    </div>
  );
}