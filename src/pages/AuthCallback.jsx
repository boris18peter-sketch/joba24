import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, ArrowRight } from 'lucide-react';

// OAuth landing page — loaded in the EXTERNAL browser (SFSafariViewController /
// Chrome Custom Tab) after the provider redirects back with the access_token.
//
// The Capacitor bridge is NOT available in the external browser. We persist
// the token to a server handshake (keyed by `sid`) so the native app can poll
// for it — this works on Android where the joba24:// custom scheme isn't
// registered in the auto-build. On iOS we ALSO bounce to joba24:// for an
// instant return.
//
// Android fallback flow:
//   1st load (?access_token=...): store token server-side, fire intent:// to
//     try opening the app. If the joba24:// intent-filter is registered (custom
//     AAB), the app opens instantly. If not (Base44 auto-build), Chrome opens
//     the fallback URL /auth-callback?done=1.
//   2nd load (?done=1): the token is already stored — just show the manual
//     "return to app" screen and try window.close().
export default function AuthCallback() {
  const [status, setStatus] = useState('loading'); // loading | done | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const hasCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    if (hasCapacitor) {
      // Opened inside the app somehow — just go home.
      window.location.replace('/');
      return;
    }

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
      // Some Chrome Custom Tab configurations honor window.close().
      try { window.close(); } catch {}
      return;
    }

    // The inline script in index.html captures the token from the URL BEFORE
    // the app module strips it (appParams removes access_token at import), so
    // prefer sessionStorage. Fall back to URL params for the plain web path.
    const token = sessionStorage.getItem('joba24_oauth_token') || params.get('access_token') || '';
    const sid = sessionStorage.getItem('joba24_oauth_sid') || params.get('sid') || '';

    if (!token) {
      setStatus('error');
      setErrorMsg('לא התקבל טוקן. נסה שוב מתוך האפליקציה.');
      return;
    }

    (async () => {
      try {
        // Store the token on the server so the native app can poll for it.
        // sid may be null when the backend drops it from from_url — the app
        // then finds the token via the "most recent record" poll fallback.
        await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid: sid || null, token });
        setStatus('done');
        try {
          sessionStorage.removeItem('joba24_oauth_token');
          sessionStorage.removeItem('joba24_oauth_sid');
        } catch {}
        try {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            // iOS: joba24:// is registered in Info.plist → appUrlOpen fires → instant return.
            window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`);
          } else {
            // Android: bounce via intent:// with a fallback. If the app is installed
            // WITH a joba24:// intent-filter in AndroidManifest.xml (custom AAB build),
            // Chrome opens the app instantly and appUrlOpen fires → instant return.
            // If the intent-filter is absent (Base44 auto-build), Chrome opens the
            // fallback URL (/auth-callback?done=1) which shows the manual return
            // screen below; the native app completes login via handshake polling
            // when the user returns to it.
            const fallback = encodeURIComponent(`${window.location.origin}/auth-callback?done=1`);
            window.location.replace(`intent://auth-callback?access_token=${encodeURIComponent(token)}#Intent;scheme=joba24;package=com.base69e6bdb4986a04a256653a23.app;S.browser_fallback_url=${fallback};end`);
          }
        } catch {}
        // Nudge the browser to close — works in some Chrome Custom Tab setups.
        try { window.close(); } catch {}
      } catch (e) {
        setStatus('error');
        setErrorMsg((e && e.message) || 'שגיאה בשמירת הטוקן.');
      }
    })();
  }, []);

  const handleReturn = () => {
    try { window.close(); } catch {}
    // If window.close() didn't work (most Custom Tabs), the user just stays on
    // this screen and taps the system back button — the app then polls and
    // completes login.
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-1)',
        padding: 24,
        textAlign: 'center',
      }}
      dir="rtl"
    >
      {status === 'loading' && (
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      )}
      {status === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 360 }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'var(--color-success-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={44} color="#16a34a" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>
              התחברת בהצלחה!
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6 }}>
              לחצ/י על הכפתור למטה כדי לחזור ל-Joba24.
            </div>
          </div>
          <button
            onClick={handleReturn}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              color: 'white', fontWeight: 800, fontSize: 17, border: 'none',
              cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,111,212,0.35)',
            }}
          >
            <ArrowRight size={20} style={{ transform: 'scaleX(-1)' }} />
            חזור ל-Joba24
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            לא קרה כלום? סגור/י את הדפדפן עם כפתור ה"חזור" של הטלפון (← למטה) — האפליקציה תמשיך אוטומטית.
          </div>
        </div>
      )}
      {status === 'error' && (
        <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>{errorMsg}</div>
      )}
    </div>
  );
}