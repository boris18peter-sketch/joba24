import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ArrowRight } from 'lucide-react';

// The native OAuth callback route (/auth-callback). The native LoginPromptModal
// sets from_url to https://joba24.com/auth-callback?sid=…, and the backend
// redirects here after auth with the access_token appended. index.html captures
// the token + sid into sessionStorage before this module loads.
//
// This route IS the native-flow signal (the web/PWA flow never uses /auth-callback
// — it returns to whatever page the user was on), so there's no detection
// ambiguity: if we're here in the external browser, it's a native OAuth callback.
//
//   • Stores the server handshake (the native app polls it to retrieve the token).
//   • iOS: fires the registered joba24:// scheme for an instant return.
//   • Android (no joba24:// intent-filter in the auto-build): shows a full-screen
//     "Continue in app" return screen. The user presses the system back / X button,
//     NativeAuthListener fires browserFinished → polls the handshake → completes
//     login. The screen persists across reloads via the RETURN_FLAG.

const RETURN_FLAG = 'joba24_auth_return';

export default function AuthCallback() {
  const [showReturn, setShowReturn] = useState(false);
  const [returnToken, setReturnToken] = useState(null);

  useEffect(() => {
    // Inside the native app's own WebView this route shouldn't render — bail.
    if (Capacitor.isNativePlatform()) {
      window.location.replace('/');
      return;
    }

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const android = /android/i.test(ua);

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');

    if (token) {
      sessionStorage.removeItem('joba24_oauth_token');
      sessionStorage.removeItem('joba24_oauth_sid');
      sessionStorage.setItem(RETURN_FLAG, '1');
      (async () => {
        const storeWithRetry = async (attempt) => {
          try {
            await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
            console.log('[AuthCallback] ✅ token stored in handshake (attempt ' + attempt + ')');
          } catch (err) {
            console.error('[AuthCallback] store attempt ' + attempt + ' failed:', err?.message);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 500));
              return storeWithRetry(attempt + 1);
            }
          }
        };
        storeWithRetry(1);
      })();
      if (ios) {
        try { window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`); } catch {}
        return;
      }
      if (android) {
        setReturnToken(token);
        setShowReturn(true);
        return;
      }
    } else if (android && sessionStorage.getItem(RETURN_FLAG) === '1') {
      // Reload / intent fallback — keep the return screen visible.
      setShowReturn(true);
    }
  }, []);

  if (!showReturn) return null;

  const handleReturn = () => {
    // Fire the joba24:// custom scheme — the Android intent-filter
    // (scripts/patch-android-manifest.py) opens the app instantly; NativeAuthListener's
    // appUrlOpen completes the login. window.close/history.back are fallbacks.
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