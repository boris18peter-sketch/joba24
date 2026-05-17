import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const banners = [
  {
    bg: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
    title: 'צריך שמישהו יעזור לך עכשיו?',
    lines: [
      'כל משימה - גם הכי קטנה או הכי מוזרה',
      { text: 'פשוט תפרסם - ומישהו יגיע לבצע אותה תוך ', highlight: 'כמה דקות!' },
    ],
    btn: 'התחברות עכשיו',
    btnBg: '#fbbf24',
    btnColor: '#1a6fd4',
    dot: '#fbbf24',
  },
  {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    title: 'רוצה לעשות כסף קל עכשיו?',
    lines: [
      "כל ג'וב – גם הכי פשוט, הכי מהיר או הכי מוזר",
      { text: 'פשוט תציע את עצמך – ותתחיל להרוויח תוך ', highlight: 'כמה דקות!' },
    ],
    btn: 'התחברות עכשיו',
    btnBg: '#fbbf24',
    btnColor: '#047857',
    dot: '#fbbf24',
  },
];

export default function LoginBannerCarousel() {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  const go = (idx) => {
    setActive(idx);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActive(v => (v + 1) % banners.length), 4000);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => setActive(v => (v + 1) % banners.length), 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  const b = banners[active];

  return (
    <div style={{ background: b.bg, padding: '22px 20px 18px', textAlign: 'center', color: 'white', transition: 'background 0.5s', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -30, left: -30, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px', letterSpacing: -0.5, lineHeight: 1.25 }}>
          {b.title}
        </h2>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.92)', fontWeight: 500, marginBottom: 16 }}>
          {b.lines.map((line, i) =>
            typeof line === 'string'
              ? <div key={i}>{line}</div>
              : <div key={i}>{line.text}<span style={{ color: '#fbbf24', fontWeight: 900 }}>{line.highlight}</span></div>
          )}
        </div>

        <button
          onClick={() => base44.auth.redirectToLogin()}
          style={{
            background: b.btnBg, color: b.btnColor, border: 'none',
            padding: '11px 28px', borderRadius: 14, fontWeight: 900,
            fontSize: 15, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(251,191,36,0.4)',
            transition: 'all 0.15s', letterSpacing: 0.2,
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {b.btn}
        </button>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              style={{
                width: i === active ? 20 : 6, height: 6, borderRadius: 99,
                background: i === active ? 'white' : 'rgba(255,255,255,0.4)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}