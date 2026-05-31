import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import LoginPromptModal from '@/components/LoginPromptModal';
import { Plus } from 'lucide-react';

const banners = [
  {
    bg: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
    title: 'צריך שמישהו יעזור לך עכשיו?',
    lines: [
      'כל משימה - גם הכי קטנה או הכי מוזרה',
      { text: 'פשוט תפרסם, קבל בקשות לביצוע, תאשר בקשה ומישהו יגיע לבצע אותה תוך ', highlight: 'כמה דקות!' },
    ],
    btn: 'התחבר וקבל 🎁',
    btnBg: '#fbbf24',
    btnColor: '#1a6fd4',
  },
  {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    title: 'רוצה להרוויח עכשיו?',
    lines: [
      'בכל יום משימות חדשות מחכות לך.',
      { text: 'הגש בקשות למשימות באזור שלך, בצע אותן ', highlight: 'ותרוויח.' },
    ],
    btn: 'התחבר וקבל 🎁',
    btnBg: '#fbbf24',
    btnColor: '#047857',
  },
];

export default function LoginBannerCarousel({ isAuthenticated, user, onOpenBuyCredits }) {
  const [active, setActive] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const timerRef = useRef(null);
  const touchStartRef = useRef(0);
  const autoPlayedRef = useRef(false);

  const go = (idx) => {
    setActive(idx);
    // Stop auto-play once user manually swipes or clicks dots
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    // Auto-play only once on first load
    if (!autoPlayedRef.current) {
      autoPlayedRef.current = true;
      const timer = setInterval(() => setActive(v => (v + 1) % banners.length), 7000);
      timerRef.current = timer;
      return () => clearInterval(timer);
    }
  }, []);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      const newIdx = diff > 0 ? (active + 1) % banners.length : (active - 1 + banners.length) % banners.length;
      go(newIdx);
    }
  };

  const b = banners[active];

  return (
    <>
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ background: b.bg, padding: '18px 20px 16px', textAlign: 'center', color: 'white', transition: 'background 0.5s', position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none', height: 220, boxSizing: 'border-box' }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -30, left: -30, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px', letterSpacing: -0.5, lineHeight: 1.3 }}>
          {b.title}
        </h2>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.92)', fontWeight: 500, marginBottom: 14 }}>
          {b.lines.map((line, i) =>
            typeof line === 'string'
              ? <div key={i}>{line}</div>
              : <div key={i}>{line.text}<span style={{ color: '#fbbf24', fontWeight: 900 }}>{line.highlight}</span></div>
          )}
        </div>

        {isAuthenticated ? (
          <button
            onClick={onOpenBuyCredits}
            style={{
              background: b.btnBg, color: b.btnColor, border: 'none',
              padding: '11px 24px', borderRadius: 12, fontWeight: 900,
              fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(251,191,36,0.4)',
              transition: 'all 0.15s', letterSpacing: 0.1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>{user?.worker_credits ?? 0} קרדיטים</span>
            <Plus size={16} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              background: b.btnBg, color: b.btnColor, border: 'none',
              padding: '11px 28px', borderRadius: 12, fontWeight: 900,
              fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(251,191,36,0.4)',
              transition: 'all 0.15s', letterSpacing: 0.1,
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {b.btn}
          </button>
        )}

        {/* Trust badges */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 10, fontWeight: 600, letterSpacing: 0.4 }}>
          משתמשים מאומתים • דירוגים • חוויה בטוחה
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              style={{
                width: i === active ? 18 : 5, height: 5, borderRadius: 99,
                background: i === active ? 'white' : 'rgba(255,255,255,0.35)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>

    {showLoginModal && (
      <LoginPromptModal
        type="apply"
        onLogin={() => { setShowLoginModal(false); base44.auth.redirectToLogin(); }}
        onClose={() => setShowLoginModal(false)}
      />
    )}
    </>
  );
}