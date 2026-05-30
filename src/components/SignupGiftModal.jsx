import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X, Gift } from 'lucide-react';
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

    setTimeout(() => {
      coin.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
      coin.style.opacity = '1';
      coin.style.transform = `translate(${ex - cx}px, ${ey - cy}px) scale(1.1) rotate(${spinDeg * 0.3}deg)`;
    }, stagger);

    setTimeout(() => {
      coin.style.transition = 'transform 0.65s cubic-bezier(0.6, 0, 0.9, 0.4), opacity 0.4s ease 0.25s';
      coin.style.transform = `translate(${targetX - cx}px, ${targetY - cy}px) scale(0.18) rotate(${spinDeg}deg)`;
      coin.style.opacity = '0';
    }, stagger + 400);

    setTimeout(() => {
      if (pill) {
        pill.style.transition = 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)';
        pill.style.transform = 'scale(1.22)';
        setTimeout(() => { if (pill) pill.style.transform = 'scale(1)'; }, 120);
      }
      if (navigator.vibrate) navigator.vibrate(7);
    }, stagger + 1060);

    setTimeout(() => coin.remove(), stagger + 1200);
  }

  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
  }, COIN_COUNT * 32 + 1100);
}

export default function SignupGiftModal({ onClose }) {
  const [claimed, setClaimed] = useState(false);
  const queryClient = useQueryClient();

  const handleClaim = () => {
    if (claimed) return;
    setClaimed(true);
    localStorage.setItem('joba24_gift_claimed', '1');
    base44.functions.invoke('grantSignupBonus', {}).catch(() => {});
    setTimeout(() => spawnCoins(queryClient), 180);
    setTimeout(() => onClose(), COIN_COUNT * 32 + 1600);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !claimed) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '28px 28px 0 0',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 -20px 80px rgba(0,0,0,0.25)',
          padding: '24px 20px',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
          animation: 'slideUpModal 0.35s cubic-bezier(0.34,1.4,0.64,1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '0 auto 20px' }} />

        {/* Close button */}
        {!claimed && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 20, left: 16,
              width: 36, height: 36, borderRadius: 12,
              background: '#f3f4f6', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10,
            }}
          >
            <X size={18} color="#6b7280" />
          </button>
        )}

        {/* Gift icon */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
            border: '2px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 36,
            boxShadow: '0 8px 32px rgba(26,111,212,0.18)',
            animation: 'giftBounce 1.9s ease-in-out infinite',
          }}>
            🎁
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f1e40', letterSpacing: -0.4, marginBottom: 8 }}>
            מתנת הצטרפות! 🎉
          </div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>
            פינקנו אותך ב-<strong style={{ color: '#1a6fd4' }}>100 קרדיטים</strong> במתנה כדי שתוכל
            לצאת לדרך — לבצע משימות או לפרסם משימות מיד!
          </div>
        </div>

        {/* Credits box */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          margin: '20px 0',
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          border: '1.5px solid #bfdbfe',
          borderRadius: 20,
          padding: '18px 24px',
        }}>
          <span style={{ fontSize: 56, fontWeight: 900, color: '#1a6fd4', letterSpacing: -3, lineHeight: 1 }}>100</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <CreditIcon size={34} />
            <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 700 }}>קרדיטים</span>
          </div>
        </div>

        {/* Info row */}
        <div style={{
          background: '#f8faff', border: '1px solid #e5eaf5', borderRadius: 14,
          padding: '12px 16px', marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <strong style={{ color: '#0f1e40' }}>קרדיטים</strong> הם המטבע של המערכת — משמשים להגשת בקשות למשימות. ניתן לרכוש עוד בכל עת.
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleClaim}
          disabled={claimed}
          style={{
            width: '100%', height: 56, borderRadius: 16,
            background: claimed ? '#93b4d8' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 900, fontSize: 17,
            border: 'none', cursor: claimed ? 'default' : 'pointer',
            boxShadow: claimed ? 'none' : '0 6px 24px rgba(26,111,212,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            letterSpacing: -0.2,
          }}
          onPointerDown={e => { if (!claimed) e.currentTarget.style.transform = 'scale(0.97)'; }}
          onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {claimed ? '⏳ מעביר קרדיטים...' : '🪙 קבל 100 קרדיטים חינם!'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
          מתנה חד-פעמית · אחד לכל משתמש
        </div>
      </div>

      <style>{`
        @keyframes slideUpModal { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes giftBounce { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.05)} }
      `}</style>
    </div>,
    document.body
  );
}