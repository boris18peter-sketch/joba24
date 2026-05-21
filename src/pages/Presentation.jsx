import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';

// ─── Design tokens ─────────────────────────────────────────────────────
const DARK_BG = '#050d1f';
const BLUE = '#1a6fd4';
const GOLD = '#fbbf24';

// ─── Helper ────────────────────────────────────────────────────────────
function Chip({ children, gold }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: gold ? GOLD : '#93c5fd',
      background: gold ? 'rgba(251,191,36,0.1)' : 'rgba(147,197,253,0.1)',
      border: `1px solid ${gold ? 'rgba(251,191,36,0.3)' : 'rgba(147,197,253,0.25)'}`,
      borderRadius: 20, padding: '4px 12px',
    }}>{children}</span>
  );
}

function Row({ icon, text, sub, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: accent || 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: 'white', fontSize: 13, lineHeight: 1.3 }}>{text}</div>
        {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatBox({ val, label, gold }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: gold ? GOLD : '#60a5fa', letterSpacing: -1 }}>{val}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ─── SLIDE 1 — Cover ──────────────────────────────────────────────────
function Slide1() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 30% 20%, #0d2e6e 0%, ${DARK_BG} 65%)`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '36px 28px', position: 'relative', overflow: 'hidden' }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: -120, right: -100, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <img src={LOGO} alt="" style={{ position: 'absolute', top: 38, right: 28, width: 52, height: 52, borderRadius: 16, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />

      {/* Big number/year top-left as design element */}
      <div style={{ position: 'absolute', top: 28, left: 28, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: 2 }}>SERIES A · 2026</div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        <Chip>שוק הג'ובות</Chip>
        <div style={{ marginTop: 12, fontSize: 54, fontWeight: 900, color: 'white', letterSpacing: -2, lineHeight: 0.95 }}>
          Joba<span style={{ color: GOLD }}>24</span>
        </div>
        <div style={{ marginTop: 14, fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
          Uber לג'ובות —<br />
          <span style={{ color: 'white', fontWeight: 800 }}>תוך 60 שניות</span>
        </div>

        {/* Bottom stats bar */}
        <div style={{ marginTop: 32, display: 'flex', gap: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[['₪8B', 'גודל שוק'], ['3M+', 'פרילנסרים'], ['60s', 'לג\'ובה חיה']].map(([v, l]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>{v}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 2 — Problem ────────────────────────────────────────────────
function Slide2() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      <Chip>הבעיה</Chip>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: '12px 0 28px', lineHeight: 1.2 }}>
        שוק של ₪8 מיליארד<br />
        <span style={{ color: '#ef4444' }}>— ללא פתרון דיגיטלי</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: '😤', text: 'אין פלטפורמה לג\'ובות מיידיות', sub: 'כוח האדם לא מנוצל' },
          { icon: '💸', text: '70% מהעסקאות — בשחור', sub: 'ללא ביטחון, ללא שקיפות' },
          { icon: '⏰', text: 'ממוצע 4 שעות למצוא עובד', sub: 'WhatsApp, טלפונים, בזבוז זמן' },
          { icon: '❌', text: 'אין אמינות בין הצדדים', sub: 'ביטולים, אי-הגעה, הונאות' },
        ].map(({ icon, text, sub }) => (
          <Row key={text} icon={icon} text={text} sub={sub} />
        ))}
      </div>
    </div>
  );
}

// ─── SLIDE 3 — Market ─────────────────────────────────────────────────
function Slide3() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 70% 80%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      <Chip gold>הזדמנות</Chip>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '12px 0 24px', lineHeight: 1.2 }}>
        שוק ענק.<br /><span style={{ color: GOLD }}>ראשונים בו.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <StatBox val="₪8B+" label="שוק שירותים שנתי בישראל" gold />
        <StatBox val="3M+" label="עצמאיים ופרילנסרים" />
        <StatBox val="70%" label="עסקאות בשחור היום" />
        <StatBox val="0" label="מתחרה ישיר רציני" gold />
      </div>

      <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 14, padding: '13px 16px', border: '1px solid rgba(251,191,36,0.2)', fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
        🚀 <strong style={{ color: GOLD }}>Window of Opportunity:</strong> אנחנו הראשונים בשוק הזה — עם תשתית ב-Production ומשתמשים אמיתיים.
      </div>
    </div>
  );
}

// ─── SLIDE 4 — Solution ───────────────────────────────────────────────
function Slide4() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      <Chip>הפתרון</Chip>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '12px 0 24px', lineHeight: 1.2 }}>
        Joba24 — <span style={{ color: '#60a5fa' }}>שוק גיג</span><br />בזמן אמת
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[
          { icon: '📱', text: 'פרסם ג\'ובה תוך 60 שניות', sub: 'כותרת, מחיר, מיקום — זהו', accent: 'rgba(96,165,250,0.15)' },
          { icon: '⚡', text: 'עובד מגיש בקשה מיידית', sub: 'אישור ידני או אוטומטי לפי בחירה', accent: 'rgba(251,191,36,0.12)' },
          { icon: '📍', text: 'WorkerTracker — GPS בזמן אמת', sub: 'הלקוח רואה את העובד כמו ב-Waze', accent: 'rgba(52,211,153,0.12)' },
          { icon: '💬', text: 'צ\'אט + הודעות דחיפה', sub: 'תקשורת ישירה לכל אורך הדרך', accent: 'rgba(167,139,250,0.12)' },
          { icon: '⭐', text: 'דירוג דו-כיווני + אמינות', sub: 'ציון אמון, badge מאומת, היסטוריה', accent: 'rgba(244,63,94,0.1)' },
        ].map(({ icon, text, sub, accent }) => (
          <Row key={text} icon={icon} text={text} sub={sub} accent={accent} />
        ))}
      </div>
    </div>
  );
}

// ─── SLIDE 5 — Traction ──────────────────────────────────────────────
function Slide5() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 20% 60%, rgba(16,185,129,0.12) 0%, ${DARK_BG} 55%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      <Chip>Product — Live</Chip>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '12px 0 22px', lineHeight: 1.2 }}>
        המוצר רץ.<br /><span style={{ color: '#4ade80' }}>עכשיו.</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {[
          { icon: '✅', text: 'אפליקציה פעילה ב-Production', accent: 'rgba(74,222,128,0.12)' },
          { icon: '🗺️', text: 'מפת ג\'ובות חיה + GPS Tracking', accent: 'rgba(96,165,250,0.12)' },
          { icon: '📖', text: 'Stories, Leaderboard, DailyGoal', accent: 'rgba(251,191,36,0.1)' },
          { icon: '🪙', text: 'מערכת קרדיטים + עסקאות', accent: 'rgba(167,139,250,0.12)' },
          { icon: '🛡️', text: 'מודרציה AI + Verification', accent: 'rgba(244,63,94,0.1)' },
        ].map(({ icon, text, accent }) => (
          <Row key={text} icon={icon} text={text} accent={accent} />
        ))}
      </div>

      <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 14, padding: '11px 14px', border: '1px solid rgba(74,222,128,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
        🔥 לא MVP — מוצר מלא עם עשרות פיצ'רים מושקעים
      </div>
    </div>
  );
}

// ─── SLIDE 6 — Business Model ─────────────────────────────────────────
function Slide6() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      <Chip gold>מודל עסקי</Chip>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '12px 0 22px', lineHeight: 1.2 }}>
        4 מנועי הכנסה.<br /><span style={{ color: GOLD }}>מהיום הראשון.</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[
          { icon: '🪙', text: 'קרדיטים — עמלת הגשה', sub: 'עובד משלם 5% מהמחיר = skin in the game', accent: 'rgba(251,191,36,0.12)' },
          { icon: '📣', text: 'Stories — קידום ממומן', sub: 'ג\'ובה בשורת Stories: 10 קרדיטים ל-24h', accent: 'rgba(167,139,250,0.12)' },
          { icon: '👑', text: 'פרמיום לעובדים', sub: 'Badge + חשיפה מוגברת + כלים מתקדמים', accent: 'rgba(96,165,250,0.12)' },
          { icon: '🏢', text: 'B2B — עסקים בכמות', sub: 'תשלום חודשי קבוע לפרסום בלתי מוגבל', accent: 'rgba(52,211,153,0.12)' },
        ].map(({ icon, text, sub, accent }) => (
          <Row key={text} icon={icon} text={text} sub={sub} accent={accent} />
        ))}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        {[['Unit Economics', 'חיובי מהיום'], ['LTV/CAC', '> 5x'], ['Retention', 'גבוה — Trust']].map(([k, v]) => (
          <div key={k} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: GOLD }}>{v}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SLIDE 7 — Moat ───────────────────────────────────────────────────
function Slide7() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 80% 20%, #1a1060 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      <Chip>יתרון תחרותי</Chip>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '12px 0 22px', lineHeight: 1.2 }}>
        למה <span style={{ color: '#a78bfa' }}>Joba24</span><br />ולא מישהו אחר?
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[
          { icon: '⚡', text: 'מהירות — הגיג Economy עובד במיידי', sub: 'רמת UX של Uber — לא של Fiverr', accent: 'rgba(167,139,250,0.12)' },
          { icon: '🔗', text: 'Network Effect — Two-Sided', sub: 'יותר לקוחות → יותר עובדים → loop', accent: 'rgba(96,165,250,0.12)' },
          { icon: '🛡️', text: 'מערכת אמון מובנית', sub: 'WorkerTracker + Verification + Scoring', accent: 'rgba(52,211,153,0.12)' },
          { icon: '🇮🇱', text: 'First Mover בישראל', sub: 'כבר בפרודקשן — המתחרים ישנים', accent: 'rgba(251,191,36,0.1)' },
          { icon: '🤖', text: 'AI-Powered Matching + Moderation', sub: 'חיבור חכם בין ביקוש להיצע', accent: 'rgba(244,63,94,0.1)' },
        ].map(({ icon, text, sub, accent }) => (
          <Row key={text} icon={icon} text={text} sub={sub} accent={accent} />
        ))}
      </div>
    </div>
  );
}

// ─── SLIDE 8 — Vision ─────────────────────────────────────────────────
function Slide8() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 0%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      <Chip gold>חזון</Chip>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '12px 0 10px', lineHeight: 1.2 }}>
        מישראל —<br />
        <span style={{ color: GOLD }}>לכל שוק גיג בעולם</span>
      </h2>

      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 22, lineHeight: 1.6 }}>
        כל עיר בעולם סובלת מאותה בעיה.<br />Joba24 הוא הפתרון הסקלבילי.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {[
          { year: '2026', text: 'הכנסה חיובית, גדילה אורגנית בישראל' },
          { year: '2027', text: 'Series A · הרחבה לעיר 1 באירופה' },
          { year: '2028', text: 'Platform Play — ×10 עסקאות' },
        ].map(({ year, text }) => (
          <div key={year} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: GOLD, minWidth: 36 }}>{year}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{text}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.3), rgba(251,191,36,0.15))', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(251,191,36,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Total Addressable Market</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: GOLD }}>$400B+</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Global Gig Economy</div>
      </div>
    </div>
  );
}

// ─── SLIDE 9 — Ask/CTA ────────────────────────────────────────────────
function Slide9() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 30% 30%, #0d2e6e 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px' }}>
      {/* Logo centered top */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <img src={LOGO} alt="" style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover' }} />
        <div style={{ fontSize: 26, fontWeight: 900, color: 'white' }}>Joba<span style={{ color: GOLD }}>24</span></div>
      </div>

      <Chip gold>Investment Ask</Chip>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: '12px 0 8px', lineHeight: 1.2 }}>
        מחפשים שותפים<br />
        <span style={{ color: GOLD }}>לצמיחה.</span>
      </h2>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
        Round: Seed · $500K–$1.5M
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          { pct: '40%', text: 'Growth — Marketing & User Acquisition' },
          { pct: '35%', text: 'R&D — AI, Payments, Scale' },
          { pct: '25%', text: 'Operations & Expansion' },
        ].map(({ pct, text }) => (
          <div key={pct} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: GOLD, minWidth: 44 }}>{pct}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{text}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'linear-gradient(135deg, #0d2e6e, #1a6fd4)', borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.15)', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Live App — נסו עכשיו</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: 0.5 }}>joba24.base44.app</div>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        "פרסמתי ג'ובה — עובד הגיע תוך 3 דקות" 🚀
      </div>
    </div>
  );
}

// ─── Slide registry ───────────────────────────────────────────────────
const SLIDES = [
  { id: 'cover',    component: <Slide1 /> },
  { id: 'problem',  component: <Slide2 /> },
  { id: 'market',   component: <Slide3 /> },
  { id: 'solution', component: <Slide4 /> },
  { id: 'product',  component: <Slide5 /> },
  { id: 'business', component: <Slide6 /> },
  { id: 'moat',     component: <Slide7 /> },
  { id: 'vision',   component: <Slide8 /> },
  { id: 'ask',      component: <Slide9 /> },
];

const LABELS = ['Cover', 'Problem', 'Market', 'Solution', 'Product', 'Revenue', 'Moat', 'Vision', 'Ask'];

// ─── Main ──────────────────────────────────────────────────────────────
export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(SLIDES.length - 1, i + 1));

  const handleTouchStart = e => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = e => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    setTouchStart(null);
  };

  const isWide = typeof window !== 'undefined' && window.innerWidth > 500;

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} dir="rtl">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%', maxWidth: 420, height: '100vh', maxHeight: isWide ? 780 : '100vh',
          position: 'relative', overflow: 'hidden',
          boxShadow: isWide ? '0 40px 100px rgba(0,0,0,0.9)' : 'none',
          borderRadius: isWide ? 40 : 0,
        }}
      >
        {/* Slide */}
        <div style={{ width: '100%', height: '100%' }}>
          {SLIDES[current].component}
        </div>

        {/* Tap zones — RTL: right=prev, left=next */}
        {current > 0 && (
          <div onClick={prev} style={{ position: 'absolute', top: 0, right: 0, width: '22%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}
        {current < SLIDES.length - 1 && (
          <div onClick={next} style={{ position: 'absolute', top: 0, left: 0, width: '22%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}

        {/* Arrow buttons — RTL */}
        {current > 0 && (
          <button onClick={prev} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
            <ChevronRight size={16} color="white" />
          </button>
        )}
        {current < SLIDES.length - 1 && (
          <button onClick={next} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
            <ChevronLeft size={16} color="white" />
          </button>
        )}

        {/* Progress bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.1)', zIndex: 40 }}>
          <div style={{ height: '100%', width: `${((current + 1) / SLIDES.length) * 100}%`, background: GOLD, transition: 'width 0.3s ease' }} />
        </div>

        {/* Slide label top-right */}
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', zIndex: 40, pointerEvents: 'none' }}>
          {LABELS[current]}
        </div>

        {/* Dots */}
        <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 30 }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 20 : 5, height: 5, borderRadius: 3, background: i === current ? GOLD : 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.25s' }} />
          ))}
        </div>
      </div>

      {/* Counter */}
      <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 1 }}>
        {current + 1} / {SLIDES.length}
      </div>
    </div>
  );
}