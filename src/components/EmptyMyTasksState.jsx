import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

// Realistic task examples — each prefixed with "צריך" for natural phrasing
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
];

// Timing: each example is on screen for DISPLAY ms, then a GAP ms of empty stage
// before the next one appears. This guarantees only ONE example is visible at any
// moment — no overlap is physically possible.
const DISPLAY = 4200; // ms — bubble rise + hold + fade
const GAP = 1100;     // ms — empty stage between examples (≥ 1 second)

const CSS = `
  @keyframes jEmptySlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes jEmptyFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes jEmptyCtaIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes jEmptyPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 14px 34px rgba(26,111,212,0.42); }
    50% { transform: scale(1.025); box-shadow: 0 22px 48px rgba(26,111,212,0.6); }
  }
  @keyframes jEmptyRise {
    0%   { opacity: 0; transform: translateY(18px); }
    14%  { opacity: 1; transform: translateY(0); }
    78%  { opacity: 1; transform: translateY(-6px); }
    100% { opacity: 0; transform: translateY(-22px); }
  }
  .j-empty-headline { animation: jEmptySlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
  .j-empty-desc { animation: jEmptyFadeIn 0.4s ease 0.1s both; }
  .j-empty-cta-wrap { animation: jEmptyCtaIn 0.4s cubic-bezier(0.34,1.3,0.64,1) 0.2s both; }
  .j-empty-cta { animation: jEmptyPulse 7s ease-in-out 1.2s infinite; }
  .j-empty-bubbles { animation: jEmptyFadeIn 0.4s ease 0.3s both; }
  .j-empty-trust { animation: jEmptyFadeIn 0.4s ease 0.4s both; }
  .j-empty-stage {
    position: relative;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .j-empty-chip {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.96);
    border: 1px solid rgba(226,234,245,0.9);
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 15px; font-weight: 700; color: #1e3a5f;
    white-space: nowrap;
    box-shadow: 0 6px 18px rgba(15,40,107,0.10);
    animation: jEmptyRise ${DISPLAY}ms cubic-bezier(0.16,1,0.3,1) both;
  }
  .j-empty-chip-dot {
    width: 7px; height: 7px; border-radius: 999px;
    background: #1a6fd4; flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(26,111,212,0.12);
  }
`;

export default function EmptyMyTasksState() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);

  // Stable shuffled order per mount — feels organic but deterministic
  const order = useMemo(() => {
    const a = [...EXAMPLES];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  // Advance to next example only after display + gap → exactly one on screen
  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % order.length);
    }, DISPLAY + GAP);
    return () => clearInterval(id);
  }, [order.length]);

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

      {/* Single rotating example — only one on screen at a time */}
      <div className="j-empty-bubbles" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8', background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 999, padding: '4px 11px' }}>
            💡 דוגמאות למשימות
          </span>
        </div>

        <div className="j-empty-stage">
          {/* key forces the rise animation to restart per example */}
          <span key={index} className="j-empty-chip">
            <span className="j-empty-chip-dot" />
            {order[index]}
          </span>
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