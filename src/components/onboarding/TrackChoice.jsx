import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import { TRACKS } from '@/lib/onboardingTrack';
import TrackBoxArt from '@/components/onboarding/TrackBoxArt';

/**
 * The first screen: which journey are you here for?
 *
 * Presentation only — choosing stores a local preference and opens that track's
 * explainer. It authenticates nobody and creates nothing.
 *
 * Two equally weighted boxes that share every pixel of the height left over, so
 * the screen is symmetric and there is no dead space at the bottom on a tall
 * phone. Each box's button is pinned to its bottom edge, so both buttons line up
 * at the same height.
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
    <div className="j-welcome" dir="rtl">
      <div className="j-welcome-glow j-welcome-glow-a" />
      <div className="j-welcome-glow j-welcome-glow-b" />

      <div className="j-welcome-inner">
        <div className="j-welcome-top">
          <div className="j-welcome-logo">
            <BrandLogo size={40} radius={0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3 }}>
            <BrandName />
          </span>
        </div>

        <div className="j-welcome-head">
          <h1 className="j-welcome-title">ברוכים הבאים ל־Joba24</h1>
          <p className="j-welcome-sub">מה תרצו לעשות היום?</p>
        </div>

        <div className="j-welcome-boxes">
          {BOXES.map((box, i) => (
            <motion.div
              key={box.track}
              className="j-welcome-box"
              role="button"
              tabIndex={0}
              onClick={() => onChoose(box.track)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoose(box.track); } }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            >
              <TrackBoxArt track={box.track} />

              <div>
                <div className="j-welcome-box-title">{box.title}</div>
                <p className="j-welcome-box-body">{box.body}</p>
              </div>

              <span className="j-welcome-box-cta">
                {box.cta}
                <ArrowLeft size={18} />
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}