import { useState } from 'react';
import { Shield, Clock, XCircle } from 'lucide-react';
import VerifyModal from '@/components/VerifyModal';
import { isUserVerified } from '@/lib/utils';

/**
 * VerificationStatusBanner — attractive gradient banner (matches ProfileCompletionBanner style).
 * Shows KYC status for unverified users. Clicking opens the VerifyModal.
 *
 * States:
 *   - not submitted (kyc_status null/undefined) → blue gradient, CTA "אמת זהות עכשיו"
 *   - pending  → amber gradient, "בבדיקה"
 *   - rejected → red gradient, "שלח שוב"
 *   - approved (is_verified true) → hidden (green badge shows instead)
 */
export default function VerificationStatusBanner({ me }) {
  const [showVerify, setShowVerify] = useState(false);

  if (!me || isUserVerified(me)) return null;

  const status = me.kyc_status;

  const config = {
    pending: {
      icon: Clock,
      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      glow: 'rgba(217,119,6,0.32)',
      title: 'אימות בבדיקה',
      sub: 'הפרטים שלך נשלחו — ממתין לאישור הצוות. בינתיים תוכל לפרסם משימות ולהגיש בקשות.',
      cta: 'ערוך פרטים',
      ctaBg: '#fef3c7',
      ctaColor: '#92400e',
      showChevron: false,
    },
    rejected: {
      icon: XCircle,
      gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      glow: 'rgba(220,38,38,0.32)',
      title: 'אימות נדחה',
      sub: 'האימות נדחה — ניתן לעדכן את הפרטים ולשלוח שוב.',
      cta: 'שלח שוב',
      ctaBg: '#fecaca',
      ctaColor: '#991b1b',
      showChevron: false,
    },
    default: {
      icon: Shield,
      gradient: 'linear-gradient(135deg, #1a6fd4 0%, #0a52b0 100%)',
      glow: 'rgba(26,111,212,0.32)',
      title: 'אימות זהות',
      sub: 'אימות חד־פעמי פותח ווי ירוק 🟢 ובונה אמון עם משתמשים. הוא נדרש גם להגשת בקשות על משימות מאומתות.',
      cta: 'אמת זהות עכשיו',
      ctaBg: '#fbbf24',
      ctaColor: '#1a3a6b',
      showChevron: false,
    },
  };

  const c = config[status] || config.default;
  const Icon = c.icon;

  return (
    <>
      <button
        id="onboarding-verify-banner"
        onClick={() => setShowVerify(true)}
        dir="rtl"
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: '100%',
          display: 'block',
          background: c.gradient,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
          boxShadow: `0 4px 20px ${c.glow}`,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -24, left: -24, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -16, right: -16, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Top row — icon + text */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} color="white" strokeWidth={1.9} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'white', marginBottom: 5, lineHeight: 1.3 }}>
              {c.title}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>
              {c.sub}
            </div>
          </div>
        </div>

        {/* CTA button */}
        <div
          style={{
            width: '100%',
            height: 44,
            borderRadius: 12,
            background: c.ctaBg,
            color: c.ctaColor,
            fontWeight: 900,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: '0 3px 12px rgba(0,0,0,0.12)',
          }}
        >
          {c.cta}
        </div>
      </button>

      {showVerify && (
        <VerifyModal
          onClose={() => setShowVerify(false)}
          onSuccess={() => setShowVerify(false)}
        />
      )}
    </>
  );
}