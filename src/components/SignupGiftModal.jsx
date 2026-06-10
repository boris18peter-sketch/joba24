import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO = 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg';
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
    <text x="13" y="16.5" text-anchor="middle" font-weight="900" font-size="11" fill="#7c2d12" font-family="Inter,Arial,sans-serif">J</text>
    <ellipse cx="9" cy="8.5" rx="2.5" ry="1.2" fill="rgba(255,255,255,0.3)" transform="rotate(-30,9,8.5)"/>
  </svg>
`;

const ANIM_CSS = `
  @keyframes sgmOrbit1  { to { transform: rotate(360deg); } }
  @keyframes sgmOrbit2  { to { transform: rotate(-360deg); } }
  @keyframes sgmPulse   { 0%,100%{opacity:.13;transform:scale(1);}50%{opacity:.26;transform:scale(1.07);} }
  @keyframes sgmStar    { 0%,100%{opacity:.1;}50%{opacity:.5;} }
  @keyframes sgmFloat   { 0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-6px) scale(1.03);} }
  @keyframes sgmGlow    { 0%,100%{box-shadow:0 6px 28px rgba(251,191,36,.45);}50%{box-shadow:0 12px 48px rgba(251,191,36,.78);} }
  @keyframes sgmSlideUp { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
`;

function injectSGMCSS() {
  if (document.getElementById('sgm-styles')) return;
  const s = document.createElement('style');
  s.id = 'sgm-styles';
  s.textContent = ANIM_CSS;
  document.head.appendChild(s);
}

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
      position: 'fixed', left: `${cx - 13}px`, top: `${cy - 13}px`,
      width: '26px', height: '26px', zIndex: '999997',
      pointerEvents: 'none', opacity: '0',
      transform: 'scale(0) rotate(0deg)', transition: 'none',
      willChange: 'transform, opacity', borderRadius: '50%',
      filter: 'drop-shadow(0 3px 6px rgba(251,191,36,0.6))',
    });
    document.body.appendChild(coin);

    setTimeout(() => {
      coin.style.transition = 'transform 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease';
      coin.style.opacity = '1';
      coin.style.transform = `translate(${ex - cx}px,${ey - cy}px) scale(1.1) rotate(${spinDeg * 0.3}deg)`;
    }, stagger);
    setTimeout(() => {
      coin.style.transition = 'transform 0.65s cubic-bezier(0.6,0,0.9,0.4), opacity 0.4s ease 0.25s';
      coin.style.transform = `translate(${targetX - cx}px,${targetY - cy}px) scale(0.18) rotate(${spinDeg}deg)`;
      coin.style.opacity = '0';
    }, stagger + 400);
    setTimeout(() => {
      if (pill) {
        pill.style.transition = 'transform 0.12s cubic-bezier(0.16,1,0.3,1)';
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
  const [animPhase, setAnimPhase] = useState('idle'); // idle → enter → reveal
  const queryClient = useQueryClient();

  useEffect(() => {
    injectSGMCSS();
    const t1 = setTimeout(() => setAnimPhase('enter'), 60);
    const t2 = setTimeout(() => setAnimPhase('reveal'), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

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
        background: 'linear-gradient(160deg, #05112e 0%, #0a1f4e 58%, #0d2a60 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: 1.5 + Math.random() * 2, height: 1.5 + Math.random() * 2,
            borderRadius: '50%', background: '#60a5fa',
            animation: `sgmStar ${1.5 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      {/* Radar rings */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {[1, 0.72, 0.48, 0.28].map((r, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${r * 310}px`, height: `${r * 310}px`,
            borderRadius: '50%',
            border: `1px solid rgba(96,165,250,${0.06 + i * 0.04})`,
            animation: `sgmPulse ${2.4 + i * 0.45}s ease-in-out infinite`,
            animationDelay: `${i * 0.28}s`,
          }} />
        ))}
      </div>

      {/* Close */}
      {!claimed && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 'max(18px, env(safe-area-inset-top))', left: 16,
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
          }}
        >
          <X size={16} color="rgba(255,255,255,.7)" />
        </button>
      )}

      {/* ── Logo ── */}
      <div style={{ position: 'relative', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Orbit 1 */}
        {animPhase !== 'idle' && (
          <div style={{
            position: 'absolute', inset: -18, borderRadius: '50%',
            border: '1.5px dashed rgba(251,191,36,.42)',
            animation: 'sgmOrbit1 3s linear infinite', pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
              width: 9, height: 9, borderRadius: '50%',
              background: '#fbbf24', boxShadow: '0 0 8px #fbbf24',
            }} />
          </div>
        )}
        {/* Orbit 2 */}
        {animPhase !== 'idle' && (
          <div style={{
            position: 'absolute', inset: -28, borderRadius: '50%',
            border: '1px solid rgba(96,165,250,.26)',
            animation: 'sgmOrbit2 2s linear infinite', pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
              width: 6, height: 6, borderRadius: '50%',
              background: '#60a5fa', boxShadow: '0 0 6px #60a5fa',
            }} />
          </div>
        )}

        {/* Glow */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{
            position: 'absolute', width: 110, height: 110, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,191,36,.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={animPhase !== 'idle' ? { scale: [0, 1.3, 1], rotate: [-20, 5, 0] } : {}}
          transition={{ type: 'spring', damping: 7, stiffness: 130 }}
          style={{
            width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
            border: '2.5px solid #fbbf24',
            boxShadow: '0 0 0 4px rgba(251,191,36,.22), 0 0 30px rgba(251,191,36,.5)',
            animation: animPhase === 'reveal' ? 'sgmFloat 2.2s ease-in-out infinite' : 'none',
          }}
        >
          <img src={LOGO} alt="Joba24" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </motion.div>

        {/* Coin burst badge */}
        <AnimatePresence>
          {animPhase === 'reveal' && (
            <motion.div
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 8, stiffness: 200, delay: 0.2 }}
              style={{
                position: 'absolute', top: -8, left: -10,
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                borderRadius: 99, padding: '4px 10px',
                fontSize: 11, fontWeight: 900, color: '#5a1800',
                boxShadow: '0 4px 14px rgba(251,191,36,.55)',
                whiteSpace: 'nowrap',
              }}
            >
              +100
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Text block ── */}
      <AnimatePresence>
        {animPhase === 'reveal' && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 150 }}
            style={{ textAlign: 'center', padding: '0 28px', width: '100%', marginBottom: 28 }}
            dir="rtl"
          >
            {/* Title */}
            <div style={{
              fontSize: 26, fontWeight: 900, color: '#ffffff',
              letterSpacing: -0.5, lineHeight: 1.25, marginBottom: 6,
              textShadow: '0 0 24px rgba(251,191,36,.55)',
            }}>
              מתנת הצטרפות
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', lineHeight: 1.65, marginBottom: 18 }}>
              פינקנו אותך ב-<span style={{ color: '#fbbf24', fontWeight: 800 }}>100 קרדיטים</span> במתנה<br />
              כדי שתוכל לצאת לדרך ולהגיש בקשות
            </div>

            {/* Credits pill */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18, type: 'spring', damping: 9 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                background: 'rgba(96,165,250,.1)',
                border: '1px solid rgba(96,165,250,.28)',
                borderRadius: 16, padding: '14px 28px',
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 48, fontWeight: 900, color: '#fbbf24', letterSpacing: -3, lineHeight: 1 }}>100</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                <CreditIcon size={30} />
                <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>קרדיטים</span>
              </div>
            </motion.div>

            {/* Info */}
            <div style={{
              background: 'rgba(96,165,250,.07)',
              border: '1px solid rgba(96,165,250,.18)',
              borderRadius: 12, padding: '10px 14px',
              fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.6,
              textAlign: 'right',
            }}>
              <strong style={{ color: 'rgba(255,255,255,.8)' }}>קרדיטים</strong> — המטבע של המערכת. משמשים להגשת בקשות למשימות. ניתן לרכוש עוד בכל עת.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CTA ── */}
      <AnimatePresence>
        {animPhase === 'reveal' && (
          <motion.button
            key="cta"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.45, type: 'spring', damping: 12, stiffness: 180 }}
            onClick={handleClaim}
            disabled={claimed}
            style={{
              background: claimed ? 'rgba(96,165,250,.25)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              border: 'none', borderRadius: 14,
              padding: '15px 0', width: 'calc(100% - 48px)',
              color: claimed ? 'rgba(255,255,255,.6)' : '#5a1800',
              fontSize: 16, fontWeight: 900,
              cursor: claimed ? 'default' : 'pointer',
              animation: claimed ? 'none' : 'sgmGlow 2s ease-in-out infinite',
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: 0.2,
            }}
          >
            {claimed ? 'מעביר קרדיטים...' : 'קבל 100 קרדיטים חינם'}
          </motion.button>
        )}
      </AnimatePresence>

      {animPhase === 'reveal' && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,.25)', fontWeight: 500 }}>
          מתנה חד-פעמית · אחד לכל משתמש
        </div>
      )}
    </div>,
    document.body
  );
}