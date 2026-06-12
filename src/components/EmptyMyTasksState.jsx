import { Link } from 'react-router-dom';

const EXAMPLES = [
  '🚗 צריך טרמפ לאילת',
  '🔧 עזרה בהחלפת גלגל',
  '🔥 מנגליסט לשעתיים',
  '📦 עזרה בפינוי מחסן',
  '👶 בייביסיטר להערב',
  '🔋 הרכב לא מניע',
  '🐕 מישהו יוריד את הכלב',
  '🪑 הרכבת שידה מאיקאה',
  '🛒 קניות מהסופר',
  '🧹 ניקיון דירה 3 חדרים',
  '📺 תליית טלוויזיה',
  '🚚 הובלת ספה קטנה',
  '💻 עזרה בהתקנת מחשב',
  '📱 העברת מידע לטלפון חדש',
  '🎂 איסוף עוגה מהקונדיטוריה',
  '🛠️ תיקון דלת שלא נסגרת',
  '🌿 גיזום גינה קטנה',
  '📸 צלם לשעה אחת',
  '🎁 איסוף חבילה דחוף',
];

// Duplicate twice for seamless loop
const ROW1 = [...EXAMPLES, ...EXAMPLES];
const ROW2 = [...EXAMPLES.slice(9), ...EXAMPLES.slice(0, 9), ...EXAMPLES.slice(9), ...EXAMPLES.slice(0, 9)];

function Tag({ text }) {
  return (
    <span style={{
      display: 'inline-block',
      flexShrink: 0,
      background: '#fff',
      border: '1.5px solid #e8edf5',
      borderRadius: 20,
      padding: '7px 14px',
      fontSize: 13,
      fontWeight: 700,
      color: '#0f1e40',
      whiteSpace: 'nowrap',
      marginLeft: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {text}
    </span>
  );
}

export default function EmptyMyTasksState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>
      <style>{`
        @keyframes ticker-ltr {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ticker-rtl {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .ticker-track-ltr {
          display: flex;
          width: max-content;
          animation: ticker-ltr 22s linear infinite;
        }
        .ticker-track-rtl {
          display: flex;
          width: max-content;
          animation: ticker-rtl 26s linear infinite;
        }
      `}</style>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '0 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 44 }}>📭</div>
        <p style={{ fontWeight: 800, color: '#0f1e40', margin: 0, fontSize: 16 }}>אין משימות פעילות</p>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>פרסם משימה חדשה וקבל עובד תוך דקות</p>
        <Link to="/create-task" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8, height: 50, paddingInline: 28,
            borderRadius: 14, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(26,111,212,0.35)',
          }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>+</span>
            פרסם משימה
          </button>
        </Link>
      </div>

      {/* Row 1 — scrolls left */}
      <div style={{ width: '100%', overflow: 'hidden', position: 'relative', paddingBlock: 4 }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, background: 'linear-gradient(to left, var(--surface-1,#f4f7fb), transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, background: 'linear-gradient(to right, var(--surface-1,#f4f7fb), transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div className="ticker-track-ltr">
          {ROW1.map((text, i) => <Tag key={i} text={text} />)}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div style={{ width: '100%', overflow: 'hidden', position: 'relative', paddingBlock: 4 }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, background: 'linear-gradient(to left, var(--surface-1,#f4f7fb), transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, background: 'linear-gradient(to right, var(--surface-1,#f4f7fb), transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div className="ticker-rtl">
          <div className="ticker-track-rtl">
            {ROW2.map((text, i) => <Tag key={i} text={text} />)}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#b0b8c8', marginTop: 10, fontWeight: 600 }}>
        אנשים מפרסמים כל דבר — ומישהו תמיד מגיע לעזור 💪
      </p>
    </div>
  );
}