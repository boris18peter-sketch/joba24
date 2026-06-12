import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const EXAMPLES = [
  '🚗 צריך טרמפ לאילת',
  '🔧 דחוף עזרה בהחלפת גלגל',
  '🔥 צריך מנגליסט לשעתיים',
  '📦 צריך עזרה בפינוי מחסן',
  '👶 דחוף בייביסיטר להערב',
  '🔋 הרכב לא מניע',
  '🐕 מישהו שיוריד את הכלב',
  '🪑 הרכבת שידה מאיקאה',
  '🛒 צריך קניות מהסופר',
  '🧹 דחוף ניקיון דירה 3 חדרים',
  '📺 צריך לחבר מתקן ולתלות טלוויזיה',
  '🚚 צריך להוביל ספה קטנה',
  '🪜 צריך מורה פרטי לאנגלית',
  '💻 עזרה בהתקנת מחשב',
  '📱 עזרה בהעברת מידע לטלפון חדש',
  '🎂 מישהו לאסוף עוגה מהקונדיטוריה',
  '🛠️ תיקון דלת שלא נסגרת',
  '🌿 גיזום גינה קטנה',
  '📸 צלם לשעה אחת',
  '🎁 איסוף חבילה דחוף',
];

// Inject CSS once into document head to guarantee the keyframe is registered
const STYLE_ID = 'empty-tasks-ticker-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes emptyTasksTicker {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .empty-tasks-ticker-track {
      display: flex;
      flex-direction: row;
      gap: 10px;
      width: max-content;
      padding: 6px 0 10px;
      animation: emptyTasksTicker 38s linear infinite;
    }
    .empty-tasks-ticker-item {
      flex-shrink: 0;
      background: var(--surface-2);
      border: 1px solid var(--border-1);
      border-radius: 14px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-1);
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
  `;
  document.head.appendChild(el);
}

export default function EmptyMyTasksState() {
  useEffect(() => {
    injectStyle();
  }, []);

  // Duplicate so the loop is seamless (scroll the first half, then it repeats)
  const items = [...EXAMPLES, ...EXAMPLES];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: 32 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 44 }}>📭</div>
        <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: 16 }}>אין משימות פעילות</p>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>פרסם משימה חדשה וקבל עובד תוך דקות</p>
        <Link to="/create-task" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, height: 50, paddingInline: 28, borderRadius: 14, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,111,212,0.35)' }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>+</span>
            פרסם משימה
          </button>
        </Link>
      </div>

      {/* Scrolling ticker */}
      <div style={{ width: '100vw', overflow: 'hidden', position: 'relative', marginTop: 4 }}>
        {/* Fade edges */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 48, background: 'linear-gradient(to left, var(--surface-1), transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 48, background: 'linear-gradient(to right, var(--surface-1), transparent)', zIndex: 2, pointerEvents: 'none' }} />

        <div className="empty-tasks-ticker-track">
          {items.map((text, i) => (
            <div key={i} className="empty-tasks-ticker-item">
              {text}
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#b0b8c8', marginTop: 8, fontWeight: 600 }}>אנשים מפרסמים כל דבר — ומישהו תמיד מגיע לעזור 💪</p>
    </div>
  );
}