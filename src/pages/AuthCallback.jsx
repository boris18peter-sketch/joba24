import { useEffect } from 'react';

// OAuth landing page — loaded in the EXTERNAL browser (SFSafariViewController /
// Chrome Custom Tab) after the provider redirects back with the access_token.
//
// The Capacitor bridge is NOT available in the external browser, so we detect
// that (window.Capacitor undefined) and bounce to the `joba24://` custom scheme,
// which iOS/Android intercept to open the native app and deliver the token to
// NativeAuthListener. If somehow opened inside the app, just go home.
export default function AuthCallback() {
  useEffect(() => {
    const hasCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    if (!hasCapacitor) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('access_token') || '';
      window.location.replace(
        `joba24://auth-callback?access_token=${encodeURIComponent(token)}`
      );
    } else {
      window.location.replace('/');
    }
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
      }}
    >
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}