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
  '🎁 איסוף חבילה',
  '🏋️ מדריך כושר לבית',
  '📸 לצלם הצעת נישואין',
  '🎈 לנפח בלונים למסיבה',
  '🌹 להביא זר פרחים',
  '🚗 לקחת רכב לטסט',
  '🚗 שטיפת רכב',
  '💡 להחליף נברשת בתקרה גבוהה',
  '🚪 לתקן ציר של דלת',
  '📺 לתלות טלוויזיה 65 אינץ\'',
  '📦 עזרה בפריקת ארגזים',
  '🧺 לעזור לקפל סל כביסה',
  '💧 לנקות חצר בלחץ מים',
];

let tagIdCounter = 0;

export default function EmptyMyTasksState() {
  const [tags, setTags] = useState([]);
  const exampleIndexRef = useRef(0);

  const spawnTag = () => {
    const text = EXAMPLES[exampleIndexRef.current % EXAMPLES.length];
    exampleIndexRef.current += 1;

    const id = ++tagIdCounter;
    const left = 4 + Math.random() * 62; // 4% – 66%
    const duration = 10 + Math.random() * 5; // 10s – 15s

    setTags(prev => [...prev, { id, text, left, duration }]);

    setTimeout(() => {
      setTags(prev => prev.filter(t => t.id !== id));
    }, duration * 1000 + 300);
  };

  useEffect(() => {
    // Staggered initial spawns spread over 6s so screen isn't empty
    const initialDelays = [0, 1200, 2400, 3600, 4800];
    const timers = initialDelays.map(delay => setTimeout(spawnTag, delay));

    // After initial batch, spawn one every 3s
    const interval = setInterval(spawnTag, 3000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

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

      {/* Floating tags area */}
      <div style={{ position: 'relative', width: '100%', height: 140, overflow: 'hidden' }}>
        <style>{`
          @keyframes floatUp {
            0%   { transform: translateY(0px);    opacity: 0; }
            8%   { opacity: 1; }
            85%  { opacity: 1; }
            100% { transform: translateY(-160px); opacity: 0; }
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
              border: '1.5px solid #dce8f5',
              borderRadius: 22,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              color: '#1e3a5f',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(26,111,212,0.1)',
              animation: `floatUp ${tag.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              pointerEvents: 'none',
            }}
          >
            {tag.text}
          </span>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#b0b8c8', marginTop: 4, fontWeight: 600 }}>
        אנשים מפרסמים כל דבר — ומישהו תמיד מגיע לעזור 💪
      </p>
    </div>
  );
}