import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';

// Short examples — compact chips that fit 3-per-row on mobile
const EXAMPLES = [
  { emoji: '🎁', text: 'איסוף חבילה' },
  { emoji: '🛠️', text: 'תיקון דלת' },
  { emoji: '🌿', text: 'גיזום גינה' },
  { emoji: '🚗', text: 'שטיפת רכב' },
  { emoji: '🎂', text: 'איסוף עוגה' },
  { emoji: '🧹', text: 'ניקיון דירה' },
  { emoji: '📺', text: 'תליית טלוויזיה' },
  { emoji: '🚚', text: 'הובלת ספה' },
  { emoji: '👶', text: 'בייביסיטר' },
  { emoji: '🛒', text: 'קניות מהסופר' },
  { emoji: '🚲', text: 'תיקון אופניים' },
  { emoji: '🍕', text: 'איסוף פיצה' },
  { emoji: '💧', text: 'פתיחת סתימה' },
  { emoji: '🪞', text: 'תליית מראה' },
  { emoji: '🍓', text: 'איסוף מגש פירות' },
  { emoji: '🛏️', text: 'הובלת מיטה' },
  { emoji: '📦', text: 'פינוי מחסן' },
  { emoji: '🐾', text: 'הורדת כלב' },
  { emoji: '🔋', text: 'התנעת רכב' },
  { emoji: '🔥', text: 'מנגליסט' },
];

// Special social-proof bubbles (blue accent) — short text
const SPECIALS = [
  { emoji: '👥', text: '+5000 מוכנים לעזור' },
  { emoji: '💰', text: 'אתה בוחר כמה לשלם' },
  { emoji: '⚡', text: 'הכי מהיר ומשתלם' },
  { emoji: '😎', text: 'בלי השוואות מחירים' },
  { emoji: '🚀', text: '5 בקשות ב-10 דקות' },
];

const CSS = `
  @keyframes jEmptySlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes jEmptyFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes jEmptyCtaIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes jEmptyRowUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
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
  .j-empty-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(226,234,245,0.6);
    border-radius: 999px;
    padding: 6px 11px;
    font-size: 11.5px; font-weight: 600; color: #64748b;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(15,40,107,0.04);
  }
  .j-empty-chip-special {
    background: linear-gradient(135deg, rgba(26,111,212,0.12), rgba(10,82,176,0.16));
    border: 1px solid rgba(26,111,212,0.35);
    color: #0a52b0;
    font-weight: 800;
    box-shadow: 0 2px 10px rgba(26,111,212,0.18);
  }
`;

export default function EmptyMyTasksState() {
  const { t } = useLanguage();

  // 3 rows × 3 chips = 9 bubbles. Each row rises from the bottom with a stagger.
  const rows = useMemo(() => {
    const shuffled = [...EXAMPLES].sort(() => Math.random() - 0.5).slice(0, 6);
    return [
      [{ ...SPECIALS[0], special: true }, shuffled[0], shuffled[1]],
      [shuffled[2], { ...SPECIALS[2], special: true }, shuffled[3]],
      [shuffled[4], shuffled[5], { ...SPECIALS[3], special: true }],
    ];
  }, []);

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

      {/* Breathing space between CTA and examples */}
      <div style={{ height: 24 }} />

      {/* Bubbles — 3 rows, each row rises from the bottom with a stagger */}
      <div className="j-empty-bubbles" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8', background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 999, padding: '4px 11px' }}>
            💡 דוגמאות למשימות
          </span>
        </div>

        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          {rows.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: 'flex',
                gap: 7,
                justifyContent: 'center',
                animation: 'jEmptyRowUp 0.55s cubic-bezier(0.16,1,0.3,1) both',
                animationDelay: `${300 + ri * 160}ms`,
              }}
            >
              {row.map((ex, i) => (
                <span
                  key={i}
                  className={ex.special ? 'j-empty-chip j-empty-chip-special' : 'j-empty-chip'}
                >
                  <span style={{ fontSize: 13, opacity: 0.85 }}>{ex.emoji}</span>
                  {ex.text}
                </span>
              ))}
            </div>
          ))}
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