import { Browser } from '@capacitor/browser';
import { InAppBrowser } from '@capgo/capacitor-inappbrowser';

// Poll/store the nativeAuthHandshake token via a raw fetch (NOT the SDK).
// A direct POST returns { token } with no auth required. The URL is ABSOLUTE
// (https://joba24.base44.app) because the poll runs INSIDE the native app's
// WebView, whose origin is NOT base44.app:
//   • iOS remote (server.url) → origin "null" (WKWebView)
//   • Android LOCAL build → origin http(s)://localhost (Capacitor bundle)
// A relative "/api/..." path would resolve to localhost/null and the poll
// would 404 → the OAuth token is never retrieved → login hangs. The ABSOLUTE
// URL hits the Base44 backend from every context (app WebView, external
// Chrome Custom Tab, /auth-callback page). The store side (called from the
// external browser) also works with the absolute URL (same-origin there).
const HANDSHAKE_URL = 'https://joba24.base44.app/api/functions/nativeAuthHandshake';
export async function pollHandshakeToken(sid) {
  if (!sid) return null;
  try {
    const r = await fetch(HANDSHAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'poll', sid }),
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => ({}));
    return data?.token ?? null;
  } catch {
    return null;
  }
}

// Store the OAuth handshake token via a raw fetch (NOT the SDK).
// base44.functions.invoke can hang in the external Chrome Custom Tab
// (no auth headers available), which blocks the return screen from ever
// rendering → blank screen. index.html already does a fire-and-forget store
// on page load; this is the React-side backup.
export async function storeHandshakeToken(sid, token) {
  if (!token) return false;
  try {
    const r = await fetch(HANDSHAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'store', sid: sid || null, token }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Completes a native OAuth login from a retrieved access_token.
//
// Guarded by `joba24_auth_sid`: a login is "pending" while that key is set
// (LoginPromptModal sets it right before opening the system browser). The
// first poll to find a token clears the sid and reloads; any second delivery
// is a no-op. A NEW login sets a fresh sid, so it is never blocked.
export async function completeNativeAuth(token) {
  if (!token) return false;
  const pendingSid = localStorage.getItem('joba24_auth_sid');
  if (pendingSid === null) return false; // already consumed / no login pending

  localStorage.removeItem('joba24_auth_sid');
  localStorage.setItem('base44_access_token', token);
  localStorage.setItem('token', token);

  // Overlay so the user never sees the login page flash during the reload.
  try {
    if (!document.getElementById('joba24_auth_spin')) {
      const s = document.createElement('style');
      s.id = 'joba24_auth_spin';
      s.textContent = '@keyframes joba24_auth_spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }
    if (!document.getElementById('joba24_auth_overlay')) {
      const ov = document.createElement('div');
      ov.id = 'joba24_auth_overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#ffffff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;font-family:Inter,system-ui,sans-serif;';
      ov.innerHTML = '<div style="width:36px;height:36px;border:3px solid #e8edf5;border-top-color:#1a6fd4;border-radius:50%;animation:joba24_auth_spin 0.8s linear infinite"></div><div style="font-size:14px;font-weight:500;color:#94a3b8;margin-top:6px">טוען...</div>';
      document.body.appendChild(ov);
    }
  } catch {}

  // Dismiss the in-app browser (SFSafariViewController / Chrome Custom Tab).
  // On Android the Capacitor bridge is unavailable, so this is a fast no-op there.
  try {
    await Promise.race([
      Promise.all([Browser.close(), InAppBrowser.close().catch(() => {})]),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
  } catch {}

  // If the app is in the background (the external browser is foreground), a
  // background window.location.reload() can abort with a WebView error page
  // (net::ERR_ABORTED) because background navigation is throttled — the user
  // then sees "An error occurred while loading the screen" when returning to
  // the app. Defer the reload until the app is visible again (user closes /
  // returns from the browser), so the reload runs in the foreground and
  // succeeds. The token is already in localStorage, so the reloaded app
  // authenticates immediately.
  const doReload = () => { try { window.location.reload(); } catch (e) {} };
  if (typeof document !== 'undefined' && document.hidden) {
    const onVis = () => {
      if (!document.hidden) {
        document.removeEventListener('visibilitychange', onVis);
        doReload();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    // Safety fallback in case visibilitychange never fires.
    setTimeout(doReload, 10000);
  } else {
    doReload();
  }
  return true;
}