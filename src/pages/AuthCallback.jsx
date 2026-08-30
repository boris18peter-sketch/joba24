import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { storeHandshakeToken } from '@/lib/nativeAuthComplete';
import { NativeReturnScreen } from '@/components/NativeReturnScreen';

// The native OAuth callback route (/auth-callback). The native LoginPromptModal
// sets from_url to https://joba24.com/auth-callback?sid=…, and the backend
// redirects here after auth with the access_token appended. index.html captures
// the token + sid into sessionStorage before this module loads.
//
// This route IS the native-flow signal (the web/PWA flow never uses /auth-callback
// — it returns to whatever page the user was on), so there's no detection
// ambiguity: if we're here in the external browser, it's a native OAuth callback.
//
//   • Stores the server handshake (the native app polls it to retrieve the token).
//   • iOS: fires the registered joba24:// scheme for an instant return.
//   • Android (custom Codemagic build with a joba24:// intent-filter): fires an
//     intent:// URL (Chrome Custom-Tab-safe) for an automatic app return, then
//     shows the "Continue in app" return screen as a fallback. If the intent
//     resolves, the app opens and login completes via appUrlOpen; if not, Chrome
//     falls back to /auth-callback?done=1 (RETURN_FLAG set) → NativeReturnScreen,
//     and the handshake poll (browserFinished → NativeAuthListener) completes login.

const RETURN_FLAG = 'joba24_auth_return';

export default function AuthCallback() {
  const [showReturn, setShowReturn] = useState(false);
  const [returnToken, setReturnToken] = useState(null);
  // TEMP diagnostic — rendered as a fixed overlay so the detection values can
  // be read off the screen on the Android Custom Tab (where a blocking alert is
  // often lost to the auto-fire navigation). Remove after diagnosing.
  const [diag, setDiag] = useState(null);

  useEffect(() => {
    // Inside the native app's own WebView this route shouldn't render — bail.
    if (Capacitor.isNativePlatform()) {
      window.location.replace('/');
      return;
    }

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const android = /android/i.test(ua);

    // TEMP diagnostic snapshot (see diag overlay below). Captured BEFORE the
    // token is cleared so hasToken reflects the real callback state.
    setDiag({
      ua: (ua || '').slice(0, 200),
      ios, android,
      hasToken: !!sessionStorage.getItem('joba24_oauth_token'),
      returnFlag: sessionStorage.getItem(RETURN_FLAG) === '1',
      intentStored: !!sessionStorage.getItem('joba24_return_intent'),
    });

    const token = sessionStorage.getItem('joba24_oauth_token');
    const sid = sessionStorage.getItem('joba24_oauth_sid');

    if (token) {
      sessionStorage.setItem(RETURN_FLAG, '1');
      // Clear the captured token NOW (synchronously) so any reload / intent
      // fallback can't re-enter this branch and re-fire the scheme (infinite
      // loop). The handshake store below still receives the token via its arg.
      sessionStorage.removeItem('joba24_oauth_token');
      sessionStorage.removeItem('joba24_oauth_sid');
      // Background store of the handshake via direct fetch. index.html already
      // did a fire-and-forget store on page load; this is a backup. We do NOT
      // await it — awaiting the SDK (base44.functions.invoke) hangs in the
      // Chrome Custom Tab (no auth headers), which blocks the return screen
      // from rendering → blank screen. Fire-and-forget keeps the UI instant.
      storeHandshakeToken(sid || null, token).catch(() => {});
      if (ios) {
        // index.html already fires the joba24:// scheme the instant the token
        // is captured (before React mounts), so the app opens near-instantly.
        // Re-fire here as a backup in case the inline script failed.
        try { window.location.replace(`joba24://auth-callback?access_token=${encodeURIComponent(token)}`); } catch {}
        return;
      }
      if (android) {
        // Build the intent:// URI. package= matches the Capacitor appId
        // (capacitor.config.json) and the AndroidManifest intent-filter package;
        // action/category mirror the manifest (VIEW + DEFAULT + BROWSABLE) so the
        // filter resolves. When the app opens, NativeAuthListener's appUrlOpen
        // parses access_token straight from joba24://auth-callback?access_token=…
        // → completeNativeAuth → login finishes WITHOUT polling (token is in URI).
        let intentUri = '';
        try {
          const fallback = `${window.location.origin}/auth-callback?done=1`;
          const pkg = 'com.base69e6bdb4986a04a256653a23.app';
          intentUri = `intent://auth-callback?access_token=${encodeURIComponent(token)}#Intent;scheme=joba24;package=${pkg};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;category=android.intent.category.DEFAULT;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
          // Persist so NativeReturnScreen can render a tappable <a> on the
          // fallback (?done=1) page too (after Chrome navigates there).
          sessionStorage.setItem('joba24_return_intent', intentUri);
        } catch {}
        // Best-effort auto-fire. Chrome handles PROGRAMMATIC intent://
        // (window.location.href, NO user gesture) inconsistently — it often falls
        // back instead of launching the app, which is the symptom you're seeing.
        // NativeReturnScreen therefore also renders a real <a href=intentUri>
        // button: a genuine user TAP is the gesture Chrome reliably launches
        // intent:// from. If the auto-fire falls back to ?done=1, the button is
        // re-rendered there from sessionStorage for the user to tap.
        try { if (intentUri) window.location.href = intentUri; } catch {}
        setReturnToken(token);
        setShowReturn(true);
        return;
      }
      // Desktop / web / other platforms. /auth-callback is only hit in the
      // native OAuth flow, but if a regular browser lands here (manual visit,
      // misconfigured from_url, or a diagnostic test like ?access_token=test),
      // show the return screen instead of rendering null → blank page. This
      // ALSO gives a visible signal on ANY browser that the build is live.
      setShowReturn(true);
      return;
    } else if (sessionStorage.getItem(RETURN_FLAG) === '1') {
      // Reload / intent fallback — keep the return screen visible (any platform).
      setShowReturn(true);
    }
  }, []);

  return (
    <>
      {showReturn && <NativeReturnScreen returnToken={returnToken} />}
      {diag && (
        <div style={{
          position: 'fixed', top: 8, left: 8, right: 8, zIndex: 2147483646,
          background: '#fff3cd', color: '#664d03', border: '1px solid #ffecb5',
          borderRadius: 10, padding: '10px 12px', fontFamily: 'monospace',
          fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', direction: 'ltr',
          textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>AUTH DIAG (temp):</div>
          <div>ios={String(diag.ios)}  android={String(diag.android)}  hasToken={String(diag.hasToken)}  returnFlag={String(diag.returnFlag)}  intentStored={String(diag.intentStored)}</div>
          <div style={{ marginTop: 6, wordBreak: 'break-all' }}>UA: {diag.ua}</div>
        </div>
      )}
    </>
  );
}