import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { FINAL_CTA } from '@/lib/onboardingTrackContent';
import OnboardingSlideVisual from '@/components/onboarding/OnboardingSlideVisual';

/**
 * The three explainer screens for one track.
 *
 * One clear column: a heading, a single line of explanation, the real Joba24
 * screen for that step, the progress indicator, and the continue button. The
 * illustration runs edge to edge on a phone so it is as large as the device
 * allows; from 900px up the copy moves beside it and the picture takes the full
 * height instead of sitting in the middle of an empty page.
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
  const Icon = slide.icon;

  return (
    <div dir="rtl" style={{ position: 'fixed', inset: 0, background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <style>{`
        .j-onb-body   { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px; padding: 0; }
        .j-onb-text   { flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
                        width: 100%; max-width: 520px; margin: 0 auto; padding: 0 18px; text-align: center; }
        .j-onb-visual { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 0; }
        .j-onb-title  { font-size: 26px; }
        .j-onb-lede   { font-size: 15px; }

        @media (min-width: 900px) {
          .j-onb-body   { flex-direction: row; align-items: stretch; gap: 44px; padding: 0 44px; }
          .j-onb-text   { flex: 0 0 32%; max-width: 400px; margin: 0; justify-content: center;
                          align-items: flex-start; text-align: right; padding: 0 0 24px; }
          .j-onb-visual { padding: 0 0 24px; }
          .j-onb-title  { font-size: 34px; }
          .j-onb-lede   { font-size: 16.5px; }
          .j-onb-badge  { margin-bottom: 16px; }
        }
      `}</style>

      {/* Ambient brand glow */}
      <div style={{ position: 'fixed', top: -170, right: -110, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.17) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, left: -110, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      {/* ── Header: back · progress · skip ── */}
      <div style={{ position: 'relative', flexShrink: 0, padding: 'max(14px, env(safe-area-inset-top)) 18px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => (index > 0 ? setIndex(index - 1) : onSwitchTrack())}
          aria-label="חזרה"
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border-1)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, minHeight: 'unset', minWidth: 'unset' }}
        >
          <ArrowRight size={18} color="var(--text-2)" />
        </button>

        <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', maxWidth: 520, margin: '0 auto' }}>
          {slides.map((_, i) => (
            <div key={i} style={{ flex: i === index ? 2 : 1, height: 5, borderRadius: 99, background: i <= index ? 'var(--brand-primary)' : 'var(--border-1)', transition: 'all 0.3s' }} />
          ))}
        </div>

        <button
          onClick={onFinish}
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, minHeight: 'unset', minWidth: 'unset' }}
        >
          <X size={14} /> דלג
        </button>
      </div>

      {/* ── Slide: heading → one line → the real screen ── */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            className="j-onb-body"
          >
            <div className="j-onb-text">
              <div className="j-onb-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: 'var(--brand-primary)', background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)', borderRadius: 999, padding: '4px 12px', marginBottom: 12 }}>
                <Icon size={13} strokeWidth={2.3} />
                {slide.badge}
              </div>
              <h2 className="j-onb-title" style={{ fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 9, lineHeight: 1.25, letterSpacing: -0.5 }}>
                {slide.title}
              </h2>
              <p className="j-onb-lede" style={{ color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                {slide.body}
              </p>
            </div>

            <div className="j-onb-visual">
              <OnboardingSlideVisual slide={slide} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div style={{ position: 'relative', flexShrink: 0, padding: '12px 20px max(18px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={isLast ? onFinish : () => setIndex(index + 1)}
          style={{
            width: '100%', maxWidth: 520, margin: '0 auto', height: 54, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))',
            color: 'var(--brand-btn-primary-text, #ffffff)',
            fontSize: 16.5, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(26,111,212,0.30)',
          }}
        >
          {isLast ? FINAL_CTA[track] : <>הבא <ArrowLeft size={18} /></>}
        </button>

        <button
          onClick={onSwitchTrack}
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 'unset' }}
        >
          החלפת מסלול
        </button>
      </div>
    </div>
  );
}