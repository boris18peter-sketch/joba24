import { useEffect, useRef, useState } from 'react';
import { MessagesSquare, Sparkles, Users } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * BenefitsBanner — the rotating trust banner at the top of the published-tasks
 * empty state.
 *
 * ── WHAT IT CLAIMS, AND WHAT IT DELIBERATELY DOES NOT ───────────────────────
 * The brief offered two variants for each slide: one with a number and one
 * without. A number may only be shown when the app can actually stand behind it,
 * so the copy is chosen by what exists:
 *
 *   • "5,000 active professionals" — there is no verified count of ACTIVE
 *     professionals anywhere in the product, so the neutral wording is used.
 *   • "offers within 10 minutes on average" — the app stores application and
 *     task timestamps but computes no such average, and an offer is not an
 *     arrival, so this claim is not made.
 *   • The AI budget assistant DOES exist (it prices a task from its description
 *     in the publish form), so that slide keeps its AI wording.
 *
 * Nothing here invents a performance figure. If verified metrics are added
 * later, only the two `ben_s1_*` / `ben_s2_*` strings change — this file never
 * hardcodes a number.
 *
 * ── LAYOUT ──────────────────────────────────────────────────────────────────
 * A FIXED height on the frame, so advancing a slide can never move the rest of
 * the screen: the titles and bodies differ in length, and letting the banner
 * grow with them would shift the categories and the video on every rotation.
 *
 * Rotation pauses while the visitor is touching the banner, so it never changes
 * under a finger, and it does not start at all when the device asks for reduced
 * motion (the dots still switch slides manually).
 */
const SLIDES = [
  { key: 1, Icon: Users },
  { key: 2, Icon: MessagesSquare },
  { key: 3, Icon: Sparkles },
];

const ROTATE_MS = 5500;

export default function BenefitsBanner() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchRef = useRef({ x: 0, y: 0 });

  // Reduced motion is read once and then kept in step with the device setting.
  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (!mq) return;
    const sync = () => setReduced(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync);
      else mq.removeListener(sync);
    };
  }, []);

  // Auto-rotation. Kept out of render state, so it never restarts on a re-render.
  useEffect(() => {
    if (paused || reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, reduced]);

  const onTouchStart = (e) => {
    const p = e.touches[0];
    touchRef.current = { x: p.clientX, y: p.clientY };
    setPaused(true);
  };
  const onTouchEnd = (e) => {
    const p = e.changedTouches[0];
    const dx = p.clientX - touchRef.current.x;
    const dy = p.clientY - touchRef.current.y;
    if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy)) {
      setIndex((i) => (dx < 0 ? (i + 1) % SLIDES.length : (i - 1 + SLIDES.length) % SLIDES.length));
    }
    setPaused(false);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: 'relative',
        height: 92,
        overflow: 'hidden',
        borderRadius: 18,
        border: '1px solid var(--border-2)',
        background: 'var(--brand-primary-light)',
      }}
    >
      {SLIDES.map(({ key, Icon }, i) => {
        const active = i === index;
        return (
          <div
            key={key}
            aria-hidden={!active}
            style={{
              position: 'absolute',
              inset: 0,
              padding: '12px 14px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              opacity: active ? 1 : 0,
              transform: active ? 'translateX(0)' : 'translateX(8px)',
              transition: reduced ? 'none' : 'opacity 0.45s ease, transform 0.45s ease',
              pointerEvents: active ? 'auto' : 'none',
            }}
          >
            <span style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface-2)', border: '1px solid var(--border-1)',
              color: 'var(--brand-primary)',
            }}>
              <Icon size={18} strokeWidth={2} />
            </span>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)',
                lineHeight: 1.28, letterSpacing: -0.2,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {t(`ben_s${key}_title`)}
              </div>
              <div style={{
                marginTop: 3, fontSize: 11.5, fontWeight: 600,
                color: 'var(--text-2)', lineHeight: 1.35,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {t(`ben_s${key}_body`)}
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation dots — the only hint that there is more than one message */}
      <div style={{
        position: 'absolute', insetInline: 0, bottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        {SLIDES.map((s, i) => {
          const on = i === index;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
              aria-current={on ? 'true' : undefined}
              style={{
                width: on ? 14 : 5, height: 5, padding: 0,
                minHeight: 'unset', minWidth: 'unset',
                borderRadius: 99, border: 'none', cursor: 'pointer',
                background: on ? 'var(--brand-primary)' : 'var(--border-2)',
                transition: reduced ? 'none' : 'width 0.25s ease, background 0.25s ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}