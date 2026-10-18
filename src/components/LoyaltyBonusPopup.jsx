import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Gift, Sparkles, CheckCircle2, X, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import CreditIcon from '@/components/CreditIcon';
import LoyaltyProgressMeter from '@/components/loyalty/LoyaltyProgressMeter';
import { spawnCoinBurst } from '@/lib/coinBurst';
import { getLoyaltyProgress } from '@/lib/loyaltyProgress';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * LoyaltyBonusPopup — the reward a worker gets for a 5-star rating.
 *
 * The amount is deliberately NOT shown up front: the popup opens as a surprise,
 * and the worker reveals the bonus by collecting it. Same gold treatment as the
 * signup gift popup, plus the rank meter so the reward reads as progress in the
 * system rather than a one-off payment.
 */
const GOLD = {
  gradient: 'linear-gradient(160deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
  glow: 'rgba(217,119,6,0.45)',
  accent: '#f59e0b',
  soft: '#fffbeb',
  border: '#fde68a',
  badgeBg: 'linear-gradient(135deg, #fbbf24, #d97706)',
};

const PERK_KEYS = ['lp_perk_1', 'lp_perk_2', 'lp_perk_3'];

export default function LoyaltyBonusPopup({ amount = 0, tasksCompleted = 0, onClose }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const firedRef = useRef(false);

  const progress = getLoyaltyProgress(tasksCompleted);

  const handleCollect = () => {
    if (revealed) { onClose(); return; }
    setRevealed(true);

    if (!firedRef.current) {
      firedRef.current = true;
      confetti({
        particleCount: 90, spread: 75, origin: { y: 0.25, x: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#fde68a', '#fff'],
        startVelocity: 45, gravity: 0.9, scalar: 0.9,
      });
      setTimeout(() => spawnCoinBurst({ onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }) }), 200);
    }
  };

  return createPortal(
    <div
      onClick={() => revealed && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.66)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <motion.div
        dir={isRTL ? 'rtl' : 'ltr'}
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
        {/* ── Hero header — same structure as the signup gift popup ── */}
        <div style={{ position: 'relative', background: GOLD.gradient, padding: '32px 24px 28px', overflow: 'hidden', borderRadius: '28px 28px 0 0' }}>
          <div style={{ position: 'absolute', top: -50, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

          <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.22)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
            <X size={16} color="white" />
          </button>

          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            style={{ width: 86, height: 86, borderRadius: '50%', background: GOLD.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 8px 28px ${GOLD.glow}`, position: 'relative', zIndex: 1 }}
          >
            <Gift size={42} color="white" strokeWidth={1.8} />
            <Sparkles size={16} color="#fff" style={{ position: 'absolute', top: -4, right: -4, opacity: 0.9 }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -0.3, marginBottom: 4 }}>
              {revealed ? t('lp_revealed_title', { n: amount }) : t('lp_title')}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: 600, lineHeight: 1.5 }}>
              {revealed ? t('lp_body_revealed') : t('lp_subtitle')}
            </div>
          </motion.div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '22px 22px 8px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 18px', textAlign: 'center' }}>
            {revealed ? t('lp_cta_done') : t('lp_body')}
          </p>

          {/* The bonus itself — hidden until collected */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: GOLD.soft, border: `1px solid ${GOLD.border}`, borderRadius: 16, padding: '18px 28px', marginBottom: 18 }}>
            {revealed ? (
              <>
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 220 }}
                  style={{ fontSize: 44, fontWeight: 900, color: GOLD.accent, letterSpacing: -2, lineHeight: 1 }}
                >
                  {amount}
                </motion.span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                  <CreditIcon size={28} />
                  <span style={{ fontSize: 12, color: GOLD.accent, fontWeight: 700 }}>{t('lp_credits')}</span>
                </div>
              </>
            ) : (
              <>
                <motion.span
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: 40, fontWeight: 900, color: GOLD.accent, lineHeight: 1 }}
                >
                  ?
                </motion.span>
                <span style={{ fontSize: 13, fontWeight: 700, color: GOLD.accent, lineHeight: 1.5, textAlign: 'center', maxWidth: 200 }}>
                  {t('lp_reveal_hint')}
                </span>
              </>
            )}
          </div>

          {/* Perks */}
          <div style={{ background: GOLD.soft, border: `1px solid ${GOLD.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 18 }}>
            {PERK_KEYS.map((key, i) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < PERK_KEYS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: GOLD.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={15} color="white" strokeWidth={2.4} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f1e40', flex: 1 }}>{t(key)}</span>
              </div>
            ))}
          </div>

          {/* Rank meter — the motivation layer */}
          <LoyaltyProgressMeter progress={progress} />

          <button
            onClick={handleCollect}
            style={{
              width: '100%', height: 52, borderRadius: 14, border: 'none',
              background: GOLD.gradient, color: 'white', fontWeight: 800, fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 6px 20px ${GOLD.glow}`, letterSpacing: 0.2,
            }}
          >
            {revealed ? <Star size={18} color="white" fill="white" /> : <Gift size={18} color="white" />}
            {revealed ? t('lp_cta_done') : t('lp_cta')}
          </button>

          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            {t('lp_footer')}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}