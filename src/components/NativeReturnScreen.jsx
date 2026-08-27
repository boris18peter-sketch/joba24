import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

// Shared "Continue in app" return screen + Android back-button guard for the
// native OAuth flow. Used by AuthCallback.jsx and NativeOAuthBounce.jsx.
//
// iOS never renders this (it returns via the joba24:// scheme), so this is
// Android-only by construction (both callers gate on showReturn/showOverlay,
// which is only set on Android).
//
// Per Base44 support (Aug 2026): on the generated Android build, custom URL
// schemes and intent-filters are NOT editable — so intent:// / joba24://
// CANNOT open the app. The ONLY reliable return path is: the user closes the
// Custom Tab (✕ button), which fires browserFinished → NativeAuthListener and
// the WaitingForAuthScreen poll retrieve the token from the server handshake
// and reload the app authenticated. This screen is purely informational — it
// tells the user to close the browser, and absorbs the system back button so
// it doesn't navigate back to the Google sign-in page (no broken intent is
// fired).

// Android back-button guard: intercept back via pushState/popstate so the user
// stays on this page instead of navigating back to the Google sign-in page.
// We do NOT fire an intent (it cannot resolve without a manifest entry). The
// user closes the tab via the ✕ button; the login completes via polling.
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

// Full-screen "return to app" overlay shown in the external browser
// (SFSafariViewController on iOS, Chrome Custom Tab on Android) after a
// successful native OAuth.
//
//   • iOS: SFSafariViewController does NOT auto-open custom schemes from JS
//     navigation — it shows a passive banner and leaves the page blank. So we
//     render an explicit "Open in app" button (an <a> to the joba24:// scheme).
//     User-initiated navigation DOES open the app. As a fallback, dismissing
//     the browser returns to the app, where NativeAuthListener's foreground
//     poll picks up the handshake token and completes the login.
//   • Android: no joba24:// intent-filter in the auto-build, so the user closes
//     the Custom Tab (✕); browserFinished → poll → complete.
export function NativeReturnScreen({ returnToken }) {
  useNativeBackTrap(true);

  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const schemeUrl = returnToken
    ? `joba24://auth-callback?access_token=${encodeURIComponent(returnToken)}`
    : null;

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
          {ios ? (
            <>
              <div style={{ fontSize: 15, color: '#4b6083', lineHeight: 1.6, fontWeight: 500 }}>
                לחץ על הכפתור כדי לחזור לאפליקציה.
              </div>
              {schemeUrl && (
                <a
                  href={schemeUrl}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 16, padding: '14px 28px', borderRadius: 14,
                    background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: '#fff',
                    fontSize: 17, fontWeight: 800, textDecoration: 'none',
                    boxShadow: '0 6px 20px rgba(26,111,212,0.35)', minHeight: 52,
                  }}
                >
                  פתיחה באפליקציה
                </a>
              )}
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, fontWeight: 600, marginTop: 10 }}>
                או סגור את הדפדפן — ההתחברות תושלם אוטומטית.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, color: '#4b6083', lineHeight: 1.6, fontWeight: 500 }}>
                סגור את הדפדפן — לחץ על ה<strong>✕</strong> בפינה השמאלית-עליונה — כדי לחזור לאפליקציה.
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, fontWeight: 600, marginTop: 6 }}>
                ההתחברות תושלם אוטומטית ברגע שתסגור את הדפדפן.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NativeReturnScreen;