import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ArrowRight, Smartphone } from 'lucide-react';

// Runs in the EXTERNAL browser (SFSafariViewController / Chrome Custom Tab) after
// OAuth redirects back with the access token. The token + sid are captured from
// the URL by an inline script in index.html (before the app module strips the
// token) and stashed in sessionStorage.
//
//   • ALWAYS stores the server handshake when a token is present — the native
//     app polls it and its "most recent record" fallback retrieves the token
//     even if the redirect dropped the `sid`. (Harmless orphan in the pure web
//     flow; cleaned up after 10 min.)
//   • iOS: fires the registered joba24:// scheme (Info.plist) for an instant
//     return. No overlay — iOS works via the scheme.
//   • Android (auto-build has no joba24:// intent-filter): shows a full-screen
//     "return to app" overlay. The user presses the system back / X button,
//     NativeAuthListener fires browserFinished → polls the handshake →
//     completes login. The overlay persists across reloads via a flag.
//
// The overlay is Android-only and gated on a native-flow signal (sid OR the
// /auth-callback path) so the web/PWA flow on Android is never affected.

const RETURN_FLAG = 'joba24_auth_return';

export default function NativeOAuthBounce() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // only in the external browser

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const android = /android/i.test(ua);

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');
    const onAuthCallbackPath = window.location.pathname === '/auth-callback';
    const isNativeFlow = !!sid || onAuthCallbackPath;

    if (!token) {
      // Reload after an intent fallback — keep the Android return screen visible.
      if (android && sessionStorage.getItem(RETURN_FLAG) === '1') setShowOverlay(true);
      return;
    }

    // Token present — store the handshake immediately (always, not gated on
    // native-flow detection) so the native app's poll fallback can retrieve it
    // even when the redirect dropped the sid.
    sessionStorage.removeItem('joba24_oauth_token');
    sessionStorage.removeItem('joba24_oauth_sid');
    (async () => {
      try {
        await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
      } catch {}
    })();

    if (ios) {
      // iOS: registered joba24:// scheme → appUrlOpen → instant return.
      if (isNativeFlow) {
        try { window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`); } catch {}
      }
      return;
    }

    if (android && isNativeFlow) {
      // Android: no scheme available — show the return overlay.
      sessionStorage.setItem(RETURN_FLAG, '1');
      setShowOverlay(true);
      try { window.close(); } catch {}
    }
  }, []);

  if (!showOverlay) return null;

  const handleReturn = () => {
    try { window.close(); } catch {}
    try { history.back(); } catch {}
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg,#f2f5fb 0%,#eaf0fb 100%)',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
      dir="rtl"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 380, width: '100%' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(22,163,74,0.25)',
        }}>
          <CheckCircle2 size={50} color="#16a34a" strokeWidth={2.4} />
        </div>

        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0d1e40', marginBottom: 10, lineHeight: 1.2 }}>
            התחברת בהצלחה! 🎉
          </div>
          <div style={{ fontSize: 16, color: '#4b6083', lineHeight: 1.6, fontWeight: 500 }}>
            החיבור הושלם. לחצ/י על ה"חזרה" (◄) או ה"X" בתחתית המסך — האפליקציה תמשיך אוטומטית.
          </div>
        </div>

        <button
          onClick={handleReturn}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', minHeight: 64, borderRadius: 18,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 19, border: 'none',
            cursor: 'pointer', boxShadow: '0 10px 30px rgba(26,111,212,0.4)',
          }}
        >
          <ArrowRight size={22} style={{ transform: 'scaleX(-1)' }} />
          חזור ל-Joba24
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.7)', border: '1px solid #e4eaf5',
          borderRadius: 14, padding: '14px 16px', width: '100%', boxSizing: 'border-box',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#eef3fc',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <ArrowRight size={20} color="#475569" style={{ transform: 'scaleX(-1)' }} />
          </div>
          <div style={{ textAlign: 'right', flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1e40', lineHeight: 1.4 }}>הכפתור לא עובד?</div>
            <div style={{ fontSize: 13, color: '#4b6083', lineHeight: 1.5 }}>
              לחצ/י על מקש ה"חזרה" במכשיר או על ה"X" בדפדפן — האפליקציה תזהה אותך מיד.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>
          <Smartphone size={13} />
          ההתחברות נשמרה — האפליקציה תזהה אותך מיד כשתחזור
        </div>
      </div>
    </div>
  );
}