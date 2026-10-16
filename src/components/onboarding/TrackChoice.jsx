import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, HardHat, Sparkles } from 'lucide-react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import { TRACKS } from '@/lib/onboardingTrack';

const CARDS = [
  {
    track: TRACKS.PUBLISH,
    icon: ClipboardList,
    title: 'אני צריך עזרה',
    tag: 'פרסום משימה',
    body: 'מתארים מה צריך לעשות, קובעים מחיר ומקבלים בקשות מעובדים באזור.',
  },
  {
    track: TRACKS.WORKER,
    icon: HardHat,
    title: 'אני מחפש עבודה',
    tag: 'ביצוע משימות',
    body: 'רואים משימות קרוב אליכם, מגישים בקשה ומתחילים לעבוד.',
  },
];

/**
 * First-run choice between the two journeys. Presentation only — picking a card
 * stores a local preference and shows the explainer screens.
 */
export default function TrackChoice({ currentTrack, onChoose }) {
  return (
    <div dir="rtl" style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--surface-1)', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'fixed', top: -140, right: -90, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.20) 0%, transparent 70%)', filter: 'blur(28px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -140, left: -90, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', padding: 'max(34px, env(safe-area-inset-top)) 20px max(30px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 22 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-1)', flexShrink: 0 }}>
            <BrandLogo size={40} radius={0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.3 }}>
            <BrandName />
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: 27, fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 8, lineHeight: 1.25, letterSpacing: -0.5 }}>
            איך תרצו להתחיל?
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
            בחרו מסלול ונכוון אתכם צעד אחר צעד. אפשר להחליף מסלול בכל רגע.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            const primary = card.track === TRACKS.PUBLISH;
            const isCurrent = currentTrack === card.track;
            return (
              <motion.button
                key={card.track}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                onClick={() => onChoose(card.track)}
                style={{
                  width: '100%',
                  textAlign: 'right',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  borderRadius: 20,
                  padding: '18px 18px 16px',
                  border: primary ? 'none' : '1.5px solid var(--border-1)',
                  background: primary
                    ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))'
                    : 'var(--surface-2)',
                  color: primary ? 'var(--brand-btn-primary-text, #ffffff)' : 'var(--text-1)',
                  boxShadow: primary ? '0 10px 30px rgba(26,111,212,0.28)' : 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: primary ? 'rgba(255,255,255,0.18)' : 'var(--brand-primary-light)' }}>
                    <Icon size={24} color={primary ? '#ffffff' : 'var(--brand-primary)'} strokeWidth={1.9} />
                  </div>
                  <ArrowLeft size={20} color={primary ? 'rgba(255,255,255,0.85)' : 'var(--text-3)'} />
                </div>

                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: -0.3 }}>{card.title}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 3, color: primary ? 'rgba(255,255,255,0.88)' : 'var(--brand-primary)' }}>
                    {card.tag}
                  </div>
                </div>

                <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: primary ? 'rgba(255,255,255,0.92)' : 'var(--text-2)' }}>
                  {card.body}
                </p>

                {isCurrent && (
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: primary ? '#ffffff' : 'var(--brand-primary)' }}>
                    המסלול הנוכחי שלכם
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-3)' }}>
          <Sparkles size={14} color="var(--brand-primary)" />
          אין צורך בהרשמה כדי להתחיל
        </div>
      </div>
    </div>
  );
}