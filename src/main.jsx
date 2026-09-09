import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Protective handler: the vite plugin's unhandled-rejection handler accesses
// event.reason.stack.match(...), which crashes when a promise rejects with a
// non-Error value (undefined, string, plain object). This capture-phase
// listener wraps such rejections in a proper Error BEFORE the plugin sees them.
// Self-heal: a static or dynamic module import can fail transiently ("Importing
// a module script failed." / "Failed to fetch dynamically imported module") when
// the browser holds a stale index.html pointing at a hashed chunk that no longer
// exists on the server after a deploy. Detect it here and reload ONCE (throttled
// 10s, also unregistering stale service workers) so the user gets fresh assets
// instead of a blank screen. lazyRetry already covers dynamic imports inside
// App.jsx; this covers static imports + any rejections that escape that net.
// Self-heal for stale module imports — covers BOTH unhandledrejection (dynamic
// imports) and window 'error' events (static <script type="module"> load
// failures that never become promise rejections).
const STALE_IMPORT_RE = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;
function healStaleImport() {
  const KEY = 'joba24_main_reload_ts';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last <= 10000) return; // throttled — don't loop
  sessionStorage.setItem(KEY, String(Date.now()));
  // Unregister ALL service workers so the reload fetches fresh assets from the
  // server instead of serving a stale cached index.html that points at
  // non-existent hashed chunks.
  try {
    navigator.serviceWorker?.getRegistrations?.()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .then(() => { window.location.reload(); })
      .catch(() => { window.location.reload(); });
  } catch {
    window.location.reload();
  }
}

// Catch promise rejections from dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (typeof reason === 'string' ? reason : (reason?.message || '')) || '';
  if (STALE_IMPORT_RE.test(msg)) {
    healStaleImport();
    return;
  }
  const needsWrap =
    reason == null ||
    (typeof reason === 'object' && typeof reason.stack !== 'string');
  if (!needsWrap) return;

  const wrapped = new Error(
    typeof reason === 'string'
      ? reason
      : reason?.message || 'Unhandled promise rejection'
  );
  if (reason && typeof reason === 'object') {
    try { Object.assign(wrapped, reason); } catch {}
  }
  try {
    Object.defineProperty(event, 'reason', {
      value: wrapped,
      configurable: true,
      writable: true,
    });
  } catch {
    // Can't override — stop the plugin handler from crashing and log manually
    event.stopImmediatePropagation();
    console.error('[Joba24] Unhandled rejection:', reason);
  }
}, true); // capture phase — runs before the vite plugin's bubble-phase handler

// Catch static module script load failures (these fire as 'error' events on
// window, NOT as promise rejections — the unhandledrejection handler above
// can't see them).
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (STALE_IMPORT_RE.test(msg)) {
    healStaleImport();
  }
}, true);

console.log('[Joba24] App: React mounting...');
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)