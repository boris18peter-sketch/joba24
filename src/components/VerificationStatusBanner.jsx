import { useState } from 'react';
import { Shield, Clock, XCircle } from 'lucide-react';
import VerifyModal from '@/components/VerifyModal';
import { isUserVerified } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * VerificationStatusBanner — identical green banner across the whole interface.
 *
 * Green reflects the outcome: after approval the profile earns a green verified badge.
 * The banner shows the current KYC status + a small note that the green badge usually
 * arrives within ~6 hours of submission.
 *
 * States (all green, identical style — only text/CTA differ):
 *   - not submitted → "אימות זהות" + 6h note + CTA "אמת זהות עכשיו"
 *   - pending       → "אימות בבדיקה" + 6h note + CTA "ערוך פרטים"
 *   - rejected      → "אימות נדחה" + CTA "שלח שוב"
 *   - approved (is_verified) → hidden
 */
export default function VerificationStatusBanner({ me }) {
  const [showVerify, setShowVerify] = useState(false);
  const { t, isRTL } = useLanguage();

  if (!me || isUserVerified(me)) return null;

  const status = me.kyc_status;

  const config = {
    pending: {
      icon: Clock,
      title: t('pr_verify_pending'),
      sub: t('vsb_pending_sub'),
      cta: t('vsb_edit_details'),
      showNote: true,
    },
    rejected: {
      icon: XCircle,
      title: t('pr_verify_rejected'),
      sub: t('pr_verify_rejected_sub'),
      cta: t('vsb_send_again'),
      showNote: false,
    },
    default: {
      icon: Shield,
      title: t('vsb_verify_identity'),
      sub: t('vsb_default_sub'),
      cta: t('vsb_verify_now'),
      showNote: true,
    },
  };

  const c = config[status] || config.default;
  const Icon = c.icon;

  return (
    <>
      <button
        id="onboarding-verify-banner"
        onClick={() => setShowVerify(true)}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: '100%',
          display: 'block',
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          borderRadius: 16,
          padding: 16,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(5,150,105,0.32)',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -24, left: -24, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -16, right: -16, width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Top row — icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} color="white" strokeWidth={1.9} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 900, color: 'white', marginBottom: 5, lineHeight: 1.3 }}>
              {c.title}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55 }}>
              {c.sub}
            </div>
          </div>
        </div>

        {/* 6-hour note */}
        {c.showNote && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '0 2px' }}>
            <Clock size={12} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              {t('vsb_green_hours')}
            </span>
          </div>
        )}

        {/* CTA button */}
        <div
          style={{
            width: '100%',
            height: 44,
            borderRadius: 12,
            background: '#fbbf24',
            color: '#1a3a6b',
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