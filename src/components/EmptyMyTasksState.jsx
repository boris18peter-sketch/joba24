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
  { emoji: '📺', text: 'לתלות טלוויזיה 65"' },
  { emoji: '📦', text: 'עזרה בפריקת ארגזים' },
  { emoji: '🧺', text: 'לעזור לקפל סל כביסה' },
  { emoji: '💧', text: 'לנקות חצר בלחץ מים' },
  { emoji: '🍕', text: 'איסוף פיצה דחוף' },
  { emoji: '🎸', text: 'להעביר שיעור גיטרה' },
  { emoji: '🧸', text: 'לתפור תיקון לצעצוע' },
  { emoji: '🎂', text: 'לאפות עוגה ליומהולדת' },
  { emoji: '🚲', text: 'תיקון אופניים' },
  { emoji: '🪟', text: 'ניקוי חלונות גבוהים' },
  { emoji: '🐈', text: 'להאכיל את החתול סופ״ש' },
  { emoji: '🧊', text: 'הובלת מקרר' },
  { emoji: '📚', text: 'עזרה בעבודת סמינר' },
  { emoji: '💄', text: 'איפור לאירוע' },
  { emoji: '🎹', text: 'להעביר שיעור פסנתר' },
  { emoji: '🧶', text: 'סריגה לתינוק' },
  { emoji: '🧴', text: 'מלאי מדיח כלים' },
  { emoji: '🔩', text: 'הרכבת מתלה לטלוויזיה' },
  { emoji: '🛁', text: 'פתיחת סתימה בכיור' },
  { emoji: '🪞', text: 'תליית מראה כבדה' },
  { emoji: '🍓', text: 'איסוף מגש פירות' },
  { emoji: '🧷', text: 'תפירת כפתור' },
  { emoji: '🛏️', text: 'הובלת מיטה זוגית' },
  { emoji: '📦', text: 'אריזת דירה למעבר' },
];

// Special social-proof bubbles (blue accent)
const SPECIALS = [
  { emoji: '👥', text: '+1000 אנשים מחפשים משימות עכשיו' },
  { emoji: '🔥', text: 'יש אנשים זמינים למשימות באזור שלך' },
  { emoji: '🚀', text: 'בממוצע תוך 10 דקות מקבלים 5 בקשות' },
];

const HIDE_SCROLL_CSS = `
  .j-empty-scroll::-webkit-scrollbar { display: none; }
  .j-empty-scroll { scrollbar-width: none; -ms-overflow-style: none; }
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
  .j-empty-chip {
    flexShrink: 0;
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(226,234,245,0.6);
    border-radius: 999px;
    padding: 7px 13px;
    font-size: 12px; font-weight: 600; color: #64748b;
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

  // Split examples into 3 rows and insert a special social-proof bubble into each row
  const rows = useMemo(() => {
    const shuffled = [...EXAMPLES].sort(() => Math.random() - 0.5);
    const perRow = Math.ceil(shuffled.length / 3);
    const baseRows = [
      shuffled.slice(0, perRow),
      shuffled.slice(perRow, perRow * 2),
      shuffled.slice(perRow * 2),
    ];
    // Insert a different special bubble into each row at a random-ish position
    return baseRows.map((row, i) => {
      const special = SPECIALS[i % SPECIALS.length];
      const insertAt = Math.floor(row.length * (0.25 + i * 0.2));
      const copy = [...row];
      copy.splice(insertAt, 0, { ...special, special: true });
      return copy;
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingBottom: 12 }}>
      <style>{HIDE_SCROLL_CSS}</style>

      {/* Headline */}
      <h1 className="j-empty-headline" style={{
        fontWeight: 900, color: '#0f1e40', margin: 0,
        fontSize: 'clamp(25px, 6vw, 31px)', lineHeight: 1.3, letterSpacing: -0.4,
        textAlign: 'center', maxWidth: 340, padding: '0 16px',
      }}>
        צריך עזרה? פרסם משימה ותוך דקות תקבל בקשות מאנשים שרוצים לבצע אותה.
      </h1>

      {/* Description */}
      <p className="j-empty-desc" style={{
        fontSize: 15, color: '#64748b', lineHeight: 1.5, fontWeight: 500,
        textAlign: 'center', maxWidth: 320, margin: '12px 0 0', padding: '0 18px',
      }}>
        פרסום משימה לוקח פחות מדקה. אנשים יגישו בקשות ואתה בוחר את מי שמתאים לך.
      </p>

      {/* Primary CTA */}
      <Link to="/create-task" className="j-empty-cta-wrap" style={{ textDecoration: 'none', width: '90%', maxWidth: 360, marginTop: 18, display: 'block' }}>
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

      {/* Spacer */}
      <div style={{ height: 24 }} />

      {/* Bubbles section */}
      <div className="j-empty-bubbles" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#94a3b8', background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 999, padding: '5px 12px' }}>
            💡 דוגמאות למשימות שאנשים מפרסמים
          </span>
        </div>

        <div
          dir="rtl"
          className="j-empty-scroll"
          style={{
            width: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            padding: '2px 0 6px',
          }}
        >
          <div style={{ width: 'max-content', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 16, paddingLeft: 16 }}>
            {rows.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: 'flex',
                  gap: 8,
                  paddingRight: [0, 28, 14][ri],
                }}
              >
                {row.map((ex, i) => (
                  <span
                    key={i}
                    className={ex.special ? 'j-empty-chip j-empty-chip-special' : 'j-empty-chip'}
                  >
                    <span style={{ fontSize: 14, opacity: 0.85 }}>{ex.emoji}</span>
                    {ex.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
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