/**
 * permissionPopup — ONE way for any screen to explain a blocked device permission.
 *
 * A denied microphone, camera or location is discovered deep inside a flow: the
 * dictation button, the camera button of an uploader, the first location request
 * of the feed. Each of those used to fail in silence, because a browser cannot
 * reopen the OS dialog once it has been answered — so nothing happened, and the
 * user was left with a button that looked broken.
 *
 * Rather than have every flow carry its own popup, each one asks for the single
 * shared sheet (see PermissionSheet, mounted once in the app shell):
 *
 *   showPermissionPopup({ kind: 'camera', mode: 'denied', onRetry: openCamera })
 *
 * `onRetry` is whatever that flow should try again — the sheet closes itself and
 * calls it, so the same button works whether the user just fixed the setting or
 * dismissed the dialog by accident.
 */
let current = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(current));

export function getPermissionPopup() {
  return current;
}

export function showPermissionPopup({ kind, mode = 'denied', onRetry } = {}) {
  if (!kind) return;
  // ── NEVER INSIDE AN EMBEDDED FRAME ────────────────────────────────────────
  // A page inside an iframe is refused camera, microphone and location by the
  // browser itself, with no dialog and no way for the user to allow it. That is
  // the builder's preview, not the app, so explaining it there would be noise
  // about a permission the user never touched. The same rule the startup
  // permission prompt already follows.
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }
  current = { kind, mode, onRetry };
  notify();
}

export function hidePermissionPopup() {
  if (!current) return;
  current = null;
  notify();
}

export function subscribePermissionPopup(fn) {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

/**
 * The device's current answer for a permission, WITHOUT asking.
 *
 * 'granted' | 'denied' | 'prompt' | 'unknown' — 'unknown' where the Permissions
 * API cannot answer (Safari has no camera/location entry), in which case the
 * caller simply proceeds and lets the OS decide.
 */
export async function permissionState(name) {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name });
    return status.state === 'default' ? 'prompt' : status.state;
  } catch {
    return 'unknown';
  }
}