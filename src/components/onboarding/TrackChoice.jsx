import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, HardHat } from 'lucide-react';
import { BrandLogo, BrandName } from '@/components/BrandIdentity';
import { TRACKS } from '@/lib/onboardingTrack';
import { fetchPublicTasks } from '@/lib/publicTasks';

const CARDS = [
  {
    track: TRACKS.PUBLISH,
    icon: ClipboardList,
    title: 'פרסם משימה',
    body: 'פרסם בחינם וקבל בקשות מאנשים מתאימים.',
    cta: 'אני צריך עזרה',
  },
  {
    track: TRACKS.WORKER,
    icon: HardHat,
    title: 'בצע משימה',
    body: 'מצא משימות באזור שלך והתחל להרוויח.',
    cta: 'אני רוצה להרוויח',
  },
];

// How many open tasks we ask for. The live count is only shown when we know we
// received the whole set — never a partial number presented as the total.
const MAX_FETCH = 50;

/**
 * The first screen: pick a journey.
 *
 * Presentation only — choosing stores a local preference and opens that track's
 * explainer. It authenticates nobody and creates nothing.
 *
 * The tasks shown underneath are REAL open tasks read from the app's public
 * task reader, so the activity the visitor sees is the activity that exists.
 * No number is ever invented, and no count is shown unless it is complete.
 */
export default function TrackChoice({ currentTrack, onChoose }) {
  const [liveTasks, setLiveTasks] = useState([]);
  // The number of open tasks, but only when the whole set was received.
  const [openCount, setOpenCount] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPublicTasks({ mode: 'open', limit: MAX_FETCH })
      .then(tasks => {
        if (!alive) return;
        const list = Array.isArray(tasks) ? tasks : [];
        setLiveTasks(list.slice(0, 3));
        setOpenCount(list.length > 0 && list.length < MAX_FETCH ? list.length : null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div dir="rtl" style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--surface-1)', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'fixed', top: -150, right: -100, width: 330, height: 330, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.20) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, left: -100, width: 330, height: 330, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.16) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', padding: 'max(30px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 20 }}>

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
            צריכים עזרה? רוצים להרוויח?
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
            מפרסמים משימות, מוצאים אנשים מתאימים ומתחילים.
          </p>
        </div>

        {/* Live activity — real open tasks, straight from the app */}
        {liveTasks.length > 0 && (
          <div>
            <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
              {liveTasks.map(task => (
                <div key={task.id} className="j-card" style={{ flexShrink: 0, minWidth: 168, maxWidth: 200, padding: '11px 13px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 7 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.4 }}>
                      ₪{Math.round(task.price || task.base_price || 0)}
                    </span>
                    {task.city && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{task.city}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {openCount !== null && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginTop: 6 }}>
                {openCount} משימות פתוחות עכשיו
              </div>
            )}
          </div>
        )}

        {/* The two journeys */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            const primary = card.track === TRACKS.PUBLISH;
            const isCurrent = currentTrack === card.track;
            return (
              <motion.div
                key={card.track}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                style={{
                  borderRadius: 20,
                  padding: '17px 18px 15px',
                  border: primary ? 'none' : '1.5px solid var(--border-1)',
                  background: primary ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))' : 'var(--surface-2)',
                  boxShadow: primary ? '0 10px 30px rgba(26,111,212,0.28)' : 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: primary ? 'rgba(255,255,255,0.18)' : 'var(--brand-primary-light)' }}>
                    <Icon size={23} color={primary ? '#ffffff' : 'var(--brand-primary)'} strokeWidth={1.9} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.3, color: primary ? '#ffffff' : 'var(--text-1)' }}>
                      {card.title}
                    </div>
                    {isCurrent && (
                      <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 2, color: primary ? 'rgba(255,255,255,0.9)' : 'var(--brand-primary)' }}>
                        המסלול הנוכחי שלכם
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '10px 0 14px', color: primary ? 'rgba(255,255,255,0.92)' : 'var(--text-2)' }}>
                  {card.body}
                </p>

                <button
                  onClick={() => onChoose(card.track)}
                  style={{
                    width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 15.5, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: primary ? '#ffffff' : 'var(--brand-primary)',
                    color: primary ? 'var(--brand-primary)' : '#ffffff',
                    boxShadow: primary ? 'none' : '0 6px 18px rgba(26,111,212,0.28)',
                  }}
                >
                  {card.cta}
                  <ArrowLeft size={17} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}