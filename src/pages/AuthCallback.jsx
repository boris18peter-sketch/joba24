import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';

// OAuth landing page — loaded in the EXTERNAL browser (SFSafariViewController /
// Chrome Custom Tab) after the provider redirects back with the access_token.
//
// The Capacitor bridge is NOT available in the external browser. We persist
// the token to a server handshake (keyed by `sid`) so the native app can poll
// for it — this works on Android where the joba24:// custom scheme isn't
// registered. On iOS we ALSO bounce to joba24:// for an instant return.
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
    const token = params.get('access_token') || '';
    const sid = params.get('sid') || '';

    if (!token) {
      setStatus('error');
      setErrorMsg('לא התקבל טוקן. נסה שוב מתוך האפליקציה.');
      return;
    }

    (async () => {
      try {
        // Store the token on the server so the native app can poll for it.
        if (sid) {
          await base44.functions.invoke('nativeAuthHandshake', { action: 'store', sid, token });
        }
        setStatus('done');
        // iOS: bounce to the custom scheme for an instant return to the app.
        // Android: no-op (no registered handler) — the app polls the handshake.
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          try {
            window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`);
          } catch {}
        }
      } catch (e) {
        setStatus('error');
        setErrorMsg((e && e.message) || 'שגיאה בשמירת הטוקן.');
      }
    })();
  }, []);

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
        <div>
          <CheckCircle2 size={56} color="#16a34a" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
            התחברת בהצלחה!
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
            מתחבר חזרה ל-Joba24 אוטומטית… אם זה לא קרה, לחץ 'סגור' (X) למעלה.
          </div>
        </div>
      )}
      {status === 'error' && (
        <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>{errorMsg}</div>
      )}
    </div>
  );
}