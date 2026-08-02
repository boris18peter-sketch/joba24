import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus } from 'lucide-react';
import { useMemo, useState, useEffect, useRef } from 'react';

// Combined task examples — all prefixed with "צריך" for natural phrasing.
// Includes the long-sentence examples + the short emoji-tagged ones.
const EXAMPLES = [
  'צריך מנגליסט לשעתיים',
  'צריך מישהו שישמור על הכלב',
  'צריך שטיפה לרכב עד הבית',
  'צריך להוביל מקרר לתל אביב',
  'צריך ניקוי לספות בבית',
  'צריך עזרה בתליית טלוויזיה חדשה',
  'צריך בייביסיטר להערב',
  'צריך גנן לגיזום וסידור הגינה',
  'צריך אינסטלטור דחוף לפתירת סתימה',
  'צריך צלם לקליפ',
  'צריך עזרה בפירוק ארון בגדים',
  'צריך עזרה להתקין מנורה',
  'צריך תיקון ברז 🚰',
  'צריך ניקיון דירה 🧹',
  'צריך הובלת מקרר 🚚',
  'צריך צביעת חדר 🎨',
  'צריך הרכבת מדף 🪛',
  'צריך הסעה לשדה 🚗',
  'צריך איסוף חבילה 📦',
  'צריך תיקון דלת 🚪',
  'צריך גיזום עץ 🌿',
  'צריך פתירת סתימה 🔧',
  'צריך פירוק ארון 🪑',
  'צריך החלפת מנעול 🔐',
  'צריך מילוי גז ❄️',
  'צריך ניקיון חלון 🪟',
  'צריך הסעת ילד 🚙',
];

// Wheel geometry & timing
const ITEM_H = 52;       // px per example row
const VISIBLE = 3;       // rows visible (center highlighted)
const SPEED = 1600;      // ms between auto-advances (faster rotation)
const PAUSE = 2800;      // ms to pause auto-play after user interacts

const CSS = `
  @keyframes jEmptySlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes jEmptyFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes jEmptyCtaIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes jEmptyPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 14px 34px rgba(26,111,212,0.42); }
    50% { transform: scale(1.025); box-shadow: 0 22px 48px rgba(26,111,212,0.6); }
  }
  .j-empty-headline { animation: jEmptySlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
  .j-empty-desc { animation: jEmptyFadeIn 0.4s ease 0.1s both; }
  .j-empty-cta-wrap { animation: jEmptyCtaIn 0.4s cubic-bezier(0.34,1.3,0.64,1) 0.2s both; }
  .j-empty-cta { animation: jEmptyPulse 7s ease-in-out 1.2s infinite; }
  .j-empty-bubbles { animation: jEmptyFadeIn 0.4s ease 0.3s both; }
  .j-empty-trust { animation: jEmptyFadeIn 0.4s ease 0.4s both; }

  .j-wheel {
    position: relative;
    height: ${ITEM_H * VISIBLE}px;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
  }
  .j-wheel::-webkit-scrollbar { display: none; }
  .j-wheel-item {
    height: ${ITEM_H}px;
    scroll-snap-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 600;
    color: #94a3b8;
    text-align: center;
    padding: 0 24px;
    transition: color 0.2s ease, transform 0.2s ease, font-weight 0.2s ease;
    box-sizing: border-box;
  }
  .j-wheel-item.is-active {
    color: #0f1e40;
    font-weight: 800;
    transform: scale(1.04);
  }
  .j-wheel-band {
    position: absolute;
    left: 50%;
    top: ${ITEM_H}px;
    height: ${ITEM_H}px;
    width: 92%;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(226,234,245,0.9);
    box-shadow: 0 6px 18px rgba(15,40,107,0.10);
    pointer-events: none;
    z-index: 0;
  }
  .j-wheel-track { position: relative; z-index: 1; }
`;

export default function EmptyMyTasksState() {
  const { t } = useLanguage();
  const scrollRef = useRef(null);
  const pausedUntilRef = useRef(0);
  const [active, setActive] = useState(0);

  // Render the list 3× for a seamless infinite loop (start in the middle copy)
  const items = useMemo(() => [...EXAMPLES, ...EXAMPLES, ...EXAMPLES], []);
  const len = EXAMPLES.length;
  const startOffset = len * ITEM_H; // begin at middle copy

  // Initialize scroll position on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = startOffset;
    setActive(Math.round(el.scrollTop / ITEM_H) + 1);
  }, [startOffset]);

  // Auto-play — advances one row per tick, pauses while/after user interacts
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const curRound = Math.round(el.scrollTop / ITEM_H);
      const targetIdx = curRound + 1;
      if (targetIdx >= len * 2) {
        // Seamless loop: jump back one full copy (identical content, invisible)
        el.scrollTop = (targetIdx - len) * ITEM_H;
      } else {
        el.scrollTo({ top: targetIdx * ITEM_H, behavior: 'smooth' });
      }
    }, SPEED);
    return () => clearInterval(id);
  }, [len]);

  // Track active row on scroll for center-highlight styling
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollTop / ITEM_H) + 1);
  };

  // Pause auto-play on manual interaction (touch / wheel)
  const pauseAuto = () => { pausedUntilRef.current = Date.now() + PAUSE; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, paddingBottom: 6 }}>
      <style>{CSS}</style>

      {/* Headline */}
      <h1 className="j-empty-headline" style={{
        fontWeight: 900, color: '#0f1e40', margin: 0,
        fontSize: 'clamp(26px, 6.5vw, 32px)', lineHeight: 1.2, letterSpacing: -0.5,
        textAlign: 'center', padding: '0 16px',
      }}>
        צריך עזרה? פרסם משימה
      </h1>

      {/* Description */}
      <p className="j-empty-desc" style={{
        fontSize: 14, color: '#64748b', lineHeight: 1.45, fontWeight: 500,
        textAlign: 'center', maxWidth: 320, margin: '7px 0 0', padding: '0 18px',
      }}>
        פרסום משימה לוקח פחות מדקה. תוך דקות אנשים יגישו בקשות ואתה בוחר את מי שמתאים.
      </p>

      {/* Primary CTA */}
      <Link to="/create-task" className="j-empty-cta-wrap" style={{ textDecoration: 'none', width: '88%', maxWidth: 360, marginTop: 12, display: 'block' }}>
        <button
          onClick={() => { try { navigator.vibrate?.(15); } catch {} }}
          className="j-empty-cta"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', height: 58, borderRadius: 18, border: 'none',
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 17, cursor: 'pointer',
            boxShadow: '0 14px 34px rgba(26,111,212,0.42)',
            letterSpacing: 0.2,
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => { e.currentTarget.style.animation = 'none'; e.currentTarget.style.transform = 'scale(0.96)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.animation = ''; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.animation = ''; }}
          onTouchStart={(e) => { e.currentTarget.style.animation = 'none'; e.currentTarget.style.transform = 'scale(0.96)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.animation = ''; }}
        >
          <Plus size={22} strokeWidth={2.6} />
          {t('post_task_btn')}
        </button>
      </Link>

      {/* Spacer */}
      <div style={{ height: 30 }} />

      {/* Rotating examples wheel — auto-runs, user can swipe up/down */}
      <div className="j-empty-bubbles" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8', background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 999, padding: '4px 11px' }}>
            💡 דוגמאות למשימות · גלול לראות עוד
          </span>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={pauseAuto}
          onWheel={pauseAuto}
          className="j-wheel"
        >
          <div className="j-wheel-band" />
          <div className="j-wheel-track">
            {items.map((text, i) => (
              <div key={i} className={`j-wheel-item${i === active ? ' is-active' : ''}`}>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: 18 }} />

      {/* Trust message */}
      <p className="j-empty-trust" style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textAlign: 'center', margin: 0, padding: '0 24px' }}>
        💪 אנשים מפרסמים משימות — ותמיד מגיע מישהו לעזור.
      </p>
    </div>
  );
}