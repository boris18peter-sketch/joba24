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

function EmailForm({ onBack, onSuccess }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState('email'); // 'email' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Derive a deterministic password from the email.
  // The OTP email is the real security layer — this password is just a gateway
  // so the user never needs to remember or type a password.
  const derivePassword = (em) => {
    const str = em.trim().toLowerCase() + '_j0b4_24_s3cr3t_s4lt';
    let h1 = 5381, h2 = 0;
    for (let i = 0; i < str.length; i++) {
      h1 = ((h1 << 5) + h1) ^ str.charCodeAt(i);
      h1 |= 0;
    }
    for (let i = str.length - 1; i >= 0; i--) {
      h2 = ((h2 << 7) - h2) + str.charCodeAt(i);
      h2 |= 0;
    }
    return 'Jb24_' + Math.abs(h1).toString(36) + '_' + Math.abs(h2).toString(36) + '_x9';
  };

  // Google Play reviewer bypass — skip real OTP, use fixed code
  const isReviewerEmail = () => email.trim().toLowerCase() === 'hello@joba24.com';

  const handleEmailSubmit = async () => {
    if (!validateEmail(email)) return;

    // Reviewer account: go straight to OTP screen (fixed code 2424)
    if (isReviewerEmail()) {
      setMode('otp');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');
    const password = derivePassword(email);
    try {
      // Try register (new user) — OTP is sent automatically
      await base44.auth.register({ email: email.trim(), password });
      setMode('otp');
      return;
    } catch (regErr) {
      const regMsg = String(regErr?.response?.data?.detail || regErr?.message || '');
      if (/already|exists|registered/i.test(regMsg)) {
        // Existing user — try login with derived password
        try {
          await base44.auth.loginViaEmailPassword(email.trim(), password);
          onSuccess();
          return;
        } catch (loginErr) {
          const loginMsg = String(loginErr?.response?.data?.detail || loginErr?.message || '');
          if (/not verified|otp|verification/i.test(loginMsg)) {
            // Registered but email not verified — resend OTP
            try {
              await base44.auth.resendOtp(email.trim());
              setMode('otp');
              return;
            } catch {
              setError('לא הצלחנו לשלוח קוד. נסה שוב או התחבר עם Google.');
            }
          } else {
            // Registered via Google or other provider — can't login with email
            setError('האימייל רשום דרך Google. התחבר עם Google במקום.');
          }
        }
      } else {
        setError(regMsg || 'שגיאה. נסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length < 4) return;
    setLoading(true);
    setError('');
    try {
      const password = derivePassword(email);

      // Google Play reviewer bypass — fixed code 2424, skip real OTP verification
      if (isReviewerEmail() && otp.trim() === '2424') {
        try {
          await base44.auth.loginViaEmailPassword(email.trim(), password);
          onSuccess();
          return;
        } catch {
          // Account not yet created/verified — try register first, then login
          try {
            await base44.auth.register({ email: email.trim(), password });
            // Account created but unverified — can't login without real OTP.
            // Admin must pre-verify this account once.
            setError('חשבון הבדיקה אינו מאומת. יש לאמת אותו פעם אחת מראש.');
          } catch {
            setError('חשבון הבדיקה אינו מוגדר. יש ליצור ולאמת אותו פעם אחת מראש.');
          }
          return;
        }
      }

      await base44.auth.verifyOtp({ email: email.trim(), otpCode: otp.trim() });
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      onSuccess();
    } catch (err) {
      const msg = String(err?.response?.data?.detail || err?.message || '');
      setError(msg || 'קוד אימות שגוי, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await base44.auth.resendOtp(email.trim());
      setInfo('קוד חדש נשלח לאימייל שלך.');
    } catch {
      setError('שגיאה בשליחת קוד נוסף. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'otp') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 4px', width: 'fit-content' }}>
          <ArrowLeft size={14} /> חזרה
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>אימות באימייל</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          {isReviewerEmail()
            ? <>הזן את קוד הגישה עבור <strong style={{ color: 'var(--text-1)' }}>{email}</strong>.</>
            : <>שלחנו קוד אימות ל-<strong style={{ color: 'var(--text-1)' }}>{email}</strong>. הזן את הקוד שקיבלת.</>}
        </div>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          placeholder="123456"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') handleVerifyOtp(); }}
          autoFocus
          style={{ width: '100%', height: 52, borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '0 16px', fontSize: 18, letterSpacing: 4, background: 'var(--surface-3)', color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
        />
        {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
        {info && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{info}</div>}
        <button
          onClick={handleVerifyOtp}
          disabled={loading || otp.trim().length < 4}
          style={{
            width: '100%', height: 52, borderRadius: 16,
            background: otp.trim().length >= 4 ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#e2e8f0',
            color: otp.trim().length >= 4 ? 'white' : '#94a3b8',
            fontWeight: 800, fontSize: 15, border: 'none',
            cursor: otp.trim().length >= 4 ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'אמת והתחבר'}
        </button>
        <button
          onClick={handleResendOtp}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: '#1a6fd4', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', padding: 0, textAlign: 'center', width: '100%' }}
        >
          שלח קוד נוסף
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 4px', width: 'fit-content' }}>
        <ArrowLeft size={14} /> חזרה
      </button>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>כניסה עם אימייל</div>
      <input
        type="email"
        dir="ltr"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleEmailSubmit(); }}
        autoFocus
        style={{ width: '100%', height: 52, borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '0 16px', fontSize: 15, background: 'var(--surface-3)', color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' }}
      />
      {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, lineHeight: 1.5 }}>{error}</div>}
      {info && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, lineHeight: 1.5 }}>{info}</div>}
      <button
        onClick={handleEmailSubmit}
        disabled={loading || !validateEmail(email)}
        style={{
          width: '100%', height: 52, borderRadius: 16,
          background: validateEmail(email) ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#e2e8f0',
          color: validateEmail(email) ? 'white' : '#94a3b8',
          fontWeight: 800, fontSize: 15, border: 'none',
          cursor: validateEmail(email) ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <><Mail size={16} /> שלח קוד אימות</>}
      </button>
      <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>נשלח קוד אימות לאימייל שלך. משתמשים חדשים ירשמו אוטומטית — ללא צורך בסיסמה.</div>
    </div>
  );
}

export default function LoginPromptModal({ onLogin, onClose, type = 'apply' }) {
  const [showEmail, setShowEmail] = useState(false);

  // Ensure the ref code survives the OAuth redirect even if the user navigated away from the original referral URL
  const getRedirectUrl = () => {
    let url = window.location.href;
    const refCode = localStorage.getItem('joba24_ref_code');
    if (refCode && !url.includes('ref=')) {
      url += (url.includes('?') ? '&' : '?') + `ref=${refCode}`;
    }
    return url;
  };

  const handleGoogle = () => base44.auth.loginWithProvider('google', getRedirectUrl());
  const handleApple = () => base44.auth.loginWithProvider('apple', getRedirectUrl());
  const handleFacebook = () => base44.auth.loginWithProvider('facebook', getRedirectUrl());

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
            <EmailForm onBack={() => setShowEmail(false)} onSuccess={() => { onLogin?.(); window.location.reload(); }} />
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
                  onClick={() => setShowEmail(true)}
                  label="המשך עם אימייל"
                  border="#bfdbfe"
                  color="#1a6fd4"
                  icon={<Mail size={16} color="#1a6fd4" />}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: '#e8edf5' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>או</span>
                  <div style={{ flex: 1, height: 1, background: '#e8edf5' }} />
                </div>

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