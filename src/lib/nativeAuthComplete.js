import { Browser } from '@capacitor/browser';
import { InAppBrowser } from '@capgo/capacitor-inappbrowser';

// Completes a native OAuth login from a retrieved access_token.
//
// Shared by NativeAuthListener (event-driven poll) and LoginPromptModal's
// WaitingForAuthScreen (user-visible poll) so both use identical logic.
//
// Guarded by `joba24_auth_sid`: a login is "pending" while that key is set
// (LoginPromptModal sets it right before opening the system browser). The
// first poll to find a token clears the sid and reloads; any second delivery
// (the two polls can both fire) is a no-op — no double reload. A NEW login
// sets a fresh sid, so it is never blocked by a previous one.
export async function completeNativeAuth(token) {
  if (!token) return false;
  const pendingSid = localStorage.getItem('joba24_auth_sid');
  if (pendingSid === null) return false; // already consumed / no login pending
  localStorage.removeItem('joba24_auth_sid');
  localStorage.setItem('base44_access_token', token);
  localStorage.setItem('token', token);

  // Overlay so the user never sees the login page flash during the ~1s reload.
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