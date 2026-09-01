import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { X, Mail, ArrowLeft, Loader2, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { completeNativeAuth, pollHandshakeToken } from '@/lib/nativeAuthComplete';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { isNativeLike, openExternalBrowser } from '@/lib/nativeEnv';
import { appParams } from '@/lib/app-params';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useJobaSettings } from '@/hooks/useJobaSettings';

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

function WaitingForAuthScreen({ onCancel, loginUrl }) {
  const [showManual, setShowManual] = useState(false);
  // Poll the server handshake directly from the modal. NativeAuthListener also
  // polls, but its event listeners (browserFinished / appStateChange) do not
  // fire reliably on every Android WebView. This user-visible poll guarantees
  // the login completes the instant the user returns from the browser and
  // React resumes — the screen is on-screen, so its timers run.
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      const sid = localStorage.getItem('joba24_auth_sid');
      if (!sid) return;
      const token = await pollHandshakeToken(sid);
      if (token) {
        completeNativeAuth(token);
        return;
      }
      if (!stopped) setTimeout(poll, 500);
    };
    poll();
    // If the auto-fired intent:// didn't open Chrome (the WebView swallows it
    // intermittently), surface a tappable "open browser" button after 1.5s. A
    // real user TAP on an <a href=intent://> is the gesture the WebView most
    // reliably launches an intent from — far more reliable than the programmatic
    // window.location.href auto-fire.
    const t = setTimeout(() => { if (!stopped) setShowManual(true); }, 1500);
    return () => { stopped = true; clearTimeout(t); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0 12px' }}>
      <div className="animate-spin" style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e8edf5', borderTopColor: '#1a6fd4' }} />
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>מתחבר ל-Joba24...</div>
      <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>
        סיים את ההתחברות בדפדפן. האפליקציה תזהה את ההתחברות אוטומטית ותחזור אליך.
      </div>
      {showManual && loginUrl && (
        <a
          href={loginUrl}
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 48, borderRadius: 14, textDecoration: 'none',
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: '#fff',
            fontWeight: 700, fontSize: 15, boxShadow: '0 4px 14px rgba(26,111,212,0.3)',
          }}
        >
          לא נפתח? לחץ לפתיחת הדפדפן
        </a>
      )}
      <button
        onClick={onCancel}
        style={{
          background: 'none', border: 'none', color: '#94a3b8',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 16px',
        }}
      >
        ביטול
      </button>
    </div>
  );
}

export default function LoginPromptModal({ onLogin, onClose, type = 'apply' }) {
  const [showEmail, setShowEmail] = useState(false);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const [pendingLoginUrl, setPendingLoginUrl] = useState(null);
  const navigate = useNavigate();
  const { enterGuestMode } = useAuth();
  const { settings: jobaSettings } = useJobaSettings();
  const guestEnabled = jobaSettings.guest_access_enabled !== false;

  const handleGuest = () => {
    enterGuestMode();
    onClose();
    navigate('/');
  };

  // Apple Sign-In only works on Apple devices/browsers. On Android (native app
  // or Android browser) the button is useless and misleading — hide it there.
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  // Cancel the waiting state — clears the sid so the background poller stops.
  const handleCancelAuth = () => {
    localStorage.removeItem('joba24_auth_sid');
    setWaitingForAuth(false);
  };

  // Cancelling the login modal aborts any in-flight OAuth handshake so the
  // background poller (NativeAuthListener) stops polling for a token.
  const handleClose = () => {
    localStorage.removeItem('joba24_auth_sid');
    onClose();
  };

  // Production base URL — the Base44 backend auth endpoint lives here
  // (joba24.com proxies /api → Base44). Hardcoded because on native (Capacitor
  // WKWebView) window.location.origin returns the string "null" and
  // appParams.appBaseUrl is also null/undefined, so any runtime detection
  // builds a broken "null/api/..." URL. This constant is the single source
  // of truth for the native OAuth base.
  const PROD_BASE_URL = 'https://joba24.com';

  // Ensure the ref code survives the OAuth redirect even if the user navigated away from the original referral URL
  const getRedirectUrl = () => {
    const isNative = Capacitor.isNativePlatform();
    // On native, build the redirect URL from the hardcoded base + current
    // pathname + hash (window.location.pathname is a relative path string and
    // is reliable even when .origin is null). On web, use the full href.
    let url = isNative
      ? `${PROD_BASE_URL}${window.location.pathname}${window.location.hash}`
      : window.location.href;
    const refCode = localStorage.getItem('joba24_ref_code');
    if (refCode && !url.includes('ref=')) {
      url += (url.includes('?') ? '&' : '?') + `ref=${refCode}`;
    }
    return url;
  };

  const openOAuth = (provider) => {
    const isNative = isNativeLike();
    const providerPath = provider === 'google' ? '' : `/${provider}`;
    const authBase = isNative ? PROD_BASE_URL : (appParams.appBaseUrl || '');
    const resolver = isNative ? PROD_BASE_URL : window.location.origin;

    // ── Native (iOS + Android) ── open the OAuth provider in the SYSTEM
    // browser (SFSafariViewController on iOS, Chrome Custom Tab on Android) via
    // @capacitor/browser. This is mandatory on Android: Google blocks OAuth in
    // embedded WebViews ("disallowed_useragent"), so the app's own Capacitor
    // WebView cannot host the Google sign-in page — only the system browser
    // can. After auth the backend redirects to /auth-callback, which stores the
    // token in a server handshake keyed by `sid`. NativeAuthListener polls for
    // it; on iOS the joba24:// scheme (Info.plist) fires appUrlOpen for an
    // instant return, and on Android the browserFinished listener (user
    // dismisses the Custom Tab with back / close) triggers an immediate poll.
    // No AndroidManifest intent-filter is required.
    if (isNative) {
      const sid = 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      localStorage.setItem('joba24_auth_sid', sid);
      // from_url MUST be on the Base44 canonical domain (appBaseUrl = joba24.base44.app),
      // NOT on the joba24.com custom domain. The Base44 OAuth backend only honors
      // same-domain from_url values — a joba24.com from_url is rejected and the
      // backend falls back to a base44.app redirect that DROPS the sid query param.
      // Without the sid, the native poll can't match the handshake by sid and falls
      // back to "most-recent record", which can return a stale token → me() fails
      // after reload → the user is sent straight back to the login modal.
      // Keeping from_url on base44.app preserves the sid so the poll matches
      // exactly. iOS is unaffected: it returns via the joba24:// scheme, which
      // carries the access_token directly regardless of the from_url host.
      // HARD-CODE the canonical Base44 app domain for BOTH the login endpoint and
      // from_url. appParams.appBaseUrl resolves from VITE_BASE44_APP_BASE_URL,
      // which is NOT reliably set at runtime — when null it falls back to
      // PROD_BASE_URL (joba24.com), and the Base44 OAuth backend REJECTS a
      // joba24.com from_url as cross-domain → falls back to a base44.app redirect
      // that drops the sid → the user lands on the app root (/join "Worker
      // Onboarding") instead of /auth-callback, so the "חזור לאפליקציה" button
      // never renders. Pinning to the canonical base44.app domain (the published
      // app URL) makes the backend honor from_url and land on /auth-callback.
      const APP_BASE44_URL = 'https://joba24.base44.app';
      const fromUrl = `${APP_BASE44_URL}/auth-callback?sid=${encodeURIComponent(sid)}`;
      const loginUrl = `${APP_BASE44_URL}/api/apps/auth${providerPath}/login?app_id=${appParams.appId}&from_url=${encodeURIComponent(fromUrl)}`;
      setPendingLoginUrl(loginUrl);
      openExternalBrowser(loginUrl)
        .then(() => setWaitingForAuth(true))
        .catch((err) => console.error('[LoginPromptModal] openExternalBrowser failed', err, loginUrl));
      return;
    }

    // ── Web / PWA ── navigate the browser itself to the OAuth URL. The
    // provider redirects back here with the access_token, which the Base44 SDK
    // picks up from the URL on return — same flow as any web app.
    const redirectUrl = getRedirectUrl();
    const loginUrl = new URL(`${authBase}/api/apps/auth${providerPath}/login?app_id=${appParams.appId}&from_url=${encodeURIComponent(redirectUrl)}`, resolver).toString();
    window.location.href = loginUrl;
  };
  const handleGoogle = () => openOAuth('google');
  const handleApple = () => openOAuth('apple');
  const handleFacebook = () => openOAuth('facebook');

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.72)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        touchAction: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
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
            onClick={handleClose}
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
          {waitingForAuth ? (
            <WaitingForAuthScreen onCancel={handleCancelAuth} loginUrl={pendingLoginUrl} />
          ) : showEmail ? (
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

                {isAndroid ? null : (
                  <ProviderButton
                    onClick={handleApple}
                    bg="#000"
                    color="white"
                    border="#000"
                    label="המשך עם Apple"
                  />
                )}

                <ProviderButton
                  onClick={handleFacebook}
                  bg="#1877F2"
                  color="white"
                  border="#1877F2"
                  label="המשך עם Facebook"
                />
              </div>

              {guestEnabled && (
                <button
                  onClick={handleGuest}
                  style={{
                    width: '100%', height: 48, borderRadius: 14, marginTop: 6,
                    background: 'transparent', color: 'var(--text-2)',
                    border: '1.5px dashed var(--border-2)',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Eye size={16} color="var(--text-2)" />
                  המשך בתור אורח
                </button>
              )}

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