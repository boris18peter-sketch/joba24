import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Shield, Trophy, X, Sparkles, CheckCircle2, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * VerificationApprovedPopup — unified celebration popup for green & gold verification.
 * Same style for both variants — only colors, icon and text differ.
 *
 * Props:
 *   variant: 'green' | 'gold'  (default 'green')
 *   onClose: function
 */
const VARIANTS = {
  green: {
    gradient: 'linear-gradient(160deg, #059669 0%, #047857 60%, #065f46 100%)',
    glow: 'rgba(5,150,105,0.45)',
    accent: '#10b981',
    soft: '#ecfdf5',
    border: '#a7f3d0',
    Icon: Shield,
    badgeBg: 'linear-gradient(135deg, #10b981, #059669)',
    title: 'הווי הירוק שלך הגיע! 🟢',
    subtitle: 'הזהות שלך אומתה בהצלחה',
    body: 'עכשיו כשאתה מאומת, הסיכוי שלך להתקבל למשימות עולה משמעותית. מפרסמים סומכים על משתמשים מאומתים הרבה יותר.',
    perks: [
      'ווי ירוק גלוי בפרופיל ובכל המשימות שלך',
      'עדיפות בקבלת בקשות על משימות מאומתות',
      'אמון מוגבר מצד מפרסמים ולקוחות',
    ],
    cta: 'אישור והמשך',
  },
  gold: {
    gradient: 'linear-gradient(160deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
    glow: 'rgba(217,119,6,0.45)',
    accent: '#f59e0b',
    soft: '#fffbeb',
    border: '#fde68a',
    Icon: Trophy,
    badgeBg: 'linear-gradient(135deg, #fbbf24, #d97706)',
    title: 'ווי זהב! אתה בליגת המקצוענים 🏆',
    subtitle: 'אימות זהות + רשת חברתית מאומתת',
    body: 'הפרופיל שלך קיבל ווי זהב — הדרגה הגבוהה ביותר. זה אומר שמפרסמים סומכים עליך יותר מכולם. כל הכבוד!',
    perks: [
      'ווי זהב יוקרתי ליד שמך בכל הפלטפורמה',
      'עדיפות עליונה בחיפוש ובקבלת בקשות',
      'תג האמינות הגבוה ביותר ב-Joba24',
    ],
    cta: 'אישור והמשך',
  },
};

export default function VerificationApprovedPopup({ variant = 'green', onClose }) {
  const v = VARIANTS[variant] || VARIANTS.green;
  const firedRef = useRef(false);

  // Fire confetti once on mount
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const colors = variant === 'gold' ? ['#fbbf24', '#f59e0b', '#fde68a', '#fff'] : ['#10b981', '#059669', '#a7f3d0', '#fff'];
    const burst = (originX) => confetti({ particleCount: 80, spread: 70, origin: { y: 0.25, x: originX }, colors, startVelocity: 45, gravity: 0.9, scalar: 0.9 });
    burst(0.3); setTimeout(() => burst(0.7), 180); setTimeout(() => burst(0.5), 360);
  }, [variant]);

  return createPortal(
    <div
      onClick={onClose}
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
        {/* Hero header */}
        <div style={{ position: 'relative', background: v.gradient, padding: '32px 24px 28px', overflow: 'hidden', borderRadius: '28px 28px 0 0' }}>
          {/* decorative glow */}
          <div style={{ position: 'absolute', top: -50, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -40, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

          {/* Close */}
          <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.22)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
            <X size={16} color="white" />
          </button>

          {/* Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            style={{ width: 86, height: 86, borderRadius: '50%', background: v.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 8px 28px ${v.glow}`, position: 'relative', zIndex: 1 }}
          >
            <v.Icon size={42} color="white" strokeWidth={1.8} />
            {/* sparkle accents */}
            <Sparkles size={16} color="#fff" style={{ position: 'absolute', top: -4, right: -4, opacity: 0.9 }} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -0.3, marginBottom: 4 }}>{v.title}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>{v.subtitle}</div>
          </motion.div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 22px 8px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 18px', textAlign: 'center' }}>{v.body}</p>

          {/* Perks */}
          <div style={{ background: v.soft, border: `1px solid ${v.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 22 }}>
            {v.perks.map((perk, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < v.perks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: v.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={15} color="white" strokeWidth={2.4} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{perk}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onClose}
            style={{
              width: '100%', height: 52, borderRadius: 14, border: 'none',
              background: v.gradient, color: 'white', fontWeight: 800, fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 6px 20px ${v.glow}`,
              letterSpacing: 0.2,
            }}
          >
            {variant === 'gold' ? <Star size={18} color="white" fill="white" /> : <Shield size={18} color="white" />}
            {v.cta}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}