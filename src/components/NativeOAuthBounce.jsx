import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ArrowRight, Smartphone, X } from 'lucide-react';

// Runs in the EXTERNAL browser (SFSafariViewController / Chrome Custom Tab) after
// OAuth redirects back with the access token. The token + sid are captured from
// the URL by an inline script in index.html (before the app module strips the
// token) and stashed in sessionStorage. Whatever page the redirect lands on
// (home, /auth-callback, …), this:
//   1. Relays the token to the server handshake so the native app can poll for it.
//   2. Shows a full-screen "return to app" overlay so the user is never left
//      looking at the web app's HomeFeed with no way back.
// The overlay persists across the intent-fallback reload via a sessionStorage
// flag, so it stays until the user dismisses the Custom Tab (back / X) — at
// which point the native app's NativeAuthListener polls the handshake and
// completes login. No custom-scheme intent-filter is required.
//
// Gated on `sid` presence: the web/PWA login flow does NOT set a sid, so this
// overlay only appears for the native-app OAuth flow (where a return screen is
// actually needed).

const RETURN_FLAG = 'joba24_auth_return';

export default function NativeOAuthBounce() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // only in the external browser

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    setIsIOS(ios);

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');
    // Native flow is signaled by either a `sid` (LoginPromptModal puts it in the
    // from_url) OR the redirect landing on /auth-callback (the native from_url
    // path). The backend sometimes drops `sid` from the from_url, so the path
    // check is a fallback signal. The web/PWA flow never sets a sid and never
    // redirects to /auth-callback, so it is never affected.
    const isNativeFlow = !!sid || window.location.pathname === '/auth-callback';

    if (token && isNativeFlow) {
      // First load after a NATIVE OAuth callback — store the handshake and show
      // the return screen. Clear the raw token from sessionStorage but keep a
      // "return" flag so the overlay survives the intent-fallback reload.
      sessionStorage.removeItem('joba24_oauth_token');
      sessionStorage.removeItem('joba24_oauth_sid');
      sessionStorage.setItem(RETURN_FLAG, '1');
      setShowOverlay(true);
      (async () => {
        try {
          await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
        } catch {}
        // iOS: joba24:// is registered in Info.plist → appUrlOpen fires → instant
        // return. The overlay stays as a fallback if the scheme doesn't open.
        if (ios) {
          try { window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`); } catch {}
        }
        // Android (auto-build): the joba24:// intent-filter is NOT registered, so
        // firing intent:// just reloads this page (fallback) and would flash the
        // web app. Instead we keep the overlay and rely on the handshake poll —
        // the user presses the system back / X button to return, NativeAuthListener
        // fires browserFinished → pollBurst → login completes. Best-effort close:
        try { window.close(); } catch {}
      })();
    } else if (sessionStorage.getItem(RETURN_FLAG) === '1') {
      // Reload after an intent fallback (or a navigation) — keep the return
      // screen visible so the user always has a clear way back.
      setShowOverlay(true);
    }
  }, []);

  if (!showOverlay) return null;

  const handleReturn = () => {
    if (isIOS) {
      try { window.location.href = 'joba24://auth-callback'; } catch {}
    } else {
      try { window.close(); } catch {}
      try { history.back(); } catch {}
    }
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
        {/* Success badge */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'var(--color-success-bg, #f0fdf4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(22,163,74,0.25)',
        }}>
          <CheckCircle2 size={50} color="#16a34a" strokeWidth={2.4} />
        </div>

        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1, #0d1e40)', marginBottom: 10, lineHeight: 1.2 }}>
            התחברת בהצלחה! 🎉
          </div>
          <div style={{ fontSize: 16, color: 'var(--text-2, #4b6083)', lineHeight: 1.6, fontWeight: 500 }}>
            החיבור הושלם. לחצ/י על הכפתור כדי לחזור ל-Joba24.
          </div>
        </div>

        {/* Big primary return button */}
        <button
          onClick={handleReturn}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', minHeight: 64, borderRadius: 18,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 19, border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(26,111,212,0.4)',
            transition: 'transform 0.12s ease',
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ArrowRight size={22} style={{ transform: 'scaleX(-1)' }} />
          חזור ל-Joba24
        </button>

        {/* Visual guide — the system back button */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid #e4eaf5',
          borderRadius: 14, padding: '14px 16px', width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#eef3fc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isIOS ? <X size={20} color="#475569" /> : <ArrowRight size={20} color="#475569" style={{ transform: 'scaleX(-1)' }} />}
          </div>
          <div style={{ textAlign: 'right', flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1, #0d1e40)', lineHeight: 1.4 }}>
              הכפתור לא עובד?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2, #4b6083)', lineHeight: 1.5 }}>
              {isIOS
                ? 'לחצ/י על "סיום" (Done) בראש המסך כדי לחזור לאפליקציה.'
                : 'לחצ/י על ה"חזרה" (◄) או ה"X" בתחתית המסך — האפליקציה תמשיך אוטומטית.'}
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