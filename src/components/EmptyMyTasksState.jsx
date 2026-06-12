import { useEffect, useRef, useState } from 'react';
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

function InfiniteTicker() {
  const containerRef = useRef(null);
  const posRef = useRef(0);
  const rafRef = useRef(null);
  const [ready, setReady] = useState(false);

  // duplicate items so there's always a full screen visible
  const items = [...EXAMPLES, ...EXAMPLES, ...EXAMPLES];

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;

    // single copy width = total / 3
    const singleWidth = el.scrollWidth / 3;

    const step = () => {
      posRef.current -= 0.6;
      if (Math.abs(posRef.current) >= singleWidth) {
        posRef.current = 0;
      }
      el.style.transform = `translateX(${posRef.current}px)`;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready]);

  return (
    <div style={{ width: '100%', overflow: 'hidden', position: 'relative', padding: '6px 0 10px' }}>
      {/* fade edges */}
      <div style={{ position: 'absolute', inset: 0, right: 'auto', width: 40, background: 'linear-gradient(to right, #f4f7fb, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, left: 'auto', width: 40, background: 'linear-gradient(to left, #f4f7fb, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div
        ref={containerRef}
        style={{ display: 'flex', flexDirection: 'row', width: 'max-content', willChange: 'transform' }}
      >
        {items.map((text, i) => (
          <span key={i} style={{
            flexShrink: 0,
            display: 'inline-block',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 20,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 700,
            color: '#1e293b',
            whiteSpace: 'nowrap',
            marginLeft: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EmptyMyTasksState() {
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

      <InfiniteTicker />

      <p style={{ fontSize: 11, color: '#b0b8c8', marginTop: 8, fontWeight: 600 }}>
        אנשים מפרסמים כל דבר — ומישהו תמיד מגיע לעזור 💪
      </p>
    </div>
  );
}