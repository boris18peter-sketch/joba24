import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import CreditIcon from '@/components/CreditIcon';

const COIN_COUNT = 26;

const coinSvgString = `
  <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cg${Math.random().toString(36).slice(2)}" cx="38%" cy="35%">
        <stop offset="0%" stop-color="#ffe566"/>
        <stop offset="55%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#b45309"/>
      </radialGradient>
    </defs>
    <ellipse cx="13" cy="15" rx="10" ry="4.5" fill="#92400e" opacity="0.45"/>
    <circle cx="13" cy="12" r="10" fill="#f59e0b"/>
    <circle cx="13" cy="12" r="10" fill="none" stroke="#fde68a" stroke-width="1.2"/>
    <circle cx="13" cy="12" r="7" fill="none" stroke="#fbbf24" stroke-width="0.6" opacity="0.5"/>
    <text x="13" y="16.5" text-anchor="middle" font-weight="900" font-size="11" fill="#7c2d12" font-family="Inter,Arial,sans-serif">J</text>
    <ellipse cx="9" cy="8.5" rx="2.5" ry="1.2" fill="rgba(255,255,255,0.3)" transform="rotate(-30,9,8.5)"/>
  </svg>
`;

function spawnCoins(queryClient) {
  const pill = document.getElementById('onboarding-credits-pill');
  const pillRect = pill?.getBoundingClientRect();
  const targetX = pillRect ? pillRect.left + pillRect.width / 2 : window.innerWidth - 80;
  const targetY = pillRect ? pillRect.top + pillRect.height / 2 : 28;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  for (let i = 0; i < COIN_COUNT; i++) {
    const coin = document.createElement('div');
    const angle = (i / COIN_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const radius = 65 + Math.random() * 145;
    const ex = cx + Math.cos(angle) * radius;
    const ey = cy + Math.sin(angle) * radius;
    const stagger = Math.floor(i * 32);
    const spinDeg = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);

    coin.innerHTML = coinSvgString;
    Object.assign(coin.style, {
      position: 'fixed',
      left: `${cx - 13}px`,
      top: `${cy - 13}px`,
      width: '26px',
      height: '26px',
      zIndex: '999997',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'scale(0) rotate(0deg)',
      transition: 'none',
      willChange: 'transform, opacity',
      borderRadius: '50%',
      filter: 'drop-shadow(0 3px 6px rgba(251,191,36,0.6))',
    });
    document.body.appendChild(coin);

    // Phase 1: appear and explode outward
    setTimeout(() => {
      coin.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
      coin.style.opacity = '1';
      coin.style.transform = `translate(${ex - cx}px, ${ey - cy}px) scale(1.1) rotate(${spinDeg * 0.3}deg)`;
    }, stagger);

    // Phase 2: arc to target
    setTimeout(() => {
      coin.style.transition = 'transform 0.65s cubic-bezier(0.6, 0, 0.9, 0.4), opacity 0.4s ease 0.25s';
      coin.style.transform = `translate(${targetX - cx}px, ${targetY - cy}px) scale(0.18) rotate(${spinDeg}deg)`;
      coin.style.opacity = '0';
    }, stagger + 400);

    // Pulse pill on each coin impact
    setTimeout(() => {
      if (pill) {
        pill.style.transition = 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)';
        pill.style.transform = 'scale(1.22)';
        setTimeout(() => {
          if (pill) pill.style.transform = 'scale(1)';
        }, 120);
      }
      if (navigator.vibrate) navigator.vibrate(7);
    }, stagger + 1060);

    // Cleanup
    setTimeout(() => coin.remove(), stagger + 1200);
  }

  // After all coins land, refresh balance
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
  }, COIN_COUNT * 32 + 1100);
}

export default function SignupGiftModal({ onClose }) {
  const [claimed, setClaimed] = useState(false);
  const [visible, setVisible] = useState(true);
  const queryClient = useQueryClient();

  const handleClaim = () => {
    if (claimed) return;
    setClaimed(true);

    localStorage.setItem('joba24_gift_claimed', '1');

    // Fire and forget
    base44.functions.invoke('grantSignupBonus', {}).catch(() => {});

    // Fade out modal
    setVisible(false);

    // Spawn coin particles
    setTimeout(() => spawnCoins(queryClient), 220);

    // Close component shell
    setTimeout(() => onClose(), COIN_COUNT * 32 + 1600);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: visible ? 'rgba(5,15,45,0.82)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(12px)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        transition: 'background 0.28s ease, backdrop-filter 0.28s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        dir="rtl"
        style={{
          background: 'linear-gradient(155deg, #0b1a42 0%, #1a3a7a 55%, #0c2350 100%)',
          borderRadius: 28,
          width: '100%', maxWidth: 358,
          padding: '40px 26px 30px',
          textAlign: 'center',
          boxShadow: '0 32px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(251,191,36,0.22), inset 0 1px 0 rgba(255,255,255,0.09)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.82) translateY(-28px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial glow top */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% -10%, rgba(251,191,36,0.18) 0%, transparent 65%)',
        }} />
        {/* Sparkle corners */}
        <div style={{ position: 'absolute', top: 18, right: 20, fontSize: 18, opacity: 0.6, animation: 'giftSparkle 1.8s ease-in-out infinite' }}>✨</div>
        <div style={{ position: 'absolute', top: 22, left: 22, fontSize: 14, opacity: 0.5, animation: 'giftSparkle 2.1s ease-in-out infinite 0.4s' }}>⭐</div>
        <div style={{ position: 'absolute', bottom: 60, left: 16, fontSize: 12, opacity: 0.4, animation: 'giftSparkle 2.4s ease-in-out infinite 0.8s' }}>✨</div>

        {/* Gift emoji */}
        <div style={{
          fontSize: 72, lineHeight: 1, marginBottom: 18,
          display: 'inline-block',
          animation: 'giftBounce 1.9s ease-in-out infinite',
          filter: 'drop-shadow(0 10px 22px rgba(251,191,36,0.45))',
          position: 'relative', zIndex: 1,
        }}>
          🎁
        </div>

        {/* Title */}
        <div style={{
          fontSize: 22, fontWeight: 900, color: '#fbbf24',
          letterSpacing: -0.5, marginBottom: 10,
          textShadow: '0 2px 12px rgba(251,191,36,0.35)',
          position: 'relative', zIndex: 1,
        }}>
          מתנת הצטרפות חגיגית! 🎉
        </div>

        {/* Body */}
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8,
          marginBottom: 24, position: 'relative', zIndex: 1,
        }}>
          פינקנו אותך ב-<strong style={{ color: '#fbbf24', fontSize: 15 }}>100 ג'ובות</strong> במתנה כדי שתוכל
          לצאת לדרך — לבצע משימות או לפתוח משימות מיד!
        </div>

        {/* Credits box */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          marginBottom: 26, padding: '15px 20px',
          background: 'rgba(251,191,36,0.09)',
          border: '1.5px solid rgba(251,191,36,0.28)',
          borderRadius: 18,
          position: 'relative', zIndex: 1,
        }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: '#fbbf24', letterSpacing: -2, lineHeight: 1 }}>100</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
            <CreditIcon size={32} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>ג'ובות</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleClaim}
          disabled={claimed}
          style={{
            width: '100%', height: 58, borderRadius: 18,
            background: claimed
              ? 'rgba(251,191,36,0.35)'
              : 'linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #f59e0b 100%)',
            color: '#7c2d12', fontWeight: 900, fontSize: 19,
            border: 'none', cursor: claimed ? 'default' : 'pointer',
            boxShadow: claimed ? 'none' : '0 8px 30px rgba(251,191,36,0.6)',
            letterSpacing: -0.2,
            animation: claimed ? 'none' : 'giftCTAPulse 2.1s ease-in-out infinite',
            position: 'relative', zIndex: 1,
          }}
          onPointerDown={e => { if (!claimed) e.currentTarget.style.transform = 'scale(0.96)'; }}
          onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {claimed ? '⏳ טוען...' : "🪙 קבל ג'ובות!"}
        </button>

        <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }}>
          מתנה חד-פעמית · אחד לכל משתמש
        </div>
      </div>
    </div>,
    document.body
  );
}