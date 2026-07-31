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

// Split 50 examples into 3 rows
const ROW_COUNT = 3;
const perRow = Math.ceil(EXAMPLES.length / ROW_COUNT);
const ROWS = Array.from({ length: ROW_COUNT }, (_, i) =>
  EXAMPLES.slice(i * perRow, (i + 1) * perRow)
);

const HIDE_SCROLL_CSS = `
  .j-empty-scroll::-webkit-scrollbar { display: none; }
  .j-empty-scroll { scrollbar-width: none; -ms-overflow-style: none; }
`;

export default function EmptyMyTasksState() {
  const { t } = useLanguage();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>
      <style>{HIDE_SCROLL_CSS}</style>

      {/* Hero — promoted subheadline as the large primary heading */}
      <div style={{ textAlign: 'center', padding: '0 20px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <p style={{
          fontWeight: 900, color: '#0f1e40', margin: 0,
          fontSize: 24, lineHeight: 1.3, letterSpacing: -0.3,
          maxWidth: 320,
        }}>
          {t('no_active_tasks_sub')}
        </p>

        {/* Large, attractive Post Task button */}
        <Link to="/create-task" style={{ textDecoration: 'none', width: '100%', maxWidth: 340 }}>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', height: 58, paddingInline: 28,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 17, border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 28px rgba(26,111,212,0.4)',
            letterSpacing: 0.2,
          }}>
            <Plus size={22} strokeWidth={2.5} />
            {t('post_task_btn')}
          </button>
        </Link>
      </div>

      {/* 3 manually-scrollable rows of example chips */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>
        {ROWS.map((row, ri) => (
          <div
            key={ri}
            dir="rtl"
            className="j-empty-scroll"
            style={{
              width: '100%',
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              padding: '2px 16px',
              WebkitOverflowScrolling: 'touch',
              // Offset alternate rows for a staggered feel
              paddingLeft: ri === 1 ? '40px' : '16px',
            }}
          >
            {row.map((ex, i) => (
              <span
                key={i}
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: '#ffffff',
                  border: '1.5px solid #e2eaf5',
                  borderRadius: 999,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1e3a5f',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 10px rgba(26,111,212,0.08)',
                }}
              >
                <span style={{ fontSize: 16 }}>{ex.emoji}</span>
                {ex.text}
              </span>
            ))}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#b0b8c8', marginTop: 6, fontWeight: 600, textAlign: 'center', padding: '0 24px' }}>
        {t('people_post_everything')}
      </p>
    </div>
  );
}