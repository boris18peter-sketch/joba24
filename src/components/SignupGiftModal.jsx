import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { X, Gift, CheckCircle2 } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';
import { rememberBonusAnnounced } from '@/lib/bonusAnnouncement';
import { motion } from 'framer-motion';

// ── Theme: matches the gold/amber verification popup style ──
const THEME = {
  gradient: 'linear-gradient(160deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
  glow: 'rgba(217,119,6,0.45)',
  accent: '#f59e0b',
  soft: '#fffbeb',
  border: '#fde68a',
  badgeBg: 'linear-gradient(135deg, #fbbf24, #d97706)',
};

export default function SignupGiftModal({ onClose }) {
  const [claimed, setClaimed] = useState(false);
  const queryClient = useQueryClient();
  const { settings } = useJobaSettings();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 30000 });
  const isReferred = !!(me?.referred_by_agent_code);

  // ── THE ONE WELCOME CELEBRATION ─────────────────────────────────────────
  // This popup announces the WHOLE welcome in a single total: the signup bonus,
  // the referral bonus when the visitor arrived through an agent, and the
  // profile-completion bonus the worker flow grants on its last step. Mirrors
  // grantSignupBonus + grantProfileCompletionBonus on the backend.
  //
  // They used to arrive as TWO popups, one after the other, at the exact moment
  // a brand-new worker is deciding whether to trust the app.
  //
  // ── THE NUMBER MUST BE THE NUMBER THEY ACTUALLY GET ─────────────────────
  // The profile bonus was added to this total unconditionally, so a visitor who
  // signed up and skipped the profile was promised 30 Jobas and received 25 —
  // the popup was advertising a bonus that was never granted. It is counted ONLY
  // when the profile is genuinely complete, using the exact same definition the
  // backend grants on (preferred_categories AND preferred_cities), so the total
  // shown is always the total that lands in the balance.
  const profileComplete =
    (me?.preferred_categories?.length ?? 0) > 0 &&
    (me?.preferred_cities?.length ?? 0) > 0;
  const profileBonus = profileComplete ? (settings.profile_completion_bonus ?? 0) : 0;
  const giftAmount =
    (settings.signup_bonus ?? 0) +
    (isReferred ? (settings.referral_signup_bonus ?? 0) : 0) +
    profileBonus;

  // ── ONE ANNOUNCEMENT PER BONUS ──────────────────────────────────────────
  // When this welcome total already includes the profile-completion bonus, the
  // welcome IS its announcement. The same per-user key the loyalty popup reads
  // is written here, so a worker can never be celebrated twice for the one
  // bonus — while a worker who completes their profile later still gets the
  // popup, because this modal never counted it for them.
  useEffect(() => {
    if (profileBonus > 0 && me?.id) {
      rememberBonusAnnounced(me.id, 'profile_bonus');
    }
  }, [profileBonus, me?.id]);

  const PERKS = [
    ...(profileBonus > 0 ? [`בונוס של ${profileBonus} ג׳ובות על השלמת הפרופיל שלך.`] : []),
    'הגשת מועמדות למשימה עולה מספר ג׳ובות.',
    'אם לא נבחרת למשימה - הג׳ובות חוזרות אליך אוטומטית.',
  ];

  // Closes on the spot — no confetti, no burst of coins flying to the header,
  // no two-second wait. The balance is refreshed in the background, after the
  // popup is already gone.
  // ── THE POPUP MUST DELIVER WHAT IT PROMISES ─────────────────────────────
  // The welcome total includes the profile-completion bonus whenever the profile
  // is complete — but that bonus was granted from ONE place only: the worker
  // flow's last step. Anyone who completed their profile any other way (the
  // Profile screen, a restored session) was promised 30 Jobas and received 25.
  //
  // Claiming now grants BOTH, in order. Sequenced on purpose: grantSignupBonus
  // writes the balance, so it must land before the profile bonus is added on top
  // of it. Both calls are idempotent server-side, so a repeat can never double.
  const handleClaim = async () => {
    if (claimed) return;
    setClaimed(true);
    onClose();
    try {
      await base44.functions.invoke('grantSignupBonus', {});
      if (profileBonus > 0) {
        await base44.functions.invoke('grantProfileCompletionBonus', {});
      }
    } catch {
      /* the balance is authoritative server-side; a retry happens on next login */
    }
    queryClient.invalidateQueries({ queryKey: ['me'] });
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
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f1e40', flex: 1 }}>{perk}</span>
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