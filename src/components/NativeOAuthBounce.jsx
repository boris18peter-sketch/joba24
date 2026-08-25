import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ArrowRight } from 'lucide-react';

// Fallback return screen for the native OAuth flow when the backend redirect
// lands on a page OTHER than /auth-callback (e.g. the custom domain redirected
// to the root but preserved the `sid` query). The dedicated /auth-callback route
// is handled by AuthCallback.jsx; this covers the remaining edge case via the
// `sid` sessionStorage signal (set by index.html from the URL query).
//
// Android-only (iOS returns via the registered joba24:// scheme). Gated on the
// `sid` so the web/PWA flow (which never sets a sid) is never affected.

const RETURN_FLAG = 'joba24_auth_return';

export default function NativeOAuthBounce() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [returnToken, setReturnToken] = useState(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // only in the external browser
    if (window.location.pathname === '/auth-callback') return; // AuthCallback handles it

    const android = /android/i.test(navigator.userAgent);
    if (!android) return;

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');
    // The Base44 OAuth backend often ignores from_url and redirects to the
    // app's canonical base44.app domain (dropping the sid). Landing there with
    // a fresh token is the native-flow signature on Android — the web/PWA flow
    // returns to the branded custom domain (joba24.com), not base44.app.
    const isBase44Domain = window.location.hostname.includes('base44.app');
    const isNativeFlow = !!sid || isBase44Domain;

    if (!token) {
      if (isNativeFlow && sessionStorage.getItem(RETURN_FLAG) === '1') setShowOverlay(true);
      return;
    }

    // Token present — store the handshake (always) so the native poll fallback
    // retrieves it even if the redirect dropped the sid.
    sessionStorage.removeItem('joba24_oauth_token');
    sessionStorage.removeItem('joba24_oauth_sid');
    (async () => {
      try {
        await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
      } catch {}
    })();

    if (isNativeFlow) {
      sessionStorage.setItem(RETURN_FLAG, '1');
      setReturnToken(token);
      setShowOverlay(true);
    }
  }, []);

  if (!showOverlay) return null;

  const handleReturn = () => {
    // Fire the joba24:// custom scheme — the Android intent-filter opens the
    // app instantly; NativeAuthListener's appUrlOpen completes the login.
    // window.close/history.back are fallbacks for builds without the intent-filter.
    if (returnToken) {
      try {
        window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(returnToken)}`);
        return;
      } catch {}
    }
    // No intent-filter / scheme not handled — do NOT navigate back (that would
    // send the user to the OAuth provider). Login completes via NativeAuthListener's
    // browserFinished when the user dismisses the Custom Tab with the system back/close.
    try { window.close(); } catch {}
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483647,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg,#f2f5fb 0%,#eaf0fb 100%)',
        padding: 24, textAlign: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
      dir="rtl"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, maxWidth: 380, width: '100%' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(22,163,74,0.25)',
        }}>
          <CheckCircle2 size={50} color="#16a34a" strokeWidth={2.4} />
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0d1e40', marginBottom: 10, lineHeight: 1.2 }}>
            התחברת בהצלחה! 🎉
          </div>
          <div style={{ fontSize: 15, color: '#4b6083', lineHeight: 1.6, fontWeight: 500 }}>
            כדי לחזור לאפליקציה, לחץ על כפתור ה<strong>חזור ◄</strong> או ה<strong>X</strong> בדפדפן. ההתחברות תושלם אוטומטית.
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, fontWeight: 600, marginTop: 6 }}>
            או לחץ על הכפתור למטה כדי לנסות לפתוח את האפליקציה ישירות.
          </div>
        </div>
        <button
          onClick={handleReturn}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', minHeight: 64, borderRadius: 18,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 19, border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(26,111,212,0.4)',
          }}
        >
          <ArrowRight size={22} style={{ transform: 'scaleX(-1)' }} />
          המשך באפליקציה
        </button>
      </div>
    </div>
  );
}