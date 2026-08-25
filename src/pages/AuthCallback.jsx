import { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Smartphone, X } from 'lucide-react';

// OAuth landing route (/auth-callback). The actual handshake store + return
// logic now lives in <NativeOAuthBounce>, which runs on EVERY page in the
// external browser and shows a full-screen return overlay. This route is kept
// for the case the OAuth redirect lands directly on /auth-callback — it just
// renders the same return screen (the global overlay covers it anyway, but
// this ensures a clean render with no side effects: no intent firing, no
// duplicate handshake, no error state when the token was already consumed).
export default function AuthCallback() {
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor) {
      window.location.replace('/');
      return;
    }
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    // Show the return screen if this looks like a post-OAuth landing (the done
    // fallback flag, or a return flag set by NativeOAuthBounce, or any access
    // token / done param in the URL).
    const params = new URLSearchParams(window.location.search);
    const flag =
      params.get('done') === '1' ||
      sessionStorage.getItem('joba24_auth_return') === '1';
    setShow(flag);
  }, []);

  if (!show) return null;

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
            החיבור הושלם. לחצ/י על הכפתור כדי לחזור ל-Joba24.
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
            {isIOS ? <X size={20} color="#475569" /> : <ArrowRight size={20} color="#475569" style={{ transform: 'scaleX(-1)' }} />}
          </div>
          <div style={{ textAlign: 'right', flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0d1e40', lineHeight: 1.4 }}>הכפתור לא עובד?</div>
            <div style={{ fontSize: 13, color: '#4b6083', lineHeight: 1.5 }}>
              {isIOS ? 'לחצ/י על "סיום" (Done) בראש המסך כדי לחזור לאפליקציה.' : 'לחצ/י על ה"חזרה" (◄) או ה"X" בתחתית המסך — האפליקציה תמשיך אוטומטית.'}
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