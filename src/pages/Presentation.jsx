import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';
const DOMAIN = 'joba24.base44.app';

const slides = [
  {
    id: 'intro',
    bg: 'linear-gradient(135deg, #0f2b6b 0%, #1a6fd4 60%, #0a52b0 100%)',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 32px', textAlign: 'center' }}>
        <img src={LOGO} alt="Joba24" style={{ width: 90, height: 90, borderRadius: 24, objectFit: 'cover', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} />
        <h1 style={{ color: 'white', fontSize: 42, fontWeight: 900, margin: 0, letterSpacing: -1 }}>
          Joba<span style={{ color: '#fbbf24' }}>24</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 10, marginBottom: 0 }}>
          שוק העבודה הגמיש של ישראל
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['⚡ מיידי', '📍 מקומי', '💰 בטוח', '🌟 מדורג'].map(tag => (
            <span key={tag} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)' }}>{tag}</span>
          ))}
        </div>
        <div style={{ marginTop: 32, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{DOMAIN}</div>
      </div>
    ),
  },
  {
    id: 'problem',
    bg: '#fff',
    content: (
      <div style={{ padding: '40px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>הבעיה</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f2b6b', margin: '0 0 20px', lineHeight: 1.2 }}>
          השוק שבור.<br />
          <span style={{ color: '#1a6fd4' }}>אנחנו מתקנים אותו.</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: '😤', text: 'קשה למצוא עובד מהיר לעבודה קטנה' },
            { icon: '⏰', text: 'אין פלטפורמה לג\'ובות חד-פעמיות מיידיות' },
            { icon: '💸', text: 'עבודה בשחור — ללא ביטחון לשני הצדדים' },
            { icon: '📵', text: 'אין דרך לדרג, לסנן, לדעת למי לסמוך' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f4f7fb', borderRadius: 14, padding: '12px 16px', border: '1px solid #dce8f5' }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'solution',
    bg: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
    content: (
      <div style={{ padding: '40px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>הפתרון</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '0 0 20px', lineHeight: 1.3 }}>
          Joba24 — פלטפורמת ג'ובות <span style={{ color: '#fbbf24' }}>בזמן אמת</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '📱', title: 'פרסום תוך שניות', desc: 'לקוח מפרסם משימה עם מחיר, מיקום וזמן משוער' },
            { icon: '⚡', title: 'ביצוע מיידי', desc: 'עובד גמיש לוקח את המשימה — מיידית או לאחר אישור' },
            { icon: '🔒', title: 'תשלום מאובטח', desc: 'Escrow מגן על שני הצדדים — כסף משתחרר רק לאחר אישור' },
            { icon: '⭐', title: 'דירוג ואמון', desc: 'מערכת ציונים ודירוגים בונה מוניטין לעובדים' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: 'white', fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'how',
    bg: '#fff',
    content: (
      <div style={{ padding: '40px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>איך זה עובד</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0f2b6b', margin: '0 0 24px' }}>4 צעדים פשוטים</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { num: '01', title: 'פרסם משימה', desc: 'תיאור, מחיר, מיקום — תוך 60 שניות', color: '#1a6fd4' },
            { num: '02', title: 'עובד לוקח', desc: 'מיידית או אחרי בחירה ידנית', color: '#7c3aed' },
            { num: '03', title: 'ביצוע ומעקב', desc: 'צ\'אט, מיקום בזמן אמת, עדכוני סטטוס', color: '#059669' },
            { num: '04', title: 'אישור ותשלום', desc: 'אישרת? הכסף משתחרר אוטומטית', color: '#d97706' },
          ].map(({ num, title, desc, color }, i) => (
            <div key={num} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative', paddingBottom: i < 3 ? 16 : 0 }}>
              {i < 3 && <div style={{ position: 'absolute', right: 20, top: 36, width: 2, height: 'calc(100% - 20px)', background: '#e8f0fe' }} />}
              <div style={{ width: 40, height: 40, borderRadius: 14, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{num}</div>
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0f2b6b' }}>{title}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'market',
    bg: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
    content: (
      <div style={{ padding: '40px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>הזדמנות</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '0 0 24px' }}>שוק ענק — פתרון חסר</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { val: '3M+', label: 'עובדים עצמאיים בישראל' },
            { val: '₪8B', label: 'שוק עבודות שירות שנתי' },
            { val: '70%', label: 'עסקאות בשחור כיום' },
            { val: '0', label: 'פתרון מיידי קיים' },
          ].map(({ val, label }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '16px 12px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fbbf24' }}>{val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
          Joba24 מחבר בין ביקוש לא מנוצל לכוח עבודה זמין — בלחיצה אחת.
        </div>
      </div>
    ),
  },
  {
    id: 'features',
    bg: '#fff',
    content: (
      <div style={{ padding: '40px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>יכולות המוצר</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f2b6b', margin: '0 0 16px' }}>מה יש ב-Joba24?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '🗺️', text: 'מפת ג\'ובות חיה' },
            { icon: '⚡', text: 'ביצוע מיידי' },
            { icon: '✋', text: 'אישור ידני' },
            { icon: '💬', text: 'צ\'אט מובנה' },
            { icon: '📍', text: 'מעקב GPS' },
            { icon: '🔒', text: 'Escrow בטוח' },
            { icon: '⭐', text: 'דירוג דו-כיווני' },
            { icon: '🏆', text: 'לוח מובילים' },
            { icon: '📸', text: 'סטוריז למשימות' },
            { icon: '🔔', text: 'התראות מיידיות' },
            { icon: '📊', text: 'ארנק דיגיטלי' },
            { icon: '🎯', text: 'מיון חכם אישי' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f4f7fb', borderRadius: 12, padding: '10px 12px', border: '1px solid #dce8f5' }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f2b6b' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'business',
    bg: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)',
    content: (
      <div style={{ padding: '40px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>מודל עסקי</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '0 0 20px' }}>איך אנחנו מרוויחים?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { pct: '10%', title: 'עמלת פלטפורמה', desc: 'על כל עסקה שמתבצעת', color: '#fbbf24' },
            { pct: '₪', title: 'פרסום ממומן', desc: 'משימות ממומנות עולות לראש הפיד', color: '#34d399' },
            { pct: '⭐', title: 'מנוי פרמיום', desc: 'עובדים מקבלים badge, פרופיל מוגבר', color: '#a78bfa' },
            { pct: '🏢', title: 'B2B', desc: 'עסקים שמפרסמים משימות בכמות גדולה', color: '#60a5fa' },
          ].map(({ pct, title, desc, color }) => (
            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color, minWidth: 40, textAlign: 'center' }}>{pct}</div>
              <div>
                <div style={{ fontWeight: 800, color: 'white', fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'cta',
    bg: '#fff',
    content: (
      <div style={{ padding: '40px 28px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
        <img src={LOGO} alt="Joba24" style={{ width: 70, height: 70, borderRadius: 20, objectFit: 'cover', marginBottom: 16, boxShadow: '0 4px 20px rgba(26,111,212,0.2)' }} />
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f2b6b', margin: '0 0 8px' }}>
          Joba<span style={{ color: '#1a6fd4' }}>24</span>
        </h2>
        <p style={{ color: '#666', fontSize: 15, marginBottom: 24 }}>הצטרפו למהפכת שוק העבודה הגמיש</p>
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 16, padding: '16px 32px', marginBottom: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>נסו עכשיו בחינם</div>
          <div style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>{DOMAIN}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, color: '#999', fontSize: 12 }}>
          <span>✅ ללא כרטיס אשראי</span>
          <span>✅ הרשמה תוך שניות</span>
        </div>
        <div style={{ marginTop: 32, padding: '14px 20px', background: '#f4f7fb', borderRadius: 14, border: '1px solid #dce8f5', fontSize: 14, color: '#0f2b6b', fontWeight: 600 }}>
          "פרסמתי ג'ובה ועבודה הגיעה תוך 3 דקות" 🚀
        </div>
      </div>
    ),
  },
];

export default function Presentation() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(slides.length - 1, i + 1));

  const slide = slides[current];

  return (
    <div style={{ minHeight: '100vh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0', fontFamily: 'Inter, sans-serif' }} dir="rtl">
      {/* Slide */}
      <div style={{
        width: '100%', maxWidth: 420, height: '100vh', maxHeight: 720,
        background: slide.bg, borderRadius: 0, overflow: 'hidden', position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {slide.content}

        {/* Slide counter */}
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? '#1a6fd4' : 'rgba(0,0,0,0.15)', cursor: 'pointer', transition: 'all 0.2s' }} />
          ))}
        </div>

        {/* Nav arrows */}
        {current > 0 && (
          <button onClick={prev} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
            <ChevronLeft size={18} color="#0f2b6b" />
          </button>
        )}
        {current < slides.length - 1 && (
          <button onClick={next} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
            <ChevronRight size={18} color="#0f2b6b" />
          </button>
        )}
      </div>

      {/* Slide title below */}
      <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        {current + 1} / {slides.length}
      </div>
    </div>
  );
}