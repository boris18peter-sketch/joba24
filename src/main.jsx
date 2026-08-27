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
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (typeof reason === 'string' ? reason : (reason?.message || '')) || '';
  if (/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(msg)) {
    const KEY = 'joba24_main_reload_ts';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      try { navigator.serviceWorker?.getRegistrations?.().then((rs) => Promise.all(rs.map((r) => r.unregister()))).catch(() => {}); } catch {}
      window.location.reload();
      return;
    }
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

console.log('[Joba24] App: React mounting...');
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)