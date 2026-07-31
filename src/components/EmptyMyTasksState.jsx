import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus } from 'lucide-react';
import { useRef, useEffect, useMemo, useLayoutEffect, useState } from 'react';

const EXAMPLES = [
  { emoji: '🚗', text: 'צריך טרמפ לאילת' },
  { emoji: '🔧', text: 'עזרה בהחלפת גלגל' },
  { emoji: '🛒', text: 'קניות מהסופר' },
  { emoji: '🐶', text: 'להוציא את הכלב' },
  { emoji: '🧹', text: 'ניקיון הבית' },
  { emoji: '📦', text: 'הובלה קטנה' },
  { emoji: '📸', text: 'צלם לאירוע' },
  { emoji: '👶', text: 'בייביסיטר' },
  { emoji: '💻', text: 'תיקון מחשב' },
  { emoji: '🎨', text: 'עיצוב לוגו' },
  { emoji: '📱', text: 'עזרה בטלפון' },
  { emoji: '🍔', text: 'משלוח אוכל' },
  { emoji: '🏋️', text: 'מאמן אישי' },
  { emoji: '📚', text: 'שיעור פרטי' },
  { emoji: '🚿', text: 'אינסטלטור' },
  { emoji: '⚡', text: 'חשמלאי' },
  { emoji: '🪴', text: 'גנן' },
];

// Row 1 →, Row 2 ←, Row 3 →, different speeds (px per ms)
const ROW_CONFIGS = [
  { direction: 1, speed: 0.045 },
  { direction: -1, speed: 0.065 },
  { direction: 1, speed: 0.055 },
];

const ANIM_CSS = `
@keyframes jEmptySlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes jEmptyFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes jEmptyCtaIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
.j-empty-headline { animation: jEmptySlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
.j-empty-desc { animation: jEmptyFadeIn 0.4s ease 0.1s both; }
.j-empty-cta { animation: jEmptyCtaIn 0.4s cubic-bezier(0.34,1.3,0.64,1) 0.2s both; }
.j-empty-bubbles { animation: jEmptyFadeIn 0.4s ease 0.3s both; }
.j-empty-trust { animation: jEmptyFadeIn 0.4s ease 0.4s both; }
.j-empty-chip {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(226,234,245,0.7);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px; font-weight: 600; color: #64748b;
  white-space: nowrap;
  box-shadow: 0 1px 5px rgba(15,40,107,0.05);
  backdrop-filter: blur(2px);
}
.j-empty-marquee { overflow: hidden; width: 100%; -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.j-empty-track { display: flex; gap: 10px; width: max-content; will-change: transform; }
`;

function MarqueeRow({ examples, direction, speed }) {
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const halfRef = useRef(0);
  const rafRef = useRef(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (trackRef.current) halfRef.current = trackRef.current.scrollWidth / 2;
    };
    measure();
    // Re-measure on resize (fonts/images loading)
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let last = performance.now();
    let paused = document.hidden;
    // Initialise offset so direction +1 starts at -half, direction -1 starts at 0
    const init = () => {
      const half = halfRef.current;
      if (half > 0) offsetRef.current = direction > 0 ? -half : 0;
    };
    init();
    // Retry init once halfWidth is known (after first paint)
    const initTimer = setTimeout(init, 50);

    const step = (now) => {
      const dt = Math.min(now - last, 32);
      last = now;
      if (!paused && trackRef.current && halfRef.current > 0) {
        const half = halfRef.current;
        offsetRef.current += direction * speed * dt;
        // wrap within [-half, 0]
        if (offsetRef.current > 0) offsetRef.current -= half;
        if (offsetRef.current < -half) offsetRef.current += half;
        trackRef.current.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    const onVis = () => {
      paused = document.hidden;
      if (!paused) last = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(initTimer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [direction, speed]);

  const doubled = useMemo(() => [...examples, ...examples], [examples]);

  return (
    <div className="j-empty-marquee">
      <div ref={trackRef} className="j-empty-track" dir="ltr">
        {doubled.map((ex, i) => (
          <span key={i} className="j-empty-chip">
            <span style={{ fontSize: 15, opacity: 0.9 }}>{ex.emoji}</span>
            <span dir="rtl">{ex.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EmptyMyTasksState() {
  const { t } = useLanguage();

  // Shuffle examples once, then split into 3 rows
  const rows = useMemo(() => {
    const shuffled = [...EXAMPLES].sort(() => Math.random() - 0.5);
    const per = Math.ceil(shuffled.length / 3);
    return [shuffled.slice(0, per), shuffled.slice(per, per * 2), shuffled.slice(per * 2)];
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingBottom: 12 }}>
      <style>{ANIM_CSS}</style>

      {/* Headline */}
      <h1 className="j-empty-headline" style={{
        fontWeight: 900, color: '#0f1e40', margin: 0,
        fontSize: 'clamp(26px, 6vw, 32px)', lineHeight: 1.28, letterSpacing: -0.4,
        textAlign: 'center', maxWidth: 340, padding: '0 16px',
      }}>
        צריך עזרה? פרסם משימה וקבל הצעות מאנשים שרוצים לבצע אותה.
      </h1>

      {/* Description */}
      <p className="j-empty-desc" style={{
        fontSize: 15, color: '#64748b', lineHeight: 1.5, fontWeight: 500,
        textAlign: 'center', maxWidth: 320, margin: '12px 0 0', padding: '0 18px',
      }}>
        פרסום משימה לוקח פחות מדקה. אנשים יגישו בקשות ואתה בוחר את מי שמתאים לך.
      </p>

      {/* Primary CTA */}
      <Link to="/create-task" className="j-empty-cta" style={{ textDecoration: 'none', width: '90%', maxWidth: 360, marginTop: 18, display: 'block' }}>
        <button
          onClick={() => { try { navigator.vibrate?.(12); } catch {} }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', height: 60, borderRadius: 18, border: 'none',
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 18, cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(26,111,212,0.42)',
            letterSpacing: 0.2,
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Plus size={22} strokeWidth={2.6} />
          {t('post_task_btn')}
        </button>
      </Link>

      {/* Spacer */}
      <div style={{ height: 24 }} />

      {/* Bubbles section */}
      <div className="j-empty-bubbles" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Tag above bubbles */}
        <div style={{ textAlign: 'center', marginBottom: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#94a3b8', background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 999, padding: '5px 12px' }}>
            💡 דוגמאות למשימות שאנשים מפרסמים
          </span>
        </div>
        {rows.map((row, i) => (
          <MarqueeRow key={i} examples={row} direction={ROW_CONFIGS[i].direction} speed={ROW_CONFIGS[i].speed} />
        ))}
      </div>

      {/* Spacer */}
      <div style={{ height: 24 }} />

      {/* Trust message */}
      <p className="j-empty-trust" style={{ fontSize: 14, color: '#64748b', fontWeight: 600, textAlign: 'center', margin: 0, padding: '0 24px' }}>
        💪 אנשים מפרסמים כל דבר — ותמיד מגיע מישהו לעזור.
      </p>
    </div>
  );
}