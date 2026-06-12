import { useEffect, useState, useRef } from 'react';
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
  '🏋️ מדריך כושר לבית',
];

let tagIdCounter = 0;

export default function EmptyMyTasksState() {
  const [tags, setTags] = useState([]);
  const exampleIndexRef = useRef(0);

  const spawnTag = () => {
    const text = EXAMPLES[exampleIndexRef.current % EXAMPLES.length];
    exampleIndexRef.current += 1;

    const id = ++tagIdCounter;
    const left = 5 + Math.random() * 65; // 5% – 70%
    const duration = 8 + Math.random() * 4; // 8s – 12s

    setTags(prev => [...prev, { id, text, left, duration }]);

    // Remove after animation completes
    setTimeout(() => {
      setTags(prev => prev.filter(t => t.id !== id));
    }, duration * 1000 + 200);
  };

  useEffect(() => {
    // Spawn a few immediately with staggered starts
    const initial = [0, 700, 1400, 2100];
    const initialTimers = initial.map(delay => setTimeout(spawnTag, delay));

    // Then spawn every 2.5s
    const interval = setInterval(spawnTag, 2500);

    return () => {
      initialTimers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>
      {/* Floating tags area */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 120,
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <style>{`
          @keyframes floatUp {
            0%   { transform: translateY(0);    opacity: 0; }
            8%   { opacity: 1; }
            85%  { opacity: 1; }
            100% { transform: translateY(-140px); opacity: 0; }
          }
        `}</style>

        {tags.map(tag => (
          <span
            key={tag.id}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${tag.left}%`,
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: 20,
              padding: '7px 13px',
              fontSize: 12,
              fontWeight: 700,
              color: '#1e293b',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              animation: `floatUp ${tag.duration}s ease-in-out forwards`,
              pointerEvents: 'none',
            }}
          >
            {tag.text}
          </span>
        ))}
      </div>

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

      <p style={{ fontSize: 11, color: '#b0b8c8', marginTop: 4, fontWeight: 600 }}>
        אנשים מפרסמים כל דבר — ומישהו תמיד מגיע לעזור 💪
      </p>
    </div>
  );
}