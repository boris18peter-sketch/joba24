import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';

const EXAMPLES = [
  { emoji: '🎈', text: 'לנפח בלונים למסיבה' },
  { emoji: '🌹', text: 'להביא זר פרחים' },
  { emoji: '🚗', text: 'צריך טרמפ לאילת' },
  { emoji: '🔧', text: 'עזרה בהחלפת גלגל' },
  { emoji: '🔥', text: 'מנגליסט לשעתיים' },
  { emoji: '📦', text: 'עזרה בפינוי מחסן' },
  { emoji: '👶', text: 'בייביסיטר להערב' },
  { emoji: '🔋', text: 'הרכב לא מניע' },
  { emoji: '🐕', text: 'מישהו יוריד את הכלב' },
  { emoji: '🪑', text: 'הרכבת שידה מאיקאה' },
  { emoji: '🛒', text: 'קניות מהסופר' },
  { emoji: '🧹', text: 'ניקיון דירה 3 חדרים' },
  { emoji: '📺', text: 'תליית טלוויזיה' },
  { emoji: '🚚', text: 'הובלת ספה קטנה' },
  { emoji: '💻', text: 'עזרה בהתקנת מחשב' },
  { emoji: '📱', text: 'העברת מידע לטלפון' },
  { emoji: '🎂', text: 'איסוף עוגה דחוף' },
  { emoji: '🛠️', text: 'תיקון דלת' },
  { emoji: '🌿', text: 'גיזום גינה' },
  { emoji: '🎁', text: 'איסוף חבילה' },
  { emoji: '🏋️', text: 'מדריך כושר לבית' },
  { emoji: '📸', text: 'לצלם הצעת נישואין' },
  { emoji: '🚗', text: 'לקחת רכב לטסט' },
  { emoji: '🚗', text: 'שטיפת רכב' },
  { emoji: '💡', text: 'להחליף נברשת בתקרה' },
  { emoji: '🚪', text: 'לתקן ציר של דלת' },
  { emoji: '📦', text: 'עזרה בפריקת ארגזים' },
  { emoji: '💧', text: 'לנקות חצר בלחץ מים' },
  { emoji: '🍕', text: 'איסוף פיצה דחוף' },
  { emoji: '🎸', text: 'להעביר שיעור גיטרה' },
  { emoji: '🚲', text: 'תיקון אופניים' },
  { emoji: '🪟', text: 'ניקוי חלונות גבוהים' },
  { emoji: '🧊', text: 'הובלת מקרר' },
  { emoji: '📚', text: 'עזרה בעבודת סמינר' },
  { emoji: '💄', text: 'איפור לאירוע' },
  { emoji: '🎹', text: 'להעביר שיעור פסנתר' },
  { emoji: '🛁', text: 'פתיחת סתימה בכיור' },
  { emoji: '🪞', text: 'תליית מראה כבדה' },
  { emoji: '🍓', text: 'איסוף מגש פירות' },
  { emoji: '🛏️', text: 'הובלת מיטה זוגית' },
  { emoji: '📦', text: 'אריזת דירה למעבר' },
];

// Special social-proof bubbles (blue accent)
const SPECIALS = [
  { emoji: '👥', text: '+5000 אנשים מוכנים לביצוע משימות' },
  { emoji: '💰', text: 'כאן אתה בוחר כמה לשלם' },
  { emoji: '✅', text: 'אלפי אנשים מאומתים במקום 1 בטוח' },
  { emoji: '⚡', text: 'הכי מהיר ומשתלם' },
  { emoji: '😎', text: 'בלי השוואות מחירים וכאבי ראש' },
  { emoji: '🔥', text: 'יש אנשים זמינים באזור שלך' },
  { emoji: '🚀', text: 'תוך 10 דקות מקבלים 5 בקשות' },
];

const CSS = `
  @keyframes jEmptySlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes jEmptyFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes jEmptyCtaIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes jEmptyBubbleUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
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
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(226,234,245,0.6);
    border-radius: 999px;
    padding: 7px 13px;
    font-size: 12.5px; font-weight: 600; color: #64748b;
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

  // Curated flat list — 12 random examples with 3 special blue bubbles interspersed.
  // Each bubble animates up from the bottom with a staggered delay (no horizontal scroll).
  const bubbles = useMemo(() => {
    const shuffled = [...EXAMPLES].sort(() => Math.random() - 0.5).slice(0, 12);
    const result = [{ ...SPECIALS[0], special: true }]; // +5000 always first
    shuffled.forEach((ex, i) => {
      result.push(ex);
      if (i === 4) result.push({ ...SPECIALS[3], special: true });
      if (i === 8) result.push({ ...SPECIALS[5], special: true });
    });
    return result;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, paddingBottom: 8 }}>
      <style>{CSS}</style>

      {/* Headline */}
      <h1 className="j-empty-headline" style={{
        fontWeight: 900, color: '#0f1e40', margin: 0,
        fontSize: 'clamp(27px, 7vw, 34px)', lineHeight: 1.2, letterSpacing: -0.5,
        textAlign: 'center', padding: '0 16px',
      }}>
        צריך עזרה? פרסם משימה
      </h1>

      {/* Description */}
      <p className="j-empty-desc" style={{
        fontSize: 14.5, color: '#64748b', lineHeight: 1.5, fontWeight: 500,
        textAlign: 'center', maxWidth: 330, margin: '8px 0 0', padding: '0 18px',
      }}>
        פרסום משימה לוקח פחות מדקה. תוך דקות אנשים יגישו בקשות לביצוע המשימה ואתה בוחר את מי שמתאים לך.
      </p>

      {/* Primary CTA */}
      <Link to="/create-task" className="j-empty-cta-wrap" style={{ textDecoration: 'none', width: '90%', maxWidth: 360, marginTop: 14, display: 'block' }}>
        <button
          onClick={() => { try { navigator.vibrate?.(15); } catch {} }}
          className="j-empty-cta"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', height: 60, borderRadius: 18, border: 'none',
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 18, cursor: 'pointer',
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
      <div style={{ height: 30 }} />

      {/* Bubbles section — wraps and each bubble slides up with stagger */}
      <div className="j-empty-bubbles" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#94a3b8', background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 999, padding: '5px 12px' }}>
            💡 דוגמאות למשימות שאנשים מפרסמים
          </span>
        </div>

        <div dir="rtl" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, padding: '0 16px', maxWidth: 400, margin: '0 auto' }}>
          {bubbles.map((ex, i) => (
            <span
              key={i}
              className={ex.special ? 'j-empty-chip j-empty-chip-special' : 'j-empty-chip'}
              style={{
                animation: 'jEmptyBubbleUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
                animationDelay: `${300 + Math.min(i * 45, 900)}ms`,
              }}
            >
              <span style={{ fontSize: 14, opacity: 0.85 }}>{ex.emoji}</span>
              {ex.text}
            </span>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: 18 }} />

      {/* Trust message */}
      <p className="j-empty-trust" style={{ fontSize: 13.5, color: '#64748b', fontWeight: 600, textAlign: 'center', margin: 0, padding: '0 24px' }}>
        💪 אנשים מפרסמים משימות — ותמיד מגיע מישהו לעזור.
      </p>
    </div>
  );
}