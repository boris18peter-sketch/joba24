import { useEffect } from 'react';
import { CheckCircle2, LogIn } from 'lucide-react';

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
  // The app completes login in the background. This screen just needs to get the
  // user back to the app: the button calls window.close() (this tab was opened by
  // the app via window.open, so it is script-closable). If window.close() is
  // blocked, the footer instructs a manual close (✕) — closing the tab returns to
  // the already-logged-in app behind it.

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
          <div style={{ fontSize: 15, color: '#4b6083', lineHeight: 1.6, fontWeight: 500, marginBottom: 18 }}>
            לחץ כדי לחזור לאפליקציית Joba24
          </div>
          <button
            onClick={() => { try { window.close(); } catch (e) {} }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: '#fff',
              fontWeight: 800, fontSize: 17, boxShadow: '0 6px 20px rgba(26,111,212,0.35)',
            }}
          >
            <LogIn size={20} /> חזור לאפליקציה
          </button>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, fontWeight: 600, marginTop: 14 }}>
            אם האפליקציה לא נפתחת, סגור את הדפדפן (✕ בפינה) וההתחברות תושלם אוטומטית.
          </div>
        </div>
      </div>
    </div>
  );
}

export default NativeReturnScreen;