import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { TRACKS } from '@/lib/onboardingTrack';

/**
 * The three explainer screens for one track.
 *
 * Presentation only: it never publishes a task, never completes a worker
 * profile and fires no analytics events. Finishing (or skipping) simply hands
 * the visitor to the EXISTING flow for that track.
 */
export default function TrackExplainer({ track, slides, onFinish, onSwitchTrack }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const Icon = slide.icon;

  return (
    <div dir="rtl" style={{ position: 'fixed', inset: 0, background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header: back · progress · skip ── */}
      <div style={{ flexShrink: 0, padding: 'max(14px, env(safe-area-inset-top)) 18px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => (index > 0 ? setIndex(index - 1) : onSwitchTrack())}
          aria-label="חזרה"
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border-1)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, minHeight: 'unset', minWidth: 'unset' }}
        >
          <ArrowRight size={18} color="var(--text-2)" />
        </button>

        <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
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

      {/* ── Slide ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 480, margin: '0 auto', width: '100%', paddingBottom: 12 }}
          >
            <div style={{ position: 'relative', width: 128, height: 128, marginBottom: 26 }}>
              <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.18) 0%, transparent 70%)' }} />
              <div style={{ position: 'relative', width: 128, height: 128, borderRadius: 36, background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 40px rgba(26,111,212,0.30)' }}>
                <Icon size={56} color="#ffffff" strokeWidth={1.6} />
              </div>
              <div style={{ position: 'absolute', top: -6, left: -6, width: 26, height: 26, borderRadius: 10, background: 'var(--brand-accent)', boxShadow: '0 4px 12px rgba(251,191,36,0.45)' }} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6, color: 'var(--brand-primary)', marginBottom: 10 }}>
              {slide.badge}
            </div>
            <h2 style={{ fontSize: 25, fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 12, lineHeight: 1.3, letterSpacing: -0.4 }}>
              {slide.title}
            </h2>
            <p style={{ fontSize: 15.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div style={{ flexShrink: 0, padding: '12px 20px max(18px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={isLast ? onFinish : () => setIndex(index + 1)}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))',
            color: 'var(--brand-btn-primary-text, #ffffff)',
            fontSize: 16.5, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(26,111,212,0.30)',
          }}
        >
          {isLast
            ? (track === TRACKS.PUBLISH ? 'לפרסום המשימה' : 'להמשך ההרשמה')
            : <>הבא <ArrowLeft size={18} /></>}
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