import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ArrowRight, Smartphone, X } from 'lucide-react';

// OAuth landing page — loaded in the EXTERNAL browser (SFSafariViewController /
// Chrome Custom Tab) after the provider redirects back with the access_token.
//
// The Capacitor bridge is NOT available in the external browser. We persist
// the token to a server handshake (keyed by `sid`) so the native app can poll
// for it. Once the token is stored, ANY way the user returns to the app
// (system back button, our button, closing the tab) completes login.
//
// IMPORTANT: window.close() does NOT work in a Chrome Custom Tab (Android).
// There is no JS API to programmatically dismiss it. So the return screen:
//   1. Tries window.close() + history.back() (works in some Safari/SFSafari setups).
//   2. Tries to re-open the app via joba24:// / intent:// (instant if registered).
//   3. As a fallback, shows a crystal-clear visual guide telling the user to
//      press the system back / X button — which always works.
export default function AuthCallback() {
  const [status, setStatus] = useState('loading'); // loading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const hasCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    if (hasCapacitor) {
      window.location.replace('/');
      return;
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const params = new URLSearchParams(window.location.search);

    // Fallback landing after a failed intent:// (no joba24:// intent-filter in
    // the Android auto-build). Token was already stored server-side on the
    // first load — just present the return screen.
    if (params.get('done') === '1') {
      setStatus('done');
      try {
        sessionStorage.removeItem('joba24_oauth_token');
        sessionStorage.removeItem('joba24_oauth_sid');
      } catch {}
      return;
    }

    const token = sessionStorage.getItem('joba24_oauth_token') || params.get('access_token') || '';
    const sid = sessionStorage.getItem('joba24_oauth_sid') || params.get('sid') || '';

    if (!token) {
      setStatus('error');
      setErrorMsg('לא התקבל טוקן. נסה שוב מתוך האפליקציה.');
      return;
    }

    (async () => {
      try {
        await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
        setStatus('done');
        try {
          sessionStorage.removeItem('joba24_oauth_token');
          sessionStorage.removeItem('joba24_oauth_sid');
        } catch {}
        // Try an instant return via custom scheme. On iOS joba24:// is registered
        // in Info.plist → appUrlOpen fires. On Android with a custom AAB the
        // intent-filter opens the app; on the auto-build it falls through to
        // the ?done=1 fallback which just shows this same return screen.
        try {
          if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`);
          } else {
            const fallback = encodeURIComponent(`${window.location.origin}/auth-callback?done=1`);
            window.location.replace(`intent://auth-callback?access_token=${encodeURIComponent(token)}#Intent;scheme=joba24;package=com.base69e6bdb4986a04a256653a23.app;S.browser_fallback_url=${fallback};end`);
          }
        } catch {}
      } catch (e) {
        setStatus('error');
        setErrorMsg((e && e.message) || 'שגיאה בשמירת הטוקן.');
      }
    })();
  }, []);

  // The "Return to App" button. No single JS call reliably dismisses a
  // Chrome Custom Tab, so we try several methods in sequence. The token is
  // already stored server-side, so whatever brings the app back to the
  // foreground completes login.
  const handleReturn = () => {
    const token = sessionStorage.getItem('joba24_oauth_token') || '';
    // 1) Try to re-open the app directly via the custom scheme / intent.
    try {
      if (isIOS) {
        window.location.href = `joba24://auth-callback${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
      } else {
        const fallback = encodeURIComponent(`${window.location.origin}/auth-callback?done=1`);
        window.location.href = `intent://auth-callback${token ? `?access_token=${encodeURIComponent(token)}` : ''}#Intent;scheme=joba24;package=com.base69e6bdb4986a04a256653a23.app;S.browser_fallback_url=${fallback};end`;
      }
    } catch {}
    // 2) Best-effort dismiss / navigate back (works in some SFSafari + web setups).
    setTimeout(() => {
      try { window.close(); } catch {}
      try { history.back(); } catch {}
    }, 300);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
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
      {status === 'loading' && (
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      )}

      {status === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 380, width: '100%' }}>
          {/* Success badge */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'var(--color-success-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(22,163,74,0.25)',
          }}>
            <CheckCircle2 size={50} color="#16a34a" strokeWidth={2.4} />
          </div>

          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1)', marginBottom: 10, lineHeight: 1.2 }}>
              התחברת בהצלחה! 🎉
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, fontWeight: 500 }}>
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
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
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
            border: '1px solid var(--border-1)',
            borderRadius: 14, padding: '14px 16px', width: '100%',
            boxSizing: 'border-box',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isIOS ? <X size={20} color="#475569" /> : <ArrowRight size={20} color="#475569" style={{ transform: 'scaleX(-1)' }} />}
            </div>
            <div style={{ textAlign: 'right', flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4 }}>
                הכפתור לא עובד?
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                {isIOS
                  ? 'לחצ/י על "סיום" (Done) בראש המסך כדי לחזור לאפליקציה.'
                  : 'לחצ/י על ה"חזרה" (◄) או ה"X" בתחתית המסך — האפליקציה תמשיך אוטומטית.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 12, fontWeight: 500 }}>
            <Smartphone size={13} />
            ההתחברות נשמרה — האפליקציה תזהה אותך מיד כשתחזור
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', maxWidth: 320 }}>{errorMsg}</div>
      )}
    </div>
  );
}