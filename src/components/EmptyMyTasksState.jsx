import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus } from 'lucide-react';

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

// Split into 3 rows; all rows live inside ONE scroll container so they move together
const perRow = Math.ceil(EXAMPLES.length / 3);
const ROWS = [
  EXAMPLES.slice(0, perRow),
  EXAMPLES.slice(perRow, perRow * 2),
  EXAMPLES.slice(perRow * 2),
];

const HIDE_SCROLL_CSS = `
  .j-empty-scroll::-webkit-scrollbar { display: none; }
  .j-empty-scroll { scrollbar-width: none; -ms-overflow-style: none; }
`;

export default function EmptyMyTasksState() {
  const { t } = useLanguage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
      <style>{HIDE_SCROLL_CSS}</style>

      {/* Calm heading — promoted subheadline, smaller & softer */}
      <p style={{
        fontWeight: 800, color: '#475569', margin: 0,
        fontSize: 17, lineHeight: 1.45, letterSpacing: -0.1,
        maxWidth: 300, textAlign: 'center',
        padding: '0 24px 18px',
      }}>
        {t('no_active_tasks_sub')}
      </p>

      {/* 3 rows in ONE scroll container — they move together as a block */}
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
          {ROWS.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: 'flex',
                gap: 8,
                // gentle stagger so rows aren't perfectly aligned
                paddingRight: ri === 1 ? 28 : 0,
              }}
            >
              {row.map((ex, i) => (
                <span
                  key={i}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(226,234,245,0.6)',
                    borderRadius: 999,
                    padding: '7px 13px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 4px rgba(15,40,107,0.04)',
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.85 }}>{ex.emoji}</span>
                  {ex.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Calm, modest Post Task button */}
      <Link to="/create-task" style={{ textDecoration: 'none', marginTop: 18 }}>
        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          height: 46, paddingInline: 24,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
          color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(26,111,212,0.28)',
        }}>
          <Plus size={18} strokeWidth={2.5} />
          {t('post_task_btn')}
        </button>
      </Link>

      <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 10, fontWeight: 600, textAlign: 'center', padding: '0 24px' }}>
        {t('people_post_everything')}
      </p>
    </div>
  );
}