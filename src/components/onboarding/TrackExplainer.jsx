import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { FINAL_CTA } from '@/lib/onboardingTrackContent';
import SlideShell from '@/components/onboarding/SlideShell';
import OnboardingSlideVisual from '@/components/onboarding/OnboardingSlideVisual';

/**
 * The three explainer screens for one track.
 *
 * One clear column at every screen size: a heading, a single line of explanation,
 * the illustration BELOW it, the progress indicator, and the continue button. The
 * column is centred and bounded to the continue button's own width, and the
 * illustration takes every pixel of height the copy leaves — so the screens stay
 * symmetric on a wide desktop instead of spreading the copy and the picture to
 * opposite edges.
 *
 * All layout lives in the stylesheet, not in inline styles — an inline
 * `flex-direction` silently beats a media query, which is what previously kept
 * the wide-screen layout from ever applying.
 *
 * Presentation only: it never publishes a task, never completes a worker profile
 * and fires no analytics events. Finishing (or skipping) simply hands the
 * visitor to the EXISTING flow for that track.
 */
export default function TrackExplainer({ track, slides, onFinish, onSwitchTrack }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="j-onb" dir="rtl">
      {/* ── Header: back · progress · skip ── */}
      <div className="j-onb-bar">
        <button
          className="j-onb-icon"
          onClick={() => (index > 0 ? setIndex(index - 1) : onSwitchTrack())}
          aria-label="חזרה"
        >
          <ArrowRight size={18} />
        </button>

        <div className="j-onb-progress">
          {slides.map((_, i) => (
            <div
              key={i}
              className="j-onb-pip"
              style={{ flex: i === index ? 2 : 1, background: i <= index ? 'var(--brand-primary)' : 'var(--border-1)' }}
            />
          ))}
        </div>

        <button className="j-onb-skip" onClick={onFinish}>
          <X size={14} /> דלג
        </button>
      </div>

      {/* ── Slide: heading → one line → the app's own screen ── */}
      <div className="j-onb-stage">
        <AnimatePresence>
          <motion.div
            key={index}
            className="j-onb-body"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
          >
            <SlideShell slide={slide}>
              <OnboardingSlideVisual slide={slide} />
            </SlideShell>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="j-onb-foot">
        <button
          className="j-onb-cta"
          onClick={isLast ? onFinish : () => setIndex(index + 1)}
        >
          {isLast ? FINAL_CTA[track] : (<>הבא <ArrowLeft size={18} /></>)}
        </button>

        <button className="j-onb-switch" onClick={onSwitchTrack}>
          החלפת מסלול
        </button>
      </div>
    </div>
  );
}