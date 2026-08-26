import { useEffect } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

// Shared "Continue in app" return screen + Android back-button trap for the
// native OAuth flow. Used by AuthCallback.jsx and NativeOAuthBounce.jsx.
//
// iOS never renders this (it returns via the joba24:// scheme), so this is
// Android-only by construction (both callers gate on showReturn/showOverlay,
// which is only set on Android).

// Build the intent:// URL WITHOUT package= — the Android-standard way to open
// an app from a web page. Omitting package= prevents Chrome from redirecting to
// the Play Store when the intent can't be resolved. If the joba24://
// intent-filter is present, the app opens instantly; if not, Chrome stays on
// the page — the user presses the ✕ button and NativeAuthListener's polling
// completes the login.
const buildIntentUrl = (token) =>
  `intent://auth-callback?access_token=${encodeURIComponent(token)}#Intent;scheme=joba24;end`;

// Android back-button TRAP. Without this, pressing the system back button on
// the return page navigates the Custom Tab back through its history to the
// Google sign-in page — leaving the user stuck on Google, the tab still open,
// so browserFinished never fires and the polling that completes the login
// never starts. We intercept back via pushState/popstate: each back press is
// swallowed (we re-push a guard entry so we never leave the page) and we retry
// the intent return. The login completes the moment the Custom Tab is actually
// dismissed (✕ toolbar button or a successful intent).
export function useNativeBackTrap(active, returnToken) {
  useEffect(() => {
    if (!active || !returnToken) return;
    const guard = () => {
      try { window.history.pushState({ jguard: 1 }, '', window.location.href); } catch {}
    };
    guard();
    const onPop = () => {
      guard();
      try { window.location.href = buildIntentUrl(returnToken); } catch {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [active, returnToken]);
}

// Full-screen "Continue in app" return overlay shown in the external browser
// after a successful native OAuth on Android. `returnToken` is the access_token
// to relay back to the app via the joba24:// intent.
export function NativeReturnScreen({ returnToken }) {
  useNativeBackTrap(true, returnToken);

  const handleReturn = () => {
    if (!returnToken) return;
    try { window.location.href = buildIntentUrl(returnToken); } catch {}
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
            לחץ על הכפתור למטה כדי לחזור לאפליקציה. אם כלום לא קורה, לחץ על ה<strong>✕</strong> בפינה השמאלית-עליונה של הדפדפן — ההתחברות תושלם אוטומטית.
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, fontWeight: 600, marginTop: 6 }}>
            אין צורך ללחוץ "חזור" — ההתחברות תושלם מעצמה ברגע שתסגור את הדפדפן.
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

export default NativeReturnScreen;