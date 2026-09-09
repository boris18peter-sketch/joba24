import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { X, Gift, CheckCircle2 } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { motion } from 'framer-motion';

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

// ── Theme: matches the gold/amber verification popup style ──
const THEME = {
  gradient: 'linear-gradient(160deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
  glow: 'rgba(217,119,6,0.45)',
  accent: '#f59e0b',
  soft: '#fffbeb',
  border: '#fde68a',
  badgeBg: 'linear-gradient(135deg, #fbbf24, #d97706)',
};

const PERKS = [
  'הגשת מועמדות למשימה עולה מספר ג׳ובות.',
  'אם לא נבחרת למשימה - הג׳ובות חוזרות אליך אוטומטית.',
];

export default function SignupGiftModal({ onClose }) {
  const [claimed, setClaimed] = useState(false);
  const queryClient = useQueryClient();
  const { settings } = useJobaSettings();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 30000 });
  const isReferred = !!(me?.referred_by_agent_code);
  // Mirrors grantSignupBonus backend: base signup bonus + referral bonus when referred.
  const giftAmount = (settings.signup_bonus ?? 0) + (isReferred ? (settings.referral_signup_bonus ?? 0) : 0);

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
      onClick={() => !claimed && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.66)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <motion.div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        style={{
          background: 'var(--surface-2)',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 460,
          maxHeight: '92dvh', overflowY: 'auto',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.22)',
        }}
      >
        {/* ── Hero header — same structure as VerificationApprovedPopup ── */}
        <div style={{ position: 'relative', background: THEME.gradient, padding: '32px 24px 28px', overflow: 'hidden', borderRadius: '28px 28px 0 0' }}>
          {/* decorative glow */}
          <div style={{ position: 'absolute', top: -50, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

          {/* Close */}
          {!claimed && (
            <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.22)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
              <X size={16} color="white" />
            </button>
          )}

          {/* Badge — Gift icon in circular container */}
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            style={{ width: 86, height: 86, borderRadius: '50%', background: THEME.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 8px 28px ${THEME.glow}`, position: 'relative', zIndex: 1 }}
          >
            <Gift size={42} color="white" strokeWidth={1.8} />
          </motion.div>

          {/* Title + subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -0.3, marginBottom: 4 }}>
              🎁 קיבלת {giftAmount} ג׳ובות במתנה!
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: 600, lineHeight: 1.5 }}>
              השתמש בג׳ובות כדי להגיש מועמדות למשימות ולהתחיל לעבוד דרך Joba24.
            </div>
          </motion.div>
        </div>

        {/* ── Body — same structure as VerificationApprovedPopup ── */}
        <div style={{ padding: '22px 22px 8px' }}>
          {/* Coin visual */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: THEME.soft, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '18px 28px', marginBottom: 18 }}>
            <span style={{ fontSize: 44, fontWeight: 900, color: THEME.accent, letterSpacing: -2, lineHeight: 1 }}>{giftAmount}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
              <CreditIcon size={28} />
              <span style={{ fontSize: 12, color: THEME.accent, fontWeight: 700 }}>ג׳ובות</span>
            </div>
          </div>

          {/* Perks — same container style as verification popup */}
          <div style={{ background: THEME.soft, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 22 }}>
            {PERKS.map((perk, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < PERKS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: THEME.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={15} color="white" strokeWidth={2.4} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{perk}</span>
              </div>
            ))}
          </div>

          {/* CTA — same style as verification popup */}
          <button
            onClick={handleClaim}
            disabled={claimed}
            style={{
              width: '100%', height: 52, borderRadius: 14, border: 'none',
              background: claimed ? '#d1d5db' : THEME.gradient, color: 'white', fontWeight: 800, fontSize: 15,
              cursor: claimed ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: claimed ? 'none' : `0 6px 20px ${THEME.glow}`,
              letterSpacing: 0.2,
            }}
          >
            <Gift size={18} color="white" />
            {claimed ? 'מקבל...' : `קבל ${giftAmount} ג׳ובות בחינם`}
          </button>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            מתנת הצטרפות חד־פעמית 🎁
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}