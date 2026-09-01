import { createPortal } from 'react-dom';
import { X, Lock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

// GuestBlockPopup — shown when a guest (browsing without an account) tries to
// reach a page or action that requires authentication. Tells them where they
// tried to go and offers a single clear path to the login screen.
export default function GuestBlockPopup({ areaLabel, onClose }) {
  const { login } = useAuth();

  const handleLogin = () => {
    onClose();
    login();
  };

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.66)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--sheet-bg)', borderRadius: '32px 32px 0 0',
          width: '100%', maxWidth: 460,
          boxShadow: '0 -24px 120px rgba(0,0,0,0.3)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          animation: 'sheetSlideUp 0.28s cubic-bezier(0.32,1.2,0.64,1) both',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />

        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 11, background: 'var(--surface-3)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        <div style={{ padding: '8px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Lock icon */}
          <div style={{
            width: 76, height: 76, borderRadius: '50%', background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
            boxShadow: '0 8px 28px rgba(26,111,212,0.18)',
          }}>
            <Lock size={38} color="#1a6fd4" strokeWidth={2.2} />
          </div>

          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8, lineHeight: 1.3 }}>
            נדרשת התחברות
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 320, marginBottom: 24 }}>
            כדי לגשת ל{areaLabel || 'דף זה'} עליך להתחבר לחשבון. ההרשמה חינמית ולוקחת רגע.
          </div>

          <button
            onClick={handleLogin}
            style={{
              width: '100%', height: 54, borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white',
              fontWeight: 900, fontSize: 16, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(26,111,212,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            התחבר עכשיו
          </button>
          <button
            onClick={onClose}
            style={{
              marginTop: 10, background: 'none', border: 'none', color: 'var(--text-3)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 16px',
            }}
          >
            אולי אחר כך
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}