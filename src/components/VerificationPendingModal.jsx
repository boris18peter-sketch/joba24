import { createPortal } from 'react-dom';
import { Clock, X, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * VerificationPendingModal — shown when a user who already submitted
 * KYC (kyc_status === 'pending') tries to apply to a verification-required
 * task. Tells them their verification is under review by the control team.
 */
export default function VerificationPendingModal({ onClose }) {
  const { t, isRTL } = useLanguage();
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: '#fafbff',
          borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          maxHeight: '94vh', overflowY: 'auto',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.2)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde3ee', margin: '14px auto 0' }} />

        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 11, background: '#f0f2f7',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '8px 24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
            marginBottom: 20,
          }}>
            <Clock size={36} color="white" strokeWidth={1.8} />
          </div>

          {/* Title */}
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f1e40', marginBottom: 10, letterSpacing: -0.3 }}>
            {t('vpm_title')}
          </div>

          {/* Description */}
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }} dangerouslySetInnerHTML={{ __html: t('vpm_desc') }} />

          {/* Status info */}
          <div style={{ width: '100%', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '14px 16px', marginBottom: 24, textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Clock size={16} color="#1d4ed8" strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#1e3a8a' }}>{t('vpm_status')}</span>
            </div>
            {[
              t('vpm_step1'),
              t('vpm_step2'),
              t('vpm_step3'),
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <ShieldCheck size={14} color="#3b82f6" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Dismiss */}
          <button
            onClick={onClose}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              color: 'white', fontWeight: 800, fontSize: 15,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t('popup_got_it')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}