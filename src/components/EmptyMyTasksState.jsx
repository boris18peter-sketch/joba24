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
  '📱 העברת מידע לטלפון',
  '🎂 איסוף עוגה דחוף',
  '🛠️ תיקון דלת',
  '🌿 גיזום גינה',
  '📸 צלם לשעה',
  '🎁 איסוף חבילה',
];

export default function EmptyMyTasksState() {
  // Render items 3x for seamless loop
  const items = [...EXAMPLES, ...EXAMPLES, ...EXAMPLES];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>

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

      {/* Marquee ticker */}
      <style>{`
        .joba-marquee-wrap {
          width: 100%;
          overflow: hidden;
          position: relative;
          padding: 4px 0 8px;
        }
        .joba-marquee-wrap::before,
        .joba-marquee-wrap::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 40px;
          z-index: 2;
          pointer-events: none;
        }
        .joba-marquee-wrap::before { left: 0; background: linear-gradient(to right, #f4f7fb, transparent); }
        .joba-marquee-wrap::after  { right: 0; background: linear-gradient(to left, #f4f7fb, transparent); }

        .joba-marquee-track {
          display: flex;
          flex-direction: row;
          width: max-content;
          animation: joba-scroll 28s linear infinite;
        }

        @keyframes joba-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }

        .joba-tag {
          flex-shrink: 0;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          margin-left: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
      `}</style>

      <div className="joba-marquee-wrap">
        <div className="joba-marquee-track">
          {items.map((text, i) => (
            <span key={i} className="joba-tag">{text}</span>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#b0b8c8', marginTop: 8, fontWeight: 600 }}>
        אנשים מפרסמים כל דבר — ומישהו תמיד מגיע לעזור 💪
      </p>
    </div>
  );
}