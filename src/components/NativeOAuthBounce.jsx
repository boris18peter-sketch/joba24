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

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // only in the external browser
    if (window.location.pathname === '/auth-callback') return; // AuthCallback handles it

    const android = /android/i.test(navigator.userAgent);
    if (!android) return;

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');
    const isNativeFlow = !!sid;

    if (!token) {
      if (sessionStorage.getItem(RETURN_FLAG) === '1') setShowOverlay(true);
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
          <div style={{ fontSize: 16, color: '#4b6083', lineHeight: 1.6, fontWeight: 500 }}>
            החיבור הושלם. לחצ/י על הכפתור כדי לחזור לאפליקציה.
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