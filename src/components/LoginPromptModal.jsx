import { createPortal } from 'react-dom';
import { useState } from 'react';
import { X, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function ProviderButton({ icon, label, onClick, bg, color, border }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', height: 52, borderRadius: 16,
        background: bg || 'white',
        color: color || '#1a1a1a',
        fontWeight: 700, fontSize: 15,
        border: `1.5px solid ${border || '#e8edf5'}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'opacity 0.15s',
      }}
      onPointerDown={e => { e.currentTarget.style.opacity = '0.8'; }}
      onPointerUp={e => { e.currentTarget.style.opacity = '1'; }}
      onPointerLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {icon}
      {label}
    </button>
  );
}

function EmailForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) return;
    setLoading(true);
    try {
      await base44.auth.sendMagicLink(email.trim(), window.location.href);
      setSent(true);
    } catch {
      // fallback: redirect to login with email pre-filled
      base44.auth.redirectToLogin(window.location.href);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>בדוק את האימייל שלך</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          שלחנו לך קישור כניסה ל-<strong style={{ color: 'var(--text-1)' }}>{email}</strong>.<br />
          לחץ על הקישור כדי להתחבר.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 4px', width: 'fit-content' }}
      >
        <ArrowLeft size={14} /> חזרה
      </button>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>כניסה עם אימייל</div>
      <input
        type="email"
        dir="ltr"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        autoFocus
        style={{
          width: '100%', height: 52, borderRadius: 14,
          border: '1.5px solid #e2e8f0',
          padding: '0 16px',
          fontSize: 15, background: 'var(--surface-3)',
          color: 'var(--text-1)',
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      <button
        onClick={handleSend}
        disabled={loading || !email.includes('@')}
        style={{
          width: '100%', height: 52, borderRadius: 16,
          background: email.includes('@') ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#e2e8f0',
          color: email.includes('@') ? 'white' : '#94a3b8',
          fontWeight: 800, fontSize: 15, border: 'none',
          cursor: email.includes('@') ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <><Mail size={16} /> שלח קישור כניסה</>}
      </button>
      <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>נשלח קישור כניסה לאימייל — ללא סיסמה</div>
    </div>
  );
}

export default function LoginPromptModal({ onLogin, onClose, type = 'apply' }) {
  const [showEmail, setShowEmail] = useState(false);
  const redirectUrl = window.location.href;

  const handleGoogle = () => base44.auth.loginWithProvider('google', redirectUrl);
  const handleApple = () => base44.auth.loginWithProvider('apple', redirectUrl);
  const handleFacebook = () => base44.auth.loginWithProvider('facebook', redirectUrl);

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.72)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: 'var(--sheet-bg)',
          borderRadius: '32px 32px 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: '0 -24px 120px rgba(0,0,0,0.3)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
        }}
        dir="rtl"
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />

        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 11, background: 'var(--surface-3)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="#9ca3af" />
          </button>
        </div>

        <div style={{ padding: '12px 20px 0' }}>
          {showEmail ? (
            <EmailForm onBack={() => setShowEmail(false)} />
          ) : (
            <>
              {/* Title */}
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.5, textAlign: 'center', marginBottom: 24 }}>
                הצטרפו לאלפי אנשים שמפרסמים ומבצעים משימות
              </div>

              {/* Login buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <ProviderButton
                  onClick={handleGoogle}
                  border="#dadce0"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  }
                  label="המשך עם Google"
                />

                <ProviderButton
                  onClick={handleApple}
                  bg="#000"
                  color="white"
                  border="#000"
                  label="המשך עם Apple"
                />

                <ProviderButton
                  onClick={handleFacebook}
                  bg="#1877F2"
                  color="white"
                  border="#1877F2"
                  label="המשך עם Facebook"
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: '#e8edf5' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>או</span>
                  <div style={{ flex: 1, height: 1, background: '#e8edf5' }} />
                </div>

                <ProviderButton
                  onClick={() => setShowEmail(true)}
                  label="המשך עם אימייל"
                  border="#bfdbfe"
                  color="#1a6fd4"
                  icon={<Mail size={16} color="#1a6fd4" />}
                />
              </div>

              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.8, fontWeight: 500, marginBottom: 4 }}>
                בחינם לחלוטין — ללא חיוב
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}