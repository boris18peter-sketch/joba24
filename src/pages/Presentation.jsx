import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PhoneMockup from '@/components/presentation/PhoneMockup';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';
const BANNER = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/05e2e227e_2026-06-25-184231.png';
const FEED_SS = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/671b7126f_2026-06-25-182139.png';
const MAP_SS = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/b3dd362cb_2026-06-25-181044.png';
const FORM_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/19f9214e4_2026-06-26-20558.mov';
const AI_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/1e3412262_2026-06-30-140619.mov';
const MAP_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/07d58199a_2026-06-30-141222.mov';
const AGENT_DASH = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/a7d159985_2026-06-30-135738.png';

const DARK_BG = '#050d1f';
const BLUE = '#1a6fd4';
const GOLD = '#fbbf24';

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: accent || 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: 'white', fontSize: 12.5, lineHeight: 1.3 }}>{text}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatBox({ val, label, gold }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: gold ? GOLD : '#60a5fa', letterSpacing: -1 }}>{val}</div>
      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function StepBadge({ num, label, active }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: active ? `linear-gradient(135deg, ${BLUE}, ${GOLD})` : 'rgba(255,255,255,0.08)',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 900, color: 'white',
      }}>{num}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: active ? 'white' : 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════
function Slide1() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 30% 20%, #0d2e6e 0%, ${DARK_BG} 65%)`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,212,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <img src={LOGO} alt="" style={{ position: 'absolute', top: 32, right: 24, width: 44, height: 44, borderRadius: 13, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', top: 24, left: 24, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: 2 }}>SEED · 2026</div>

      <img src={BANNER} alt="Joba24" style={{ position: 'absolute', top: 76, left: 12, width: 90, borderRadius: 10, opacity: 0.85, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        <Chip gold>The Real-Time Marketplace for Local Work</Chip>
        <div style={{ marginTop: 12, fontSize: 44, fontWeight: 900, color: 'white', letterSpacing: -2, lineHeight: 0.95 }}>
          Need help?<br />Open Joba<span style={{ color: GOLD }}>24</span>.
        </div>
        <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          מצא עובד או עבודה תוך דקות.
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[['₪8B', 'שוק ישראל'], ['3M+', 'פרילנסרים'], ['60s', 'לג\'ובה חיה']].map(([v, l]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: GOLD }}>{v}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 2 — Problem
// ═══════════════════════════════════════════════════════════════════
function Slide2() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip>הבעיה</Chip>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '12px 0 18px', lineHeight: 1.25 }}>
        הדרך למצוא עזרה<br />
        <span style={{ color: '#ef4444' }}>עדיין איטית, מבוזרת ולא אמינה</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <Row icon="📞" text="מתקשרים להרבה בעלי מקצוע" sub="משווים מחירים, מחכים לחזרות" accent="rgba(239,68,68,0.1)" />
        <Row icon="💸" text="מנסים להבין מחיר הוגן" sub="בלי שקיפות, בלי אמינות" accent="rgba(239,68,68,0.1)" />
        <Row icon="⏰" text="ממתינים שעות לעזרה" sub="WhatsApp, פרוטקציות, קבוצות שכונה" accent="rgba(239,68,68,0.1)" />
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.15), rgba(251,191,36,0.1))', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
        <strong style={{ color: GOLD }}>ב-Joba24:</strong> אתה אומר כמה אתה מוכן לשלם — ומי שרוצה, מגיע ומבצע.<br />
        <strong style={{ color: 'white' }}>כוח לאיש הפשוט שצריך עזרה.</strong>
      </div>
      <div style={{ marginTop: 8, background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(74,222,128,0.2)', fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
        ובו בזמן — <strong style={{ color: '#4ade80' }}>עבודה יומיומית</strong> לאלפי בעלי מקצוע, פרילנסרים וצעירים שפותחים את האפליקציה ומרוויחים.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 3 — Opportunity
// ═══════════════════════════════════════════════════════════════════
function Slide3() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 70% 80%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip gold>הזדמנות</Chip>
      <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '12px 0 20px', lineHeight: 1.2 }}>
        ישראל בלבד.<br /><span style={{ color: GOLD }}>ואז — כל עיר בעולם.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <StatBox val="+3M" label="פרילנסרים בישראל" gold />
        <StatBox val="₪8B+" label="שוק שירותים מקומיים" />
        <StatBox val="70%" label="עסקאות עדיין לא דיגיטליות" />
        <StatBox val="0" label="שחקן מוביל בקטגוריה" gold />
      </div>

      <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
        🚀 <strong style={{ color: GOLD }}>Window of Opportunity:</strong> רוב שוק השירותים המקומיים עדיין לא מנוהל בזמן אמת.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 4 — The Experience
// ═══════════════════════════════════════════════════════════════════
function Slide4() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px' }}>
      <Chip>The Experience</Chip>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '10px 0 20px', lineHeight: 1.25 }}>
        From "I need help"<br />
        <span style={{ color: GOLD }}>to "someone is on the way"</span>
      </h2>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 4 }}>
        <StepBadge num={1} label="צריך עזרה" active />
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>←</div>
        <StepBadge num={2} label="מפרסמים" active />
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>←</div>
        <StepBadge num={3} label="מקבלים בקשות" active />
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>←</div>
        <StepBadge num={4} label="בדרך!" active />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
        <PhoneMockup src={FEED_SS} width={110} label="Feed" />
        <PhoneMockup src={MAP_SS} width={110} label="Map" />
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.2), rgba(251,191,36,0.1))', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>תוך דקות. לא שעות.</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>כל המסע — באפליקציה אחת</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 5a — Publishing: Form
// ═══════════════════════════════════════════════════════════════════
function Slide5a() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '28px 16px' }}>
      <Chip>פרסום משימה · דרך 1 מתוך 2</Chip>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '8px 0 4px', lineHeight: 1.25 }}>
        <span style={{ color: '#60a5fa' }}>📝 טופס ידני</span>
      </h2>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
        מילוי שדות — מהיר ומוכר
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <video src={FORM_VIDEO} autoPlay muted loop playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, border: '2px solid rgba(96,165,250,0.2)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 5b — Publishing: AI
// ═══════════════════════════════════════════════════════════════════
function Slide5b() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '28px 16px' }}>
      <Chip gold>פרסום משימה · דרך 2 מתוך 2</Chip>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '8px 0 4px', lineHeight: 1.25 }}>
        <span style={{ color: GOLD }}>✨ AI Publishing</span>
      </h2>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
        פשוט מדברים — כמו ChatGPT
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <video src={AI_VIDEO} autoPlay muted loop playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, border: '2px solid rgba(251,191,36,0.2)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 6 — AI Matching Engine
// ═══════════════════════════════════════════════════════════════════
function Slide6() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 60% 40%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip>AI Matching Engine</Chip>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '10px 0 18px', lineHeight: 1.25 }}>
        לא פיד רגיל.<br /><span style={{ color: '#60a5fa' }}>המערכת מדרגת חכם.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { icon: '📍', text: 'מרחק גיאוגרפי' },
          { icon: '🎯', text: 'ניסיון בקטגוריה' },
          { icon: '🛡️', text: 'אמינות ודירוג' },
          { icon: '⭐', text: 'היסטוריית ביצועים' },
          { icon: '🏷️', text: 'התאמת קטגוריה' },
          { icon: '📊', text: 'מוניטין ציבורי' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 15 }}>{icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(96,165,250,0.08)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(96,165,250,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: 600, lineHeight: 1.5 }}>
        המערכת מתאימה לכל עובד את המשימות <strong style={{ color: '#60a5fa' }}>הכי רלוונטיות אליו</strong><br />כדי ליצור כמה שיותר matches.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 7 — Liquidity Visibility
// ═══════════════════════════════════════════════════════════════════
function Slide7() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '28px 16px' }}>
      <Chip gold>Liquidity</Chip>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '8px 0 14px', lineHeight: 1.25 }}>
        עובד רואה<br /><span style={{ color: GOLD }}>עבודות זמינות במפה</span>
      </h2>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, marginBottom: 12 }}>
        <video src={MAP_VIDEO} autoPlay muted loop playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        {['פותח מפה', 'רואה משימות', 'מגיש בקשה'].map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>←</span>}
            <span style={{ fontSize: 12, fontWeight: 700, color: i === 2 ? GOLD : 'rgba(255,255,255,0.6)' }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 8 — Trust Layer (Moat)
// ═══════════════════════════════════════════════════════════════════
function Slide8() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 80% 20%, #1a1060 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip>Trust Layer</Chip>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '10px 0 18px', lineHeight: 1.25 }}>
        Why this becomes<br /><span style={{ color: '#a78bfa' }}>harder to copy every month</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { icon: '✅', text: 'אימות עובדים', accent: 'rgba(74,222,128,0.12)' },
          { icon: '⭐', text: 'דירוגים דו-כיווניים', accent: 'rgba(251,191,36,0.12)' },
          { icon: '🎯', text: 'Worker Score', accent: 'rgba(96,165,250,0.12)' },
          { icon: '📍', text: 'GPS בזמן אמת', accent: 'rgba(52,211,153,0.12)' },
          { icon: '💬', text: 'צ\'אט מובנה', accent: 'rgba(167,139,250,0.12)' },
          { icon: '📸', text: 'תמונות הוכחה', accent: 'rgba(244,63,94,0.1)' },
          { icon: '🤖', text: 'AI Moderation', accent: 'rgba(96,165,250,0.12)' },
          { icon: '🛡️', text: 'Badge מאומת', accent: 'rgba(74,222,128,0.12)' },
        ].map(({ icon, text, accent }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: accent, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 15 }}>{icon}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE — What Makes Us Different
// ═══════════════════════════════════════════════════════════════════
function SlideDiff() {
  return (
    <div dir="rtl" style={{ height: '100%', background: '#0b0c10', display: 'flex', flexDirection: 'column', padding: '28px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <Chip gold>What Makes Us Different</Chip>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 14px', lineHeight: 1.25, textAlign: 'center' }}>
        הלקוח <span style={{ color: GOLD }}>קובע את המחיר.</span> עובדים מתחרים.
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
        {/* מפרסם המשימה */}
        <div style={{ background: '#1c1d22', borderRadius: 14, padding: '12px 10px', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#60a5fa', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' }}>מפרסם המשימה</div>
          {[
            { icon: '💰', text: 'קובע את המחיר בעצמו' },
            { icon: '🏆', text: 'עובדים מתחרים על המשימה' },
            { icon: '⭐', text: 'בוחר לפי דירוגים וביקורות' },
            { icon: '🛡️', text: 'מוגן מהונאות וביטולים' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* עובד */}
        <div style={{ background: '#1c1d22', borderRadius: 14, padding: '12px 10px', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: GOLD, letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' }}>עובד</div>
          {[
            { icon: '📱', text: 'פותח אפליקציה ומקבל עבודה' },
            { icon: '🎯', text: 'משימות מותאמות אליו אישית' },
            { icon: '⚡', text: 'הכנסה מיידית ויומית' },
            { icon: '📈', text: 'בונה מוניטין ודירוג' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10, background: 'rgba(251,191,36,0.08)', borderRadius: 99, padding: '8px 16px', border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center', fontSize: 12, fontWeight: 800, color: GOLD }}>
        🏆 תחרות אמיתית = תמחור הוגן · שני צדדים מרוויחים
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 9 — Business Model
// ═══════════════════════════════════════════════════════════════════
function Slide9() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip gold>מודל עסקי</Chip>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '10px 0 18px', lineHeight: 1.25 }}>
        מודל הכנסות<br /><span style={{ color: GOLD }}>פשוט וברור.</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Row icon="🪙" text="עמלת הצלחה על משימות" sub="עובד משלם בג'ובות רק לאחר ביצוע" accent="rgba(251,191,36,0.12)" />
        <Row icon="📦" text="חבילות ג'ובות חד-פעמיות" sub="₪10–₪200 לפי כמות קרדיטים" accent="rgba(96,165,250,0.12)" />
        <Row icon="🔄" text="מנויים חודשיים לעובדים פעילים" sub="₪25–₪200/חודש · חידוש אוטומטי" accent="rgba(52,211,153,0.12)" />
        <Row icon="🚀" text="Boosts ו-Stories לקידום משימות" sub="מפרסמים משלמים לחשיפה מוגברת" accent="rgba(167,139,250,0.12)" />
      </div>

      <div style={{ marginTop: 14, background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(74,222,128,0.2)', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'center' }}>
        שני צדדים משלמים · הכנסה מהיום הראשון
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 10 — Go To Market Phase 1
// ═══════════════════════════════════════════════════════════════════
function Slide10() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 30% 70%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', padding: '28px 16px' }}>
      <Chip>Go To Market · Phase 1</Chip>
      <h2 style={{ fontSize: 21, fontWeight: 900, color: 'white', margin: '8px 0 12px', lineHeight: 1.25 }}>
        סוכנים מגייסים עובדים<br /><span style={{ color: GOLD }}>ומרוויחים עמלות</span>
      </h2>

      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
          {[
            { icon: '👤', text: 'סוכן מגייס עובדים', accent: 'rgba(251,191,36,0.12)' },
            { icon: '💰', text: 'עמלה על רווחי העובדים', accent: 'rgba(74,222,128,0.12)' },
            { icon: '🔗', text: 'Affiliate Program מובנה', accent: 'rgba(96,165,250,0.12)' },
            { icon: '📊', text: 'דשבורד למעקב בזמן אמת', accent: 'rgba(167,139,250,0.12)' },
          ].map(({ icon, text, accent }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: accent, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <img src={AGENT_DASH} alt="Agent Dashboard" style={{ width: 120, borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 36px rgba(0,0,0,0.5)' }} />
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 10, padding: '7px 10px', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🎁</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>קרדיטים חינם על הרשמה + מילוי פרטים</span>
        </div>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.25), rgba(251,191,36,0.12))', borderRadius: 10, padding: '7px 10px', border: '1px solid rgba(251,191,36,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'white' }}>מסה ראשונית → תאוצה → בלי חסם</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 11 — Go To Market Phase 2
// ═══════════════════════════════════════════════════════════════════
function Slide11() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip gold>Go To Market · Phase 2</Chip>
      <h2 style={{ fontSize: 23, fontWeight: 900, color: 'white', margin: '10px 0 16px', lineHeight: 1.25 }}>
        הולכים רק על<br /><span style={{ color: GOLD }}>אזור אחד.</span>
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {['תל אביב', 'רמת גן', 'גבעתיים', 'הרצליה', 'פ"ת'].map(city => (
          <span key={city} style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 20, padding: '6px 14px' }}>{city}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <Row icon="✅" text="כל עובד כבר מוכן" accent="rgba(74,222,128,0.12)" />
        <Row icon="📣" text="מתחילים לפרסם — מקבלים בקשות תוך דקות" accent="rgba(251,191,36,0.12)" />
      </div>

      <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(74,222,128,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, textAlign: 'center' }}>
        לא צריך לבנות Marketplace משני הצדדים.<br />
        <strong style={{ color: '#4ade80' }}>צד אחד כבר מחכה.</strong>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE — Integrations
// ═══════════════════════════════════════════════════════════════════
function SlideIntegrations() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip>Integrations</Chip>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '10px 0 18px', lineHeight: 1.25 }}>
        תשתית טכנולוגית<br /><span style={{ color: GOLD }}>מבוססת ופעילה</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row icon="💳" text="Tranzila" sub="סליקת אשראי · Bit · Apple Pay · Google Pay" accent="rgba(96,165,250,0.12)" />
        <Row icon="🔔" text="Firebase" sub="התראות Push בזמן אמת לכל המשתמשים" accent="rgba(251,191,36,0.12)" />
        <Row icon="🗺️" text="MapBox" sub="מפה דינמית · מיקום עובדים ומשימות" accent="rgba(74,222,128,0.12)" />
      </div>

      <div style={{ marginTop: 14, background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(74,222,128,0.2)', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'center' }}>
        כל האינטגרציות פעילות בProduction ✓
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 12 — Network Effect
// ═══════════════════════════════════════════════════════════════════
function Slide12() {
  const steps = [
    { icon: '👷', text: 'יותר עובדים' },
    { icon: '⚡', text: 'זמן תגובה יורד' },
    { icon: '📢', text: 'יותר מפרסמים' },
    { icon: '📋', text: 'יותר משימות' },
  ];
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 50%, #0d2e6e 0%, ${DARK_BG} 65%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip>Network Effect</Chip>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '10px 0 24px', lineHeight: 1.25, textAlign: 'center' }}>
        הלופ שמנצח<br /><span style={{ color: GOLD }}>בכל עיר.</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {steps.map(({ icon, text }, i) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '80%' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{text}</div>
          </div>
        ))}
        <div style={{ fontSize: 20, color: GOLD, fontWeight: 900 }}>↻</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>וחוזר — חזק יותר בכל סיבוב</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 13 — Traction
// ═══════════════════════════════════════════════════════════════════
function Slide13() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 20% 60%, rgba(16,185,129,0.1) 0%, ${DARK_BG} 55%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px' }}>
      <Chip>Traction</Chip>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '10px 0 18px', lineHeight: 1.25 }}>
        לא MVP.<br /><span style={{ color: '#4ade80' }}>מוצר חי.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <StatBox val="✓" label="סוכנים מגייסים עובדים" gold />
        <StatBox val="✓" label="מוצר חי ב-Production" gold />
        <StatBox val="✓" label="עובדים נרשמים" />
        <StatBox val="✓" label="משימות נסגרות בזמן אמת" />
      </div>

      <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(74,222,128,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textAlign: 'center' }}>
        🔥 עשרות פיצ'רים מושקעים · תשלומים · AI · GPS
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 14 — Vision
// ═══════════════════════════════════════════════════════════════════
function Slide14() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 0%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px', alignItems: 'center', textAlign: 'center' }}>
      <Chip gold>Vision</Chip>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '12px 0 8px', lineHeight: 1.25, maxWidth: 280 }}>
        Joba24 is building the<br /><span style={{ color: GOLD }}>operating system</span><br />for local work.
      </h2>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24, letterSpacing: 0.5 }}>
        Every city. Every task. Real time.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {[
          { flag: '🇮🇱', text: 'ישראל', year: '2026' },
          { flag: '🇪🇺', text: 'אירופה', year: '2027' },
          { flag: '🇺🇸', text: 'ארה"ב', year: '2028' },
          { flag: '🌍', text: 'Every City', year: '→' },
        ].map(({ flag, text, year }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', width: '80%', margin: '0 auto' }}>
            <span style={{ fontSize: 18 }}>{flag}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white', flex: 1, textAlign: 'right' }}>{text}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: GOLD }}>{year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 15 — Why Now
// ═══════════════════════════════════════════════════════════════════
function Slide15() {
  return (
    <div dir="rtl" style={{ height: '100%', background: '#0b0c0f', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 24px', alignItems: 'center', textAlign: 'center' }}>
      <Chip>Why Now</Chip>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '12px 0 4px', lineHeight: 1.25 }}>
        כל תעשייה עברה את המהפכה שלה.
      </h2>
      <div style={{ fontSize: 13, color: '#888991', marginBottom: 22 }}>
        עכשיו תורם של המשימות היומיומיות.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {[
          { old: 'Taxi', neu: 'Uber', highlight: false },
          { old: 'Food', neu: 'Wolt', highlight: false },
          { old: 'Hotels', neu: 'Airbnb', highlight: false },
          { old: 'Shopping', neu: 'Amazon', highlight: false },
          { old: 'Tasks', neu: 'Joba24', highlight: true },
        ].map(({ old, neu, highlight }) => (
          <div key={old} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            padding: '11px 16px', borderRadius: 12,
            background: highlight ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
            border: highlight ? '1px solid rgba(251,191,36,0.4)' : '1px solid #26272e',
            boxShadow: highlight ? '0 0 20px rgba(251,191,36,0.1)' : 'none',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{old}</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>→</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: highlight ? GOLD : 'white' }}>{neu}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE REGISTRY
// ═══════════════════════════════════════════════════════════════════
const SLIDES = [
  { id: 'cover',       component: <Slide1 /> },
  { id: 'problem',     component: <Slide2 /> },
  { id: 'market',      component: <Slide3 /> },
  { id: 'experience',  component: <Slide4 /> },
  { id: 'publish-form', component: <Slide5a /> },
  { id: 'publish-ai',  component: <Slide5b /> },
  { id: 'matching',    component: <Slide6 /> },
  { id: 'liquidity',   component: <Slide7 /> },
  { id: 'trust',       component: <Slide8 /> },
  { id: 'different',   component: <SlideDiff /> },
  { id: 'revenue',     component: <Slide9 /> },
  { id: 'gtm1',        component: <Slide10 /> },
  { id: 'gtm2',        component: <Slide11 /> },
  { id: 'network',     component: <Slide12 /> },
  { id: 'integrations', component: <SlideIntegrations /> },
  { id: 'traction',    component: <Slide13 /> },
  { id: 'vision',      component: <Slide14 /> },
  { id: 'why-now',     component: <Slide15 /> },
];

const LABELS = ['Cover', 'Problem', 'Market', 'Experience', 'Form', 'AI Publish', 'Matching', 'Liquidity', 'Trust', 'Different', 'Revenue', 'GTM 1', 'GTM 2', 'Network', 'Integrations', 'Traction', 'Vision', 'Why Now'];

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
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
        <div style={{ width: '100%', height: '100%' }}>
          {SLIDES[current].component}
        </div>

        {current > 0 && (
          <div onClick={prev} style={{ position: 'absolute', top: 0, right: 0, width: '22%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}
        {current < SLIDES.length - 1 && (
          <div onClick={next} style={{ position: 'absolute', top: 0, left: 0, width: '22%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}

        {current > 0 && (
          <button onClick={prev} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
            <ChevronRight size={15} color="white" />
          </button>
        )}
        {current < SLIDES.length - 1 && (
          <button onClick={next} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
            <ChevronLeft size={15} color="white" />
          </button>
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.1)', zIndex: 40 }}>
          <div style={{ height: '100%', width: `${((current + 1) / SLIDES.length) * 100}%`, background: GOLD, transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', zIndex: 40, pointerEvents: 'none' }}>
          {LABELS[current]}
        </div>

        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 30 }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 18 : 4, height: 4, borderRadius: 3, background: i === current ? GOLD : 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.25s' }} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 1 }}>
        {current + 1} / {SLIDES.length}
      </div>
    </div>
  );
}