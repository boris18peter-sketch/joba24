import { useState, useEffect } from 'react';
import PhoneMockup from '@/components/presentation/PhoneMockup';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';
const BANNER = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/05e2e227e_2026-06-25-184231.png';
const FEED_SS = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/671b7126f_2026-06-25-182139.png';
const MAP_SS = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/b3dd362cb_2026-06-25-181044.png';
const FORM_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/19f9214e4_2026-06-26-20558.mov';
const AI_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/1e3412262_2026-06-30-140619.mov';
const MAP_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/07d58199a_2026-06-30-141222.mov';
const AGENT_DASH = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/a7d159985_2026-06-30-135738.png';
const DAILY_GOAL_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/ca8b68ce3_2026-06-30-163701.mov';
const LEADERBOARD_SS = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/e061865c5_2026-06-30-163958.png';
const DEMO_CLIENT_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/38a5f8cd6_WhatsAppVideo2026-06-30at175043.mp4';
const DEMO_WORKER_VIDEO = 'https://media.base44.com/videos/public/69e6bdb4986a04a256653a23/303030594_WhatsAppVideo2026-06-30at174456.mp4';

const DARK_BG = '#050d1f';
const BLUE = '#1a6fd4';
const GOLD = '#fbbf24';

// ── Responsive font sizes ──
const FS = {
  chip:   'clamp(11px, 1.3vw, 14px)',
  h2:     'clamp(22px, 2.8vw, 32px)',
  h2sm:   'clamp(20px, 2.5vw, 28px)',
  body:   'clamp(13px, 1.6vw, 17px)',
  bodySm: 'clamp(12px, 1.4vw, 15px)',
  small:  'clamp(10px, 1.2vw, 13px)',
  stat:   'clamp(22px, 2.8vw, 32px)',
  micro:  'clamp(9px, 1.1vw, 12px)',
};
const PAD = 'clamp(28px, 4vw, 48px) clamp(18px, 3vw, 36px)';

function Chip({ children, gold }) {
  return (
    <span dir="auto" style={{
      display: 'inline-block', fontSize: FS.chip, fontWeight: 800, letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: gold ? GOLD : '#93c5fd',
      background: gold ? 'rgba(251,191,36,0.1)' : 'rgba(147,197,253,0.1)',
      border: `1px solid ${gold ? 'rgba(251,191,36,0.3)' : 'rgba(147,197,253,0.25)'}`,
      borderRadius: 20, padding: '5px 14px',
    }}>{children}</span>
  );
}

function Row({ text, sub, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'rgba(255,255,255,0.05)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent ? accent.replace('0.12', '0.5').replace('0.1', '0.4') : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: 'white', fontSize: FS.body, lineHeight: 1.3 }}>{text}</div>
        {sub && <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatBox({ val, label, gold }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: FS.stat, fontWeight: 900, color: gold ? GOLD : '#60a5fa', letterSpacing: -1 }}>{val}</div>
      <div style={{ fontSize: FS.small, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function StepBadge({ num, label, active }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      <div style={{
        width: 'clamp(32px, 4vw, 44px)', height: 'clamp(32px, 4vw, 44px)', borderRadius: '50%',
        background: active ? `linear-gradient(135deg, ${BLUE}, ${GOLD})` : 'rgba(255,255,255,0.08)',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'clamp(13px, 1.5vw, 17px)', fontWeight: 900, color: 'white',
      }}>{num}</div>
      <div style={{ fontSize: FS.small, fontWeight: 700, color: active ? 'white' : 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════
function Slide1() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 'clamp(18px, 2.5vw, 32px)', right: 'clamp(16px, 2.5vw, 32px)', fontSize: 'clamp(13px, 1.8vw, 18px)', fontWeight: 700, color: 'white', letterSpacing: 1, zIndex: 10 }}>בס״ד</div>
      <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/e7e79fb56_2026-07-01-130422.png" alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 2 — Problem
// ═══════════════════════════════════════════════════════════════════
function Slide2() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>הבעיה</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        הדרך למצוא עזרה<br />
        <span style={{ color: '#ef4444' }}>עדיין איטית, מבוזרת ולא אמינה</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <Row text="מתקשרים להרבה בעלי מקצוע" sub="משווים מחירים, מחכים לחזרות" accent="rgba(239,68,68,0.12)" />
        <Row text="מנסים להבין מחיר הוגן" sub="בלי שקיפות, בלי אמינות" accent="rgba(239,68,68,0.12)" />
        <Row text="ממתינים שעות לעזרה" sub="WhatsApp, פרוטקציות, קבוצות שכונה" accent="rgba(239,68,68,0.12)" />
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.15), rgba(251,191,36,0.1))', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(251,191,36,0.2)', fontSize: FS.body, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
        <strong style={{ color: GOLD }}>ב-Joba24:</strong> אתה מגדיר את המשימה וכמה אתה מוכן לשלם — מי שרוצה מגיש בקשה, אתה מאשר את העובד המתאים, הוא מגיע ומבצע.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 3 — Opportunity
// ═══════════════════════════════════════════════════════════════════
function Slide3() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 70% 80%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip gold>הזדמנות</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.2 }}>
        ישראל בלבד.<br /><span style={{ color: GOLD }}>ואז — כל עיר בעולם.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatBox val="450K" label="פרילנסרים בישראל" gold />
        <StatBox val="₪20B+" label="שוק שירותים מקומיים במגזר הפרטי" />
        <StatBox val="0" label="שחקן מוביל בקטגוריה" gold />
      </div>

      <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(251,191,36,0.2)', fontSize: FS.body, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
        <strong style={{ color: GOLD }}>Window of Opportunity:</strong> רוב שוק השירותים המקומיים עדיין לא מנוהל בזמן אמת.<br />
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>עם התפתחות ה-AI, יותר ויותר אנשים מצטרפים לעבודות ידניות ונכנסים לעולם של שוק שירותים מקומיים.</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 4 — The Experience
// ═══════════════════════════════════════════════════════════════════
function Slide4() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>The Experience</Chip>
      <h2 dir="ltr" style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25, textAlign: 'right' }}>
        From "I need help"<br />
        <span style={{ color: GOLD }}>to "someone is on the way"</span>
      </h2>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <StepBadge num={1} label="צריך עזרה" active />
        <StepBadge num={2} label="מפרסמים" active />
        <StepBadge num={3} label="מקבלים בקשות" active />
        <StepBadge num={4} label="בדרך!" active />
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0, marginBottom: 12 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
          <div style={{ fontSize: FS.small, fontWeight: 800, color: '#60a5fa', textAlign: 'center', letterSpacing: 0.5 }}>מפרסם המשימה</div>
          <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 0 }}>
            <video src={DEMO_CLIENT_VIDEO} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
          <div style={{ fontSize: FS.small, fontWeight: 800, color: GOLD, textAlign: 'center', letterSpacing: 0.5 }}>העובד</div>
          <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 0 }}>
            <video src={DEMO_WORKER_VIDEO} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.2), rgba(251,191,36,0.1))', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
        <div style={{ fontSize: FS.body, fontWeight: 800, color: 'white' }}>תוך דקות. לא שעות.</div>
        <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>אינטראקציה חיה בין שני הצדדים — באפליקציה אחת</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 5a — Publishing: Form
// ═══════════════════════════════════════════════════════════════════
function Slide5a() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>פרסום משימה · דרך 1 מתוך 2</Chip>
      <h2 style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        <span style={{ color: '#60a5fa' }}>טופס ידני</span>
      </h2>
      <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
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
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip gold>פרסום משימה · דרך 2 מתוך 2</Chip>
      <h2 dir="ltr" style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25, textAlign: 'right' }}>
        <span style={{ color: GOLD }}>AI Publishing</span>
      </h2>
      <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
        פשוט מדברים — כמו ChatGPT
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <video src={AI_VIDEO} autoPlay muted loop playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, border: '2px solid rgba(251,191,36,0.2)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE — The Power (Anything, within minutes)
// ═══════════════════════════════════════════════════════════════════
function SlidePower() {
  const examples = [
    'ברז מדליף', 'מזגן מפסיק', 'הובלת ספה', 'סידור בית',
    'קניות לשבת', 'הקפצת מסמך', 'תיקון חשמל', 'ניקיון חלונות',
    'הרכבת ארון', 'טיפול בכלב', 'מעבר דירה', 'צביעת קיר',
    'סתימת צנרת', 'תליית וילון', 'פינוי פסולת', 'השקיית גינה',
    'הרכבת מיטה', 'תיקון דוד', 'גינון', 'סידור מחסן',
  ];
  const bubbles = examples.map((ex, i) => {
    const left = (i * 37 + 5) % 88;
    const size = 0.8 + (i % 3) * 0.25;
    const duration = 9 + (i % 4) * 3;
    const delay = -(i * 2.1);
    const c = i % 3;
    return { ex, left, size, duration, delay, c };
  });
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 50%, #0d2e6e 0%, ${DARK_BG} 65%)`, display: 'flex', flexDirection: 'column', padding: PAD, alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(110%) scale(0.5); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-520px) scale(1); opacity: 0; }
        }
      `}</style>
      {/* Floating bubbles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {bubbles.map((b, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: -40, left: `${b.left}%`,
            padding: `${Math.round(6 * b.size)}px ${Math.round(14 * b.size)}px`, borderRadius: 99,
            background: b.c === 0 ? 'rgba(251,191,36,0.12)' : b.c === 1 ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${b.c === 0 ? 'rgba(251,191,36,0.3)' : b.c === 1 ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.12)'}`,
            fontSize: `${Math.round(14 * b.size)}px`, fontWeight: 700,
            color: b.c === 0 ? GOLD : b.c === 1 ? '#60a5fa' : 'rgba(255,255,255,0.7)',
            whiteSpace: 'nowrap',
            animation: `floatUp ${b.duration}s linear infinite`,
            animationDelay: `${b.delay}s`,
          }}>{b.ex}</div>
        ))}
      </div>
      {/* Content overlay */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Chip gold>The Power</Chip>
        <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 6px', lineHeight: 1.2, textAlign: 'center', textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
          כל דבר שעולה לך לראש.<br />
          <span style={{ color: GOLD }}>מישהו יבוא תוך דקות.</span>
        </h2>
        <div style={{ fontSize: FS.body, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          לא משנה מה — העזרה מגיעה אליך
        </div>
      </div>
      <div style={{ flex: 1 }} />
      {/* Bottom flow with downward arrows */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', background: 'linear-gradient(135deg, rgba(26,111,212,0.3), rgba(251,191,36,0.15))', borderRadius: 16, padding: '14px 20px', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {['פרסם', 'קבל בקשות', 'אשר'].map((step) => (
          <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: FS.body, fontWeight: 800, color: 'white' }}>{step}</div>
            <div style={{ color: GOLD, fontSize: 16, lineHeight: 1 }}>↓</div>
          </div>
        ))}
        <div style={{ fontSize: FS.body, fontWeight: 900, color: GOLD }}>מישהו בדרך</div>
        <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontWeight: 600, textAlign: 'center' }}>
          הכל תוך דקות. ממש כל דבר.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 6 — AI Matching Engine
// ═══════════════════════════════════════════════════════════════════
function Slide6() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 60% 40%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>AI Matching Engine</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        לא פיד רגיל.<br /><span style={{ color: '#60a5fa' }}>המערכת מדרגת חכם.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          'מרחק גיאוגרפי',
          'ניסיון בקטגוריה',
          'אמינות ודירוג',
          'היסטוריית ביצועים',
          'התאמת קטגוריה',
          'מוניטין ציבורי',
        ].map(text => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
            <span style={{ fontSize: FS.bodySm, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(96,165,250,0.08)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(96,165,250,0.2)', fontSize: FS.bodySm, color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: 600, lineHeight: 1.5 }}>
        המערכת מתאימה לכל עובד את המשימות <strong style={{ color: '#60a5fa' }}>הכי רלוונטיות אליו</strong> כדי ליצור כמה שיותר matches.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 7 — Liquidity Visibility
// ═══════════════════════════════════════════════════════════════════
function Slide7() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip gold>Liquidity</Chip>
      <h2 style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        עובד רואה<br /><span style={{ color: GOLD }}>עבודות זמינות במפה</span>
      </h2>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, marginBottom: 14 }}>
        <video src={MAP_VIDEO} autoPlay muted loop playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
        {['פותח מפה', 'רואה משימות', 'מגיש בקשה'].map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>·</span>}
            <span style={{ fontSize: FS.bodySm, fontWeight: 700, color: i === 2 ? GOLD : 'rgba(255,255,255,0.6)' }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE — Daily Goal + Leaderboard
// ═══════════════════════════════════════════════════════════════════
function SlideDailyGoal() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip gold>מטרת היום</Chip>
      <h2 style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 14px', lineHeight: 1.25 }}>
        העובד קובע יעד<br /><span style={{ color: GOLD }}>והמערכת בונה תוכנית</span>
      </h2>

      <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
        <div style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <video src={DAILY_GOAL_VIDEO} autoPlay muted loop playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, border: '2px solid rgba(251,191,36,0.2)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <img src={LEADERBOARD_SS} alt="Leaderboard" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 36px rgba(0,0,0,0.5)' }} />
        </div>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center', fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
        יעד יומי · תוכנית מותאמת · לוח מובילים
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 8 — Trust Layer (Moat)
// ═══════════════════════════════════════════════════════════════════
function Slide8() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 80% 20%, #1a1060 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>Trust Layer</Chip>
      <h2 dir="ltr" style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25, textAlign: 'right' }}>
        Why this becomes<br /><span style={{ color: '#a78bfa' }}>harder to copy every month</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { text: 'אימות עובדים', accent: 'rgba(74,222,128,0.12)' },
          { text: 'דירוגים דו-כיווניים', accent: 'rgba(251,191,36,0.12)' },
          { text: 'Worker Score', accent: 'rgba(96,165,250,0.12)' },
          { text: 'GPS בזמן אמת', accent: 'rgba(52,211,153,0.12)' },
          { text: 'צ\'אט מובנה', accent: 'rgba(167,139,250,0.12)' },
          { text: 'תמונות הוכחה', accent: 'rgba(244,63,94,0.1)' },
          { text: 'AI Moderation', accent: 'rgba(96,165,250,0.12)' },
          { text: 'Badge מאומת', accent: 'rgba(74,222,128,0.12)' },
        ].map(({ text, accent }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: accent, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <span style={{ fontSize: FS.bodySm, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{text}</span>
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
  const publisherBenefits = [
    { title: 'מהירות שלא הכרת', sub: 'מקבל עזרה תוך דקות — בלי לחכות לחזרות' },
    { title: 'קובע את המחיר בעצמו', sub: 'בלי השוואות, בלי ויכוחים, בלי בזבוז זמן' },
    { title: 'עובדים מתחרים על המשימה', sub: 'בוחר את הכי טוב לפי דירוגים וביקורות' },
    { title: 'מוגן ובטוח', sub: 'תשלום מאובטח, הגנה מהונאות וביטולים' },
  ];
  const workerBenefits = [
    { title: 'משימות בקרבתך', sub: 'התראות חיות על עבודות לידך בזמן אמת' },
    { title: 'הכנסה מיידית', sub: 'מרוויח כסף מהרגע הראשון, כל יום מחדש' },
    { title: 'מותאם אליך אישית', sub: 'המערכת מציגה רק משימות רלוונטיות אליך' },
    { title: 'בונה מוניטין', sub: 'כל משימה מעלה את הדירוג ופותחת דלתות' },
  ];
  return (
    <div dir="rtl" style={{ height: '100%', background: '#0b0c10', display: 'flex', flexDirection: 'column', padding: PAD }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <Chip gold>What Makes Us Different</Chip>
      </div>
      <h2 style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '10px 0 14px', lineHeight: 1.25, textAlign: 'center' }}>
        הלקוח <span style={{ color: GOLD }}>קובע את המחיר.</span> עובדים מתחרים.
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>
        {/* Publisher */}
        <div style={{ background: 'linear-gradient(160deg, rgba(96,165,250,0.1), rgba(28,29,34,0.95))', borderRadius: 18, padding: '18px 16px', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid rgba(96,165,250,0.15)' }}>
            <div style={{ width: 'clamp(28px, 3vw, 36px)', height: 'clamp(28px, 3vw, 36px)', borderRadius: 10, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 900, color: '#60a5fa', flexShrink: 0 }}>1</div>
            <div style={{ fontSize: 'clamp(13px, 1.5vw, 17px)', fontWeight: 900, color: '#60a5fa', letterSpacing: 0.3 }}>מפרסם המשימה</div>
          </div>
          {publisherBenefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{b.title}</div>
              <div style={{ fontSize: 'clamp(11px, 1.3vw, 14px)', fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: 1.35 }}>{b.sub}</div>
            </div>
          ))}
        </div>

        {/* Worker */}
        <div style={{ background: 'linear-gradient(160deg, rgba(251,191,36,0.1), rgba(28,29,34,0.95))', borderRadius: 18, padding: '18px 16px', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
            <div style={{ width: 'clamp(28px, 3vw, 36px)', height: 'clamp(28px, 3vw, 36px)', borderRadius: 10, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 900, color: GOLD, flexShrink: 0 }}>2</div>
            <div style={{ fontSize: 'clamp(13px, 1.5vw, 17px)', fontWeight: 900, color: GOLD, letterSpacing: 0.3 }}>העובד</div>
          </div>
          {workerBenefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{b.title}</div>
              <div style={{ fontSize: 'clamp(11px, 1.3vw, 14px)', fontWeight: 500, color: 'rgba(255,255,255,0.5)', lineHeight: 1.35 }}>{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, background: 'rgba(251,191,36,0.08)', borderRadius: 99, padding: '10px 20px', border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center', fontSize: FS.bodySm, fontWeight: 800, color: GOLD }}>
        תחרות אמיתית = תמחור הוגן · שני צדדים מרוויחים
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 9 — Business Model
// ═══════════════════════════════════════════════════════════════════
function Slide9() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip gold>מודל עסקי</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        מודל הכנסות<br /><span style={{ color: GOLD }}>פשוט וברור.</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row text="עמלת הצלחה על משימות" sub="עובד משלם בג'ובות רק לאחר ביצוע" accent="rgba(251,191,36,0.12)" />
        <Row text="חבילות ג'ובות חד-פעמיות" sub="₪10–₪200 לפי כמות קרדיטים" accent="rgba(96,165,250,0.12)" />
        <Row text="מנויים חודשיים לעובדים פעילים" sub="₪25–₪200/חודש · חידוש אוטומטי" accent="rgba(52,211,153,0.12)" />
        <Row text="Boosts ו-Stories לקידום משימות" sub="מפרסמים משלמים לחשיפה מוגברת" accent="rgba(167,139,250,0.12)" />
      </div>

      <div style={{ marginTop: 16, background: 'rgba(74,222,128,0.08)', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(74,222,128,0.2)', fontSize: FS.bodySm, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'center' }}>
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
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 30% 70%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>Go To Market · Phase 1</Chip>
      <h2 style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        סוכנים מגייסים עובדים<br /><span style={{ color: GOLD }}>ומרוויחים עמלות</span>
      </h2>

      <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          {[
            { text: 'סוכן מגייס עובדים', accent: 'rgba(251,191,36,0.12)' },
            { text: 'עמלה על רווחי העובדים', accent: 'rgba(74,222,128,0.12)' },
            { text: 'Affiliate Program מובנה', accent: 'rgba(96,165,250,0.12)' },
            { text: 'דשבורד למעקב בזמן אמת', accent: 'rgba(167,139,250,0.12)' },
          ].map(({ text, accent }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: accent, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span style={{ fontSize: FS.bodySm, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <img src={AGENT_DASH} alt="Agent Dashboard" style={{ width: 140, borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 36px rgba(0,0,0,0.5)' }} />
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(74,222,128,0.2)' }}>
          <div style={{ fontSize: FS.bodySm, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
            <strong style={{ color: '#4ade80' }}>5+ סוכנים צעירים</strong> מוכנים לצרף ידנית בעלי מקצוע ועובדים באזור המרכז.
          </div>
          <div style={{ fontSize: FS.bodySm, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginTop: 4 }}>
            דרך סוכן 1 כבר <strong style={{ color: GOLD }}>200+ בעלי מקצוע</strong> בתל אביב והמרכז מוכנים להוריד את האפליקציה.
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.25), rgba(251,191,36,0.12))', borderRadius: 12, padding: '10px 16px', border: '1px solid rgba(251,191,36,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: FS.body, fontWeight: 900, color: 'white' }}>מי לא רוצה עוד עבודה?</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 11 — Go To Market Phase 2
// ═══════════════════════════════════════════════════════════════════
function Slide11() {
  const cities = [
    { name: 'תל אביב', x: 50, y: 50, isCenter: true },
    { name: 'רמת גן', x: 67, y: 54 },
    { name: 'גבעתיים', x: 68, y: 63 },
    { name: 'הרצליה', x: 40, y: 28 },
    { name: 'פ"ת', x: 25, y: 47 },
  ];
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip gold>Go To Market · Phase 2</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 14px', lineHeight: 1.25 }}>
        מתחילים ב<span style={{ color: GOLD }}>תל אביב</span><br />ומתרחבים למרכז.
      </h2>

      <div style={{ flex: 1, position: 'relative', minHeight: 0, background: 'radial-gradient(ellipse at center, rgba(26,111,212,0.1) 0%, transparent 70%)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <style>{`
          @keyframes bubbleExpand {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            100% { transform: translate(-50%, -50%) scale(18); opacity: 0; }
          }
          @keyframes cityAppear {
            0%, 35% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            55%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>

        {/* Expanding rings from Tel Aviv */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 30, height: 30, borderRadius: '50%',
            border: `2px solid ${GOLD}`,
            animation: `bubbleExpand 3.5s ease-out infinite ${i * 1.15}s`,
          }} />
        ))}

        {/* City dots and labels */}
        {cities.map((city, i) => (
          <div key={city.name} style={{
            position: 'absolute', left: `${city.x}%`, top: `${city.y}%`,
            animation: city.isCenter ? 'none' : `cityAppear 3.5s ease-out infinite ${i * 0.6}s`,
            opacity: city.isCenter ? 1 : undefined,
            zIndex: city.isCenter ? 3 : 2,
          }}>
            <div style={{
              width: city.isCenter ? 18 : 11, height: city.isCenter ? 18 : 11,
              borderRadius: '50%',
              background: city.isCenter ? GOLD : '#60a5fa',
              boxShadow: city.isCenter ? `0 0 20px ${GOLD}` : '0 0 8px rgba(96,165,250,0.4)',
              margin: '0 auto',
            }} />
            <div style={{
              fontSize: 'clamp(11px, 1.3vw, 14px)', fontWeight: 800,
              color: city.isCenter ? GOLD : 'rgba(255,255,255,0.7)',
              textAlign: 'center', marginTop: 5, whiteSpace: 'nowrap',
            }}>{city.name}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, background: 'rgba(74,222,128,0.08)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(74,222,128,0.2)', fontSize: FS.bodySm, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, textAlign: 'center' }}>
        בועה אחת שמתנפחת — מתל אביב לשאר הערים.<br />
        <strong style={{ color: '#4ade80' }}>צד אחד כבר מחכה.</strong>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 11b — Go To Market Phase 3 (The Master Plan)
// ═══════════════════════════════════════════════════════════════════
function Slide11b() {
  const steps = [
    { num: '1', title: 'גיוס מסיבי לפני ההשקה', desc: 'מכל המקצועות והתחומים', accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)' },
    { num: '2', title: 'מורידים · מאשרים התראות · ממלאים פרטים', desc: 'מוכנים לקבל עבודות', accent: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.3)' },
    { num: '3', title: 'פרסום אגרסיבי למפרסמים', desc: 'ביום אחד — שני הצדדים נפגשים', accent: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.3)' },
  ];

  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 0%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip gold>Go To Market · Phase 3</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 4px', lineHeight: 1.25 }}>
        התוכנית.<br /><span style={{ color: GOLD }}>3,000 עובדים מוכנים.</span>
      </h2>
      <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 14 }}>
        מכל המקצועות — לפני ההשקה.
      </div>

      {/* Goal hero number */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(26,111,212,0.08))',
        borderRadius: 18, padding: '18px 20px', border: '1px solid rgba(251,191,36,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14,
      }}>
        <div style={{
          fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: GOLD,
          letterSpacing: -2, lineHeight: 1,
          textShadow: '0 0 30px rgba(251,191,36,0.4)',
        }}>3,000</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: FS.body, fontWeight: 800, color: 'white' }}>בעלי מקצוע</div>
          <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)' }}>מוכנים לעבודה</div>
        </div>
      </div>

      {/* Three steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 14,
            background: step.bg, border: `1px solid ${step.border}`,
            flex: 1, minHeight: 0,
          }}>
            <div style={{
              width: 'clamp(32px, 4vw, 42px)', height: 'clamp(32px, 4vw, 42px)', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${step.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(15px, 1.8vw, 20px)', fontWeight: 900, color: step.accent,
              flexShrink: 0,
            }}>{step.num}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{step.title}</div>
              <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 2 }}>{step.desc}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                <div style={{ width: 2, height: 8, background: 'rgba(255,255,255,0.1)', margin: '0 auto' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Why easy + why attractive */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div style={{
          flex: 1, background: 'rgba(74,222,128,0.08)', borderRadius: 12,
          padding: '12px 14px', border: '1px solid rgba(74,222,128,0.2)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: FS.bodySm, fontWeight: 800, color: '#4ade80', lineHeight: 1.3 }}>קל לגיוס</div>
          <div style={{ fontSize: 'clamp(11px, 1.3vw, 13px)', color: 'rgba(255,255,255,0.55)', fontWeight: 600, lineHeight: 1.35 }}>
            יש סיבה טובה להוריד — הכנסה נוספת מיידית
          </div>
        </div>
        <div style={{
          flex: 1, background: 'rgba(251,191,36,0.08)', borderRadius: 12,
          padding: '12px 14px', border: '1px solid rgba(251,191,36,0.2)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{ fontSize: FS.bodySm, fontWeight: 800, color: GOLD, lineHeight: 1.3 }}>גישה ללקוחות</div>
          <div style={{ fontSize: 'clamp(11px, 1.3vw, 13px)', color: 'rgba(255,255,255,0.55)', fontWeight: 600, lineHeight: 1.35 }}>
            קבועים פוטנציאליים · עבודות נוספות
          </div>
        </div>
      </div>

      {/* Bottom punchline */}
      <div style={{
        marginTop: 10, background: 'linear-gradient(135deg, rgba(26,111,212,0.3), rgba(251,191,36,0.15))',
        borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(251,191,36,0.3)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: FS.body, fontWeight: 900, color: 'white' }}>
          מי לא ירצה עוד עבודה?
        </div>
        <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: 3 }}>
          תוכנית עם סיבה אמיתית להורדה — <strong style={{ color: GOLD }}>מנצחת מההתחלה.</strong>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE — Integrations
// ═══════════════════════════════════════════════════════════════════
function SlideIntegrations() {
  return (
    <div dir="rtl" style={{ height: '100%', background: DARK_BG, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>Integrations</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        תשתית טכנולוגית<br /><span style={{ color: GOLD }}>מבוססת ופעילה</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row text="Tranzila" sub="סליקת אשראי · Bit · Apple Pay · Google Pay" accent="rgba(96,165,250,0.12)" />
        <Row text="Firebase" sub="התראות Push בזמן אמת לכל המשתמשים" accent="rgba(251,191,36,0.12)" />
        <Row text="MapBox" sub="מפה דינמית · מיקום עובדים ומשימות" accent="rgba(74,222,128,0.12)" />
      </div>

      <div style={{ marginTop: 16, background: 'rgba(74,222,128,0.08)', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(74,222,128,0.2)', fontSize: FS.bodySm, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'center' }}>
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
    'יותר עובדים',
    'זמן תגובה יורד',
    'יותר מפרסמים',
    'יותר משימות',
  ];
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 50%, #0d2e6e 0%, ${DARK_BG} 65%)`, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>Network Effect</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25, textAlign: 'center' }}>
        הלופ שמנצח<br /><span style={{ color: GOLD }}>בכל עיר.</span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {steps.map((text, i) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '80%' }}>
            <div style={{ width: 'clamp(36px, 4vw, 44px)', height: 'clamp(36px, 4vw, 44px)', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 900, color: GOLD, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: FS.body, fontWeight: 700, color: 'white' }}>{text}</div>
          </div>
        ))}
        <div style={{ fontSize: 'clamp(18px, 2.2vw, 24px)', color: GOLD, fontWeight: 900, marginTop: 4 }}>↻</div>
        <div style={{ fontSize: FS.bodySm, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>וחוזר — חזק יותר בכל סיבוב</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 13 — Traction
// ═══════════════════════════════════════════════════════════════════
function Slide13() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 20% 60%, rgba(16,185,129,0.1) 0%, ${DARK_BG} 55%)`, display: 'flex', flexDirection: 'column', padding: PAD }}>
      <Chip>Traction</Chip>
      <h2 style={{ fontSize: FS.h2, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25 }}>
        לא MVP.<br /><span style={{ color: '#4ade80' }}>מוצר חי.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <StatBox val="✓" label="סוכנים מגייסים עובדים" gold />
        <StatBox val="✓" label="מוצר חי ב-Production" gold />
        <StatBox val="✓" label="עובדים נרשמים" />
        <StatBox val="✓" label="משימות נסגרות בזמן אמת" />
      </div>

      <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(74,222,128,0.2)', fontSize: FS.bodySm, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textAlign: 'center' }}>
        עשרות פיצ'רים מושקעים · תשלומים · AI · GPS
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE 14 — Vision
// ═══════════════════════════════════════════════════════════════════
function Slide14() {
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 0%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', padding: PAD, alignItems: 'center', textAlign: 'center' }}>
      <Chip gold>Vision</Chip>
      <h2 dir="ltr" style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 16px', lineHeight: 1.25, maxWidth: 'clamp(240px, 30vw, 340px)' }}>
        Joba24 is building the<br /><span style={{ color: GOLD }}>operating system</span><br />for local work.
      </h2>
      <div dir="ltr" style={{ fontSize: FS.body, color: 'rgba(255,255,255,0.5)', marginBottom: 'clamp(18px, 2.5vw, 28px)', letterSpacing: 0.5 }}>
        Every city. Every task. Real time.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {[
          { flag: '🇮🇱', text: 'ישראל', year: '2026' },
          { flag: '🇪🇺', text: 'אירופה', year: '2027' },
          { flag: '🇺🇸', text: 'ארה"ב', year: '2028' },
          { flag: '🌍', text: 'Every City', year: '→' },
        ].map(({ flag, text, year }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', width: '80%', margin: '0 auto' }}>
            <span style={{ fontSize: 'clamp(16px, 2vw, 22px)' }}>{flag}</span>
            <span style={{ fontSize: FS.body, fontWeight: 700, color: 'white', flex: 1, textAlign: 'right' }}>{text}</span>
            <span style={{ fontSize: FS.bodySm, fontWeight: 800, color: GOLD }}>{year}</span>
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
    <div dir="rtl" style={{ height: '100%', background: '#0b0c0f', display: 'flex', flexDirection: 'column', padding: PAD, alignItems: 'center', textAlign: 'center' }}>
      <Chip>Why Now</Chip>
      <h2 style={{ fontSize: FS.h2sm, fontWeight: 900, color: 'white', margin: '12px 0 8px', lineHeight: 1.25 }}>
        כל תעשייה עברה את המהפכה שלה.
      </h2>
      <div style={{ fontSize: FS.body, color: '#888991', marginBottom: 'clamp(18px, 2.5vw, 26px)' }}>
        עכשיו תורם של המשימות היומיומיות.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {[
          { old: 'Taxi', neu: 'Uber', highlight: false },
          { old: 'Food', neu: 'Wolt', highlight: false },
          { old: 'Hotels', neu: 'Airbnb', highlight: false },
          { old: 'Shopping', neu: 'Amazon', highlight: false },
          { old: 'Tasks', neu: 'Joba24', highlight: true },
        ].map(({ old, neu, highlight }) => (
          <div key={old} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            padding: '14px 20px', borderRadius: 14,
            background: highlight ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
            border: highlight ? '1px solid rgba(251,191,36,0.4)' : '1px solid #26272e',
            boxShadow: highlight ? '0 0 20px rgba(251,191,36,0.1)' : 'none',
          }}>
            <span style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', fontWeight: 900, color: highlight ? GOLD : 'white' }}>{neu}</span>
            <span style={{ fontSize: FS.body, color: 'rgba(255,255,255,0.2)' }}>→</span>
            <span style={{ fontSize: FS.body, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{old}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE — QR Code (Call to Action)
// ═══════════════════════════════════════════════════════════════════
function SlideQR() {
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https%3A%2F%2Fjoba24.com&bgcolor=ffffff&color=050d1f&margin=0';
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 30%, #0d2e6e 0%, ${DARK_BG} 60%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: PAD, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Glow effect */}
      <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Headline */}
      <h2 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1, textAlign: 'center', letterSpacing: -1.5, textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
        יאללה<br /><span style={{ color: GOLD }}>לעבודה.</span>
      </h2>
      {/* Motivation message */}
      <div style={{ fontSize: 'clamp(15px, 2.2vw, 21px)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: 'clamp(16px, 2.5vw, 24px) 0', textAlign: 'center', lineHeight: 1.4, maxWidth: '88%' }}>
        Joba24 תהיה ה<span style={{ color: GOLD, fontWeight: 900 }}>Uber</span> של המשימות והעזרות.
      </div>
      {/* QR Code */}
      <div style={{
        background: 'white', borderRadius: 24, padding: 'clamp(14px, 2vw, 22px)',
        boxShadow: '0 0 60px rgba(251,191,36,0.4), 0 8px 32px rgba(0,0,0,0.5)',
        border: '2px solid rgba(251,191,36,0.2)',
      }}>
        <img src={qrUrl} alt="QR — Joba24" style={{ width: 'clamp(160px, 22vw, 230px)', height: 'clamp(160px, 22vw, 230px)', display: 'block' }} />
      </div>
      {/* URL */}
      <div style={{ marginTop: 'clamp(14px, 2vw, 20px)', fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 900, color: GOLD, letterSpacing: -0.5 }}>
        joba24.com
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SLIDE — Revenue Engine (Every Worker = Monthly Revenue)
// ═══════════════════════════════════════════════════════════════════
function SlideRevenueEngine() {
  const flow = [
    { icon: '👷', text: 'עובד מצטרף' },
    { icon: '📲', text: 'פותח כל בוקר' },
    { icon: '📍', text: 'מקבל משימות' },
    { icon: '✅', text: 'מבצע' },
    { icon: '⭐', text: 'בונה מוניטין' },
    { icon: '💰', text: 'מרוויח חודשית' },
  ];
  const stats = [
    { icon: '🔧', role: 'אינסטלטור', amount: '₪30,000' },
    { icon: '⚡', role: 'חשמלאי', amount: '₪25,000' },
    { icon: '🚛', role: 'מוביל', amount: '₪35,000' },
    { icon: '🧹', role: 'מנקה', amount: '₪18,000' },
  ];
  const prog = [
    { count: '1', label: 'עובד', sub: 'עסקאות חודשיות' },
    { count: '100', label: 'עובדים', sub: 'מאות עבודות/חודש' },
    { count: '1K', label: 'עובדים', sub: 'מיליוני ₪/שנה' },
    { count: '10K', label: 'עובדים', sub: 'שוק עבודה ארצי' },
  ];
  return (
    <div dir="rtl" style={{ height: '100%', background: `radial-gradient(ellipse at 50% 25%, #0d2e6e 0%, ${DARK_BG} 65%)`, display: 'flex', flexDirection: 'column', padding: 'clamp(14px, 2.2vw, 26px) clamp(12px, 2vw, 22px)', overflow: 'hidden' }}>
      <style>{`@keyframes arrowPulse { 0%,100%{opacity:0.4;transform:translateX(0)} 50%{opacity:1;transform:translateX(-3px)} }`}</style>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <Chip gold>Revenue Engine</Chip>
        <h2 style={{ fontSize: 'clamp(16px, 2.2vw, 24px)', fontWeight: 900, color: 'white', margin: '8px 0 4px', lineHeight: 1.2 }}>
          כל עובד הוא <span style={{ color: GOLD }}>מנוע הכנסה חודשי</span>
        </h2>
        <div style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, maxWidth: '92%', margin: '0 auto', fontWeight: 600 }}>
          לא לעזור למצוא עבודה אחת — אלא להיות הפלטפורמה שבה אנשים מתפרנסים
        </div>
      </div>

      {/* Section 1: Worker Flow */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, marginBottom: 10, padding: '8px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        {flow.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
              <div style={{ fontSize: 'clamp(13px, 1.6vw, 18px)' }}>{step.icon}</div>
              <div style={{ fontSize: 'clamp(7px, 0.85vw, 9px)', fontWeight: 800, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.1 }}>{step.text}</div>
            </div>
            {i < flow.length - 1 && (
              <div style={{ color: GOLD, fontSize: 'clamp(8px, 1vw, 11px)', fontWeight: 900, animation: `arrowPulse 1.4s ease-in-out infinite ${i * 0.15}s` }}>←</div>
            )}
          </div>
        ))}
      </div>

      {/* Section 2: Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 8px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', transition: 'transform 0.2s' }}>
            <div style={{ fontSize: 'clamp(15px, 1.8vw, 20px)' }}>{s.icon}</div>
            <div style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>{s.role}</div>
            <div style={{ fontSize: 'clamp(15px, 2.2vw, 22px)', fontWeight: 900, color: GOLD, marginTop: 2, letterSpacing: -0.5 }}>₪{s.amount.replace('₪','')}</div>
            <div style={{ fontSize: 'clamp(7px, 0.85vw, 9px)', color: 'rgba(255,255,255,0.35)', marginTop: 2, fontWeight: 600 }}>היקף עבודה חודשי</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 10, fontWeight: 500, lineHeight: 1.3 }}>
        דוגמאות לפוטנציאל ההשתכרות של בעלי מקצוע בפלטפורמה · לא נתוני שוק
      </div>

      {/* Section 3: Progression */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 3, marginBottom: 10 }}>
        {prog.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <div style={{ flex: 1, textAlign: 'center', background: i === prog.length - 1 ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '7px 3px', border: i === prog.length - 1 ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 'clamp(14px, 2vw, 20px)', fontWeight: 900, color: i === prog.length - 1 ? GOLD : '#60a5fa', letterSpacing: -0.5 }}>{p.count}</div>
              <div style={{ fontSize: 'clamp(7px, 0.85vw, 10px)', fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>{p.label}</div>
              <div style={{ fontSize: 'clamp(6px, 0.75vw, 8px)', color: 'rgba(255,255,255,0.4)', marginTop: 2, lineHeight: 1.1, fontWeight: 600 }}>{p.sub}</div>
            </div>
            {i < prog.length - 1 && (
              <div style={{ color: GOLD, fontSize: 'clamp(7px, 0.9vw, 10px)', fontWeight: 900, animation: `arrowPulse 1.4s ease-in-out infinite ${i * 0.2}s` }}>←</div>
            )}
          </div>
        ))}
      </div>

      {/* Closing card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(26,111,212,0.3), rgba(251,191,36,0.15))', borderRadius: 16, padding: '12px 16px', border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center', marginTop: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 'clamp(18px, 2.2vw, 26px)', marginBottom: 4 }}>🚀</div>
        <div style={{ fontSize: 'clamp(11px, 1.4vw, 15px)', fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
          אנחנו לא בונים לוח עבודות נוסף.
        </div>
        <div style={{ fontSize: 'clamp(11px, 1.4vw, 15px)', fontWeight: 900, color: GOLD, lineHeight: 1.3, marginTop: 3 }}>
          אנחנו בונים את מערכת ההפעלה לעבודה מקומית.
        </div>
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
  { id: 'power',        component: <SlidePower /> },
  { id: 'publish-form', component: <Slide5a /> },
  { id: 'publish-ai',  component: <Slide5b /> },
  { id: 'matching',    component: <Slide6 /> },
  { id: 'liquidity',   component: <Slide7 /> },
  { id: 'daily-goal',  component: <SlideDailyGoal /> },
  { id: 'trust',       component: <Slide8 /> },
  { id: 'different',   component: <SlideDiff /> },
  { id: 'revenue',     component: <Slide9 /> },
  { id: 'gtm1',        component: <Slide10 /> },
  { id: 'gtm2',        component: <Slide11 /> },
  { id: 'gtm3',        component: <Slide11b /> },
  { id: 'network',     component: <Slide12 /> },
  { id: 'integrations', component: <SlideIntegrations /> },
  { id: 'traction',    component: <Slide13 /> },
  { id: 'revenue-engine', component: <SlideRevenueEngine /> },
  { id: 'vision',      component: <Slide14 /> },
  { id: 'why-now',     component: <Slide15 /> },
  { id: 'qr',           component: <SlideQR /> },
];

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrent(i => Math.min(SLIDES.length - 1, i + 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrent(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
          width: '100%', maxWidth: isDesktop ? 720 : 420,
          height: '100vh', maxHeight: isDesktop ? 900 : (isWide ? 780 : '100vh'),
          position: 'relative', overflow: 'hidden',
          boxShadow: isWide ? '0 40px 100px rgba(0,0,0,0.9)' : 'none',
          borderRadius: isWide ? 40 : 0,
        }}
      >
        <div style={{ width: '100%', height: '100%' }}>
          {SLIDES[current].component}
        </div>

        {current > 0 && (
          <div onClick={prev} style={{ position: 'absolute', top: 0, right: 0, width: '25%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}
        {current < SLIDES.length - 1 && (
          <div onClick={next} style={{ position: 'absolute', top: 0, left: 0, width: '25%', height: '100%', cursor: 'pointer', zIndex: 20 }} />
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', zIndex: 40 }}>
          <div style={{ height: '100%', width: `${((current + 1) / SLIDES.length) * 100}%`, background: GOLD, transition: 'width 0.3s ease' }} />
        </div>
      </div>
    </div>
  );
}