import { Browser } from '@capacitor/browser';
import { InAppBrowser } from '@capgo/capacitor-inappbrowser';

// Poll/store the nativeAuthHandshake token via a raw fetch (NOT the SDK).
// A direct POST to the relative /api/functions/nativeAuthHandshake path
// reliably returns { token } with no auth required. The relative path resolves
// to the app's own origin (joba24.com /api proxy in the native WebView,
// base44.app on the /auth-callback page), so the store and the poll always hit
// the SAME Base44 backend. The real fix for the Android login loop is in
// LoginPromptModal: from_url is on base44.app so the backend preserves the
// sid, letting the poll match the handshake exactly (no flaky fallback).
const HANDSHAKE_URL = '/api/functions/nativeAuthHandshake';
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
  try {
    await Promise.race([
      Promise.all([Browser.close(), InAppBrowser.close().catch(() => {})]),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
  } catch {}

  window.location.reload();
  return true;
}