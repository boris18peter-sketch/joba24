import { createPortal } from 'react-dom';
import { ShieldCheck, X, ArrowLeft } from 'lucide-react';

/**
 * VerificationRequiredModal — shown when a user tries to apply to a
 * verification-required task without being verified.
 * Has a button that opens the full VerifyModal (KYC flow).
 */
export default function VerificationRequiredModal({ onClose, onVerify }) {
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
        dir="rtl"
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
            background: 'linear-gradient(135deg,#16a34a,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(22,163,74,0.3)',
            marginBottom: 20,
          }}>
            <ShieldCheck size={36} color="white" strokeWidth={1.8} />
          </div>

          {/* Title */}
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f1e40', marginBottom: 10, letterSpacing: -0.3 }}>
            נדרש אימות ווי ירוק
          </div>

          {/* Description */}
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>
            משימה זו מחייבת אימות זהות (ווי ירוק) כדי להגיש בקשה.<br />
            האימות הוא חד־פעמי ונעשה פעם אחת בלבד — לאחריו תוכל להגיש בקשות לכל המשימות המאומתות.
          </div>

          {/* Benefits */}
          <div style={{ width: '100%', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '14px 16px', marginBottom: 24, textAlign: 'right' }}>
            {[
              'גישה למשימות פרימיום עם ווי ירוק',
              'בניית אמון עם מפרסמים ועובדים',
              'אימות חד־פעמי — לא צריך לחזור עליו',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <ShieldCheck size={14} color="#059669" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={onVerify}
            style={{
              width: '100%', height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg,#16a34a,#059669)',
              color: 'white', fontWeight: 800, fontSize: 15,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(22,163,74,0.3)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ShieldCheck size={18} strokeWidth={2} /> אמת אותי עכשיו
          </button>

          {/* Dismiss */}
          <button
            onClick={onClose}
            style={{
              width: '100%', height: 44, borderRadius: 14,
              background: 'transparent', color: '#9ca3af',
              fontWeight: 600, fontSize: 14, border: 'none',
              cursor: 'pointer', marginTop: 8,
            }}
          >
            לא עכשיו
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}