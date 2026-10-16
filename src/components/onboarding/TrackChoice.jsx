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
 * Two large, equally weighted boxes, each showing a real piece of the product so
 * the choice is understood before the copy is read.
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
    <div dir="rtl" style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--surface-1)', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'fixed', top: -150, right: -100, width: 330, height: 330, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.20) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, left: -100, width: 330, height: 330, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.16) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', padding: 'max(30px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 22 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-1)', flexShrink: 0 }}>
            <BrandLogo size={40} radius={0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3 }}>
            <BrandName />
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 8, lineHeight: 1.25, letterSpacing: -0.6 }}>
            ברוכים הבאים ל־Joba24
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
            מה תרצו לעשות היום?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {BOXES.map((box, i) => (
            <motion.div
              key={box.track}
              role="button"
              tabIndex={0}
              onClick={() => onChoose(box.track)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoose(box.track); } }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              style={{
                cursor: 'pointer',
                borderRadius: 22,
                padding: 18,
                border: '1.5px solid var(--border-1)',
                background: 'var(--surface-2)',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <TrackBoxArt track={box.track} />

              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.4 }}>
                  {box.title}
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: '7px 0 0', color: 'var(--text-2)' }}>
                  {box.body}
                </p>
              </div>

              <span
                style={{
                  height: 52,
                  borderRadius: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
                  color: '#ffffff',
                  fontSize: 16.5,
                  fontWeight: 900,
                  boxShadow: '0 8px 22px rgba(26,111,212,0.30)',
                }}
              >
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