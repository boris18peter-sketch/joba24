import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';
const DOMAIN = 'joba24.base44.app';

// ─── Slide components ────────────────────────────────────────────────

function Slide1() {
  return (
    <div style={{ height: '100%', background: 'linear-gradient(145deg,#0a1e52 0%,#1a6fd4 55%,#0a52b0 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* bg circles */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

      <img src={LOGO} alt="Joba24" style={{ width: 88, height: 88, borderRadius: 24, objectFit: 'cover', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', marginBottom: 20 }} />
      <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: -2, lineHeight: 1 }}>
        Joba<span style={{ color: '#fbbf24' }}>24</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginTop: 10, fontWeight: 500 }}>שוק הג'ובות המיידי של ישראל</div>

      <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['⚡ מיידי', '📍 מקומי', '🔒 בטוח', '⭐ מדורג'].map(t => (
          <span key={t} style={{ background: 'rgba(255,255,255,0.13)', color: 'white', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)' }}>{t}</span>
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: 36, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{DOMAIN}</div>
    </div>
  );
}

function Slide2() {
  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 30px' }}>
      <Tag color="#1a6fd4">הבעיה</Tag>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f2b6b', margin: '10px 0 22px', lineHeight: 1.25 }}>
        השוק שבור.<br /><span style={{ color: '#1a6fd4' }}>אנחנו מתקנים אותו.</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: '😤', text: 'קשה למצוא עובד מהיר לעבודה קטנה' },
          { icon: '⏰', text: 'אין פלטפורמה לג\'ובות חד-פעמיות מיידיות' },
          { icon: '💸', text: 'עבודה בשחור — חסר ביטחון לשני הצדדים' },
          { icon: '📵', text: 'אין דרך לסנן ולדעת למי לסמוך' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f4f7fb', borderRadius: 14, padding: '12px 14px', border: '1px solid #dce8f5' }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide3() {
  return (
    <div style={{ height: '100%', background: 'linear-gradient(145deg,#0a1e52,#1a6fd4)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 30px' }}>
      <Tag color="#fbbf24" dark>הפתרון</Tag>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '10px 0 20px', lineHeight: 1.3 }}>
        Joba24 — ג'ובות<br /><span style={{ color: '#fbbf24' }}>בזמן אמת</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[
          { icon: '📱', title: 'פרסום תוך 60 שניות', desc: 'מחיר, מיקום, תיאור — בלחיצה' },
          { icon: '⚡', title: 'ביצוע מיידי', desc: 'עובד לוקח — מיידית או לאחר אישור' },
          { icon: '🔒', title: 'תשלום מאובטח (Escrow)', desc: 'כסף משתחרר רק אחרי אישור' },
          { icon: '⭐', title: 'מערכת דירוג ואמון', desc: 'ציונים ובאדג\'ים לעובדים מקצועיים' },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '11px 14px', border: '1px solid rgba(255,255,255,0.14)' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: 13 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide4() {
  const steps = [
    { num: '01', title: 'פרסם משימה', desc: 'תיאור, מחיר, מיקום — 60 שניות', color: '#1a6fd4' },
    { num: '02', title: 'עובד לוקח', desc: 'מיידית או אחרי בחירה ידנית', color: '#7c3aed' },
    { num: '03', title: 'ביצוע ומעקב', desc: 'צ\'אט, GPS בזמן אמת, סטטוסים', color: '#059669' },
    { num: '04', title: 'אישור ותשלום', desc: 'אישרת? הכסף משתחרר אוטומטית', color: '#d97706' },
  ];
  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 30px' }}>
      <Tag color="#1a6fd4">איך זה עובד</Tag>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0f2b6b', margin: '10px 0 24px' }}>4 צעדים פשוטים</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map(({ num, title, desc, color }, i) => (
          <div key={num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative', paddingBottom: i < 3 ? 18 : 0 }}>
            {i < 3 && <div style={{ position: 'absolute', right: 19, top: 40, width: 2, height: 'calc(100% - 20px)', background: '#e8f0fe' }} />}
            <div style={{ width: 38, height: 38, borderRadius: 13, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{num}</div>
            <div style={{ paddingTop: 7 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f2b6b' }}>{title}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide5() {
  return (
    <div style={{ height: '100%', background: 'linear-gradient(145deg,#0a1e52,#1a6fd4)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 30px', textAlign: 'center' }}>
      <Tag color="#fbbf24" dark center>הזדמנות</Tag>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '10px 0 22px' }}>שוק ענק — פתרון חסר</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          { val: '3M+', label: 'עצמאיים בישראל' },
          { val: '₪8B', label: 'שוק שירותים שנתי' },
          { val: '70%', label: 'עסקאות בשחור היום' },
          { val: '0', label: 'פתרון מיידי קיים' },
        ].map(({ val, label }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.11)', borderRadius: 16, padding: '16px 10px', border: '1px solid rgba(255,255,255,0.14)' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fbbf24' }}>{val}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.18)', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
        Joba24 מחבר ביקוש לא מנוצל לכוח עבודה זמין — בלחיצה אחת.
      </div>
    </div>
  );
}

function Slide6() {
  const features = [
    '🗺️ מפת ג\'ובות חיה', '⚡ ביצוע מיידי', '✋ אישור ידני',
    '💬 צ\'אט מובנה', '📍 מעקב GPS', '🔒 Escrow בטוח',
    '⭐ דירוג דו-כיווני', '🏆 לוח מובילים', '📸 סטוריז',
    '🔔 התראות מיידיות', '💳 ארנק דיגיטלי', '🎯 מיון חכם',
  ];
  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 30px' }}>
      <Tag color="#1a6fd4">יכולות</Tag>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f2b6b', margin: '10px 0 16px' }}>מה יש ב-Joba24?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f4f7fb', borderRadius: 12, padding: '9px 12px', border: '1px solid #dce8f5' }}>
            <span style={{ fontSize: 16 }}>{f.split(' ')[0]}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f2b6b' }}>{f.split(' ').slice(1).join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide7() {
  return (
    <div style={{ height: '100%', background: 'linear-gradient(145deg,#0a1e52,#1a6fd4)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 30px' }}>
      <Tag color="#fbbf24" dark>מודל עסקי</Tag>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '10px 0 20px' }}>איך אנחנו מרוויחים?</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[
          { icon: '10%', title: 'עמלת פלטפורמה', desc: 'על כל עסקה שמתבצעת', color: '#fbbf24' },
          { icon: '📣', title: 'פרסום ממומן', desc: 'משימות ממומנות עולות לראש הפיד', color: '#34d399' },
          { icon: '👑', title: 'מנוי פרמיום', desc: 'Badge + פרופיל מוגבר לעובדים', color: '#a78bfa' },
          { icon: '🏢', title: 'B2B', desc: 'עסקים שמפרסמים בכמות גדולה', color: '#60a5fa' },
        ].map(({ icon, title, desc, color }) => (
          <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '11px 14px', border: '1px solid rgba(255,255,255,0.14)' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color, minWidth: 36, textAlign: 'center' }}>{icon}</div>
            <div>
              <div style={{ fontWeight: 800, color: 'white', fontSize: 13 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide8() {
  return (
    <div style={{ height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 30px', textAlign: 'center' }}>
      <img src={LOGO} alt="Joba24" style={{ width: 72, height: 72, borderRadius: 22, objectFit: 'cover', boxShadow: '0 8px 28px rgba(26,111,212,0.22)', marginBottom: 16 }} />
      <div style={{ fontSize: 36, fontWeight: 900, color: '#0f2b6b', letterSpacing: -1 }}>
        Joba<span style={{ color: '#1a6fd4' }}>24</span>
      </div>
      <p style={{ color: '#777', fontSize: 14, marginTop: 6, marginBottom: 24 }}>הצטרפו למהפכת שוק העבודה הגמיש</p>

      <div style={{ background: 'linear-gradient(135deg,#0f2b6b,#1a6fd4)', borderRadius: 18, padding: '16px 32px', marginBottom: 16, width: '100%' }}>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 4 }}>נסו עכשיו — בחינם</div>
        <div style={{ color: 'white', fontSize: 16, fontWeight: 800, letterSpacing: 0.5 }}>{DOMAIN}</div>
      </div>

      <div style={{ display: 'flex', gap: 14, color: '#999', fontSize: 12, marginBottom: 24 }}>
        <span>✅ ללא כרטיס אשראי</span>
        <span>✅ הרשמה תוך שניות</span>
      </div>

      <div style={{ background: '#f4f7fb', borderRadius: 16, padding: '14px 18px', border: '1px solid #dce8f5', fontSize: 13, color: '#0f2b6b', fontWeight: 600, lineHeight: 1.6, width: '100%' }}>
        "פרסמתי ג'ובה ועבודה הגיעה תוך 3 דקות" 🚀
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────

function Tag({ color, dark, center, children }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
      textTransform: 'uppercase', color: dark ? color : color,
      background: dark ? 'rgba(255,255,255,0.12)' : `${color}18`,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : `${color}44`}`,
      borderRadius: 20, padding: '4px 12px',
      alignSelf: center ? 'center' : 'flex-start',
    }}>{children}</span>
  );
}

// ─── Slide registry ───────────────────────────────────────────────────

const SLIDES = [
  { id: 'intro', component: <Slide1 /> },
  { id: 'problem', component: <Slide2 /> },
  { id: 'solution', component: <Slide3 /> },
  { id: 'how', component: <Slide4 /> },
  { id: 'market', component: <Slide5 /> },
  { id: 'features', component: <Slide6 /> },
  { id: 'business', component: <Slide7 /> },
  { id: 'cta', component: <Slide8 /> },
];

// ─── Main ──────────────────────────────────────────────────────────────

export default function Presentation() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(SLIDES.length - 1, i + 1));

  // swipe support
  const [touchStart, setTouchStart] = useState(null);
  const handleTouchStart = e => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = e => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    setTouchStart(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} dir="rtl">
      {/* Phone frame */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%', maxWidth: 400, height: '100vh', maxHeight: 760,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          borderRadius: window.innerWidth > 440 ? 36 : 0,
        }}
      >
        {/* Slides with slide transition */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {SLIDES[current].component}
        </div>

        {/* Tap zones */}
        {current > 0 && (
          <div onClick={prev} style={{ position: 'absolute', top: 0, left: 0, width: '25%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}
        {current < SLIDES.length - 1 && (
          <div onClick={next} style={{ position: 'absolute', top: 0, right: 0, width: '25%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}

        {/* Arrow buttons */}
        {current > 0 && (
          <button onClick={prev} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 30 }}>
            <ChevronLeft size={16} color="#0f2b6b" />
          </button>
        )}
        {current < SLIDES.length - 1 && (
          <button onClick={next} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 30 }}>
            <ChevronRight size={16} color="#0f2b6b" />
          </button>
        )}

        {/* Progress dots */}
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 30 }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 22 : 6, height: 6, borderRadius: 3, background: i === current ? '#1a6fd4' : 'rgba(100,130,180,0.3)', cursor: 'pointer', transition: 'all 0.25s' }} />
          ))}
        </div>
      </div>

      {/* Slide counter below frame */}
      <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
        {current + 1} / {SLIDES.length}
      </div>
    </div>
  );
}