import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

// Realistic, common task examples — things people actually post
const EXAMPLES = [
  '🚰 תיקון ברז דולף',
  '🧹 ניקיון דירה',
  '🚚 הובלת מקרר',
  '🎨 צביעת חדר',
  '🪛 הרכבת מדף',
  '🚗 הסעה לשדה',
  '📦 איסוף חבילה',
  '🚪 תיקון דלת',
  '🌿 גיזום עץ',
  '🔧 פתיחת סתימה',
  '🪟 ניקיון חלונות',
  '🧺 הובלת מכבסה',
  '🪑 פירוק ארון',
  '🔐 החלפת מנעול',
  '❄️ מילוי גז מזגן',
];

const CYCLE_MS = 3000; // one bubble rises & fades per cycle — only ONE on screen at any time

const CSS = `
  @keyframes jEmptySlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes jEmptyFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes jEmptyCtaIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes jEmptyPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 14px 34px rgba(26,111,212,0.42); }
    50% { transform: scale(1.025); box-shadow: 0 22px 48px rgba(26,111,212,0.6); }
  }
  @keyframes jEmptyRise {
    0%   { transform: translate(-50%, 60px);  opacity: 0; }
    18%  { opacity: 1; }
    82%  { opacity: 1; }
    100% { transform: translate(-50%, -150px); opacity: 0; }
  }
  .j-empty-headline { animation: jEmptySlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both; }
  .j-empty-desc { animation: jEmptyFadeIn 0.4s ease 0.1s both; }
  .j-empty-cta-wrap { animation: jEmptyCtaIn 0.4s cubic-bezier(0.34,1.3,0.64,1) 0.2s both; }
  .j-empty-cta { animation: jEmptyPulse 7s ease-in-out 1.2s infinite; }
  .j-empty-bubbles { animation: jEmptyFadeIn 0.4s ease 0.3s both; }
  .j-empty-trust { animation: jEmptyFadeIn 0.4s ease 0.4s both; }
  .j-empty-stage {
    position: relative;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
  }
  .j-empty-chip {
    display: inline-flex; align-items: center;
    background: rgba(255,255,255,0.85);
    border: 1px solid rgba(226,234,245,0.8);
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 13px; font-weight: 700; color: #334155;
    white-space: nowrap;
    box-shadow: 0 2px 10px rgba(15,40,107,0.08);
    position: absolute;
    bottom: 0;
    left: 50%;
    animation: jEmptyRise ${CYCLE_MS}ms linear both;
  }
`;

export default function EmptyMyTasksState() {
  const { t } = useLanguage();

  // Shuffle once, then cycle through — only ONE bubble is rendered at a time,
  // so overlap between bubbles is structurally impossible.
  const order = useMemo(() => {
    const a = [...EXAMPLES];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % order.length), CYCLE_MS);
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

      {/* Spacer — pushes the examples section down, away from the button */}
      <div style={{ height: 30 }} />

      {/* Single rising bubble — only one exists at a time, so no overlap is possible */}
      <div className="j-empty-bubbles" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8', background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 999, padding: '4px 11px' }}>
            💡 דוגמאות למשימות
          </span>
        </div>

        <div className="j-empty-stage" style={{ height: 170 }}>
          <span key={idx} className="j-empty-chip">{order[idx]}</span>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: 14 }} />

      {/* Trust message */}
      <p className="j-empty-trust" style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textAlign: 'center', margin: 0, padding: '0 24px' }}>
        💪 אנשים מפרסמים משימות — ותמיד מגיע מישהו לעזור.
      </p>
    </div>
  );
}