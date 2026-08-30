import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

// Shared "Continue in app" return screen + Android back-button guard for the
// native OAuth flow. Used by AuthCallback.jsx and NativeOAuthBounce.jsx.
//
// iOS never renders this (it returns via the joba24:// scheme).
//
// Android: AuthCallback now fires the joba24:// scheme FIRST (the custom
// Codemagic build registers a joba24:// intent-filter). This screen is the
// FALLBACK — shown only if the scheme did not auto-open the app (old auto-build
// / app not installed). The user closes the Custom Tab (✕ button) →
// browserFinished → NativeAuthListener / WaitingForAuthScreen poll retrieve the
// token from the server handshake and reload the app authenticated. It also
// absorbs the system back button so it doesn't navigate back to the Google
// sign-in page.

// Android back-button guard: intercept back via pushState/popstate so the user
// stays on this page instead of navigating back to the Google sign-in page.
export function useNativeBackTrap(active) {
  useEffect(() => {
    if (!active) return;
    const guard = () => {
      try { window.history.pushState({ jguard: 1 }, '', window.location.href); } catch {}
    };
    guard();
    const onPop = () => { guard(); }; // swallow back — stay on this page
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [active]);
}

// Full-screen "close the browser" return overlay shown in the external Custom
// Tab after a successful native OAuth on Android. `returnToken` is accepted for
// caller compatibility but intentionally unused — no intent is fired.
export function NativeReturnScreen({ returnToken, intentUri: intentUriProp }) {
  useNativeBackTrap(true);

  // The token was already postMessaged to the app and stored in the handshake.
  // The app completes login in the background (reload deferred until it returns to
  // the foreground). The reliable way back to the app is closing this browser tab
  // with the system ✕ — window.close() is blocked because the tab was opened by
  // the system (Capacitor onCreateWindow), not by a script, so we don't show a
  // (non-functional) button; we just instruct the user to press ✕.

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
          <div style={{ fontSize: 16, color: '#4b6083', lineHeight: 1.7, fontWeight: 600, marginBottom: 14 }}>
            ההתחברות הושלמה!<br />
            לחץ על <span style={{ color: '#dc2626', fontWeight: 800 }}>✕</span> בפינה למעלה כדי לחזור לאפליקציה.
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, fontWeight: 600 }}>
            האפליקציה תיכנס אוטומטית ברגע שתסגור את הדפדפן.
          </div>
        </div>
      </div>
    </div>
  );
}

export default NativeReturnScreen;