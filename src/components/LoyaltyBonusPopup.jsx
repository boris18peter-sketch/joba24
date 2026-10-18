import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Gift, CheckCircle2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import CreditIcon from '@/components/CreditIcon';
import { motion } from 'framer-motion';
import { spawnCoinBurst } from '@/lib/coinBurst';
import TrustCard from '@/components/TrustCard';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * LoyaltyBonusPopup — the reward a worker gets for a 5-star rating.
 *
 * Deliberately the SAME popup as the signup gift: the same gold theme, the same
 * hero, the same coin block, the same perks block and the same CTA. A bonus is a
 * bonus, so it should not arrive in a second, heavier design that reads like a
 * different kind of message. The only thing this one adds is the rank meter at
 * the very bottom, because a loyalty bonus is also progress.
 */
const THEME = {
  gradient: 'linear-gradient(160deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
  glow: 'rgba(217,119,6,0.45)',
  accent: '#f59e0b',
  soft: '#fffbeb',
  border: '#fde68a',
  badgeBg: 'linear-gradient(135deg, #fbbf24, #d97706)',
};

const PERK_KEYS = ['lp_perk_1', 'lp_perk_2', 'lp_perk_3'];

export default function LoyaltyBonusPopup({ amount = 0, user, onClose }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState(false);

  // The ONLY number this popup may show is the bonus of the transaction that
  // raised it. Never a running total, never a previous bonus, never a settings
  // value — so the figure here always matches the one the worker was told about.
  const bonusAmount = Math.max(0, Math.round(Number(amount) || 0));

  const handleCollect = () => {
    if (claimed) return;
    setClaimed(true);
    confetti({
      particleCount: 90, spread: 75, origin: { y: 0.25, x: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#fde68a', '#fff'],
      startVelocity: 45, gravity: 0.9, scalar: 0.9,
    });
    spawnCoinBurst({ onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }) });
    setTimeout(() => onClose(), 2400);
  };

  return createPortal(
    <div
      onClick={() => !claimed && onClose()}
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
        <div style={{ position: 'relative', background: THEME.gradient, padding: '32px 24px 28px', overflow: 'hidden', borderRadius: '28px 28px 0 0' }}>
          <div style={{ position: 'absolute', top: -50, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

          {!claimed && (
            <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.22)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
              <X size={16} color="white" />
            </button>
          )}

          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            style={{ width: 86, height: 86, borderRadius: '50%', background: THEME.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 8px 28px ${THEME.glow}`, position: 'relative', zIndex: 1 }}
          >
            <Gift size={42} color="white" strokeWidth={1.8} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -0.3, marginBottom: 4 }}>
              {t('lp_revealed_title', { n: bonusAmount })}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: 600, lineHeight: 1.5 }}>
              {t('lp_subtitle')}
            </div>
          </motion.div>
        </div>

        {/* ── Body — same structure as the signup gift popup ── */}
        <div style={{ padding: '22px 22px 8px' }}>
          {/* Coin visual */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: THEME.soft, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '18px 28px', marginBottom: 18 }}>
            <span style={{ fontSize: 44, fontWeight: 900, color: THEME.accent, letterSpacing: -2, lineHeight: 1 }}>{bonusAmount}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
              <CreditIcon size={28} />
              <span style={{ fontSize: 12, color: THEME.accent, fontWeight: 700 }}>{t('lp_credits')}</span>
            </div>
          </div>

          {/* Perks */}
          <div style={{ background: THEME.soft, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 22 }}>
            {PERK_KEYS.map((key, i) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < PERK_KEYS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: THEME.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={15} color="white" strokeWidth={2.4} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f1e40', flex: 1 }}>{t(key)}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleCollect}
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
            {claimed ? t('lp_cta_done') : t('lp_cta')}
          </button>

          {/* ── Trust meter — the SHARED card, in its read-only form. A 5-star
              rating is exactly what moves this score, so the worker sees the
              very number that just went up, right where the bonus is announced.
              Read-only because a nested popup would open behind this one. ── */}
          <div style={{ marginTop: 14, marginBottom: 18 }}>
            <TrustCard user={user} interactive={false} />
          </div>

          <div style={{ textAlign: 'center', marginTop: 2, fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
            {t('lp_footer')}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}