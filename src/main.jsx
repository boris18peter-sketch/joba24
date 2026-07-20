import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Protective handler: the vite plugin's unhandled-rejection handler accesses
// event.reason.stack.match(...), which crashes when a promise rejects with a
// non-Error value (undefined, string, plain object). This capture-phase
// listener wraps such rejections in a proper Error BEFORE the plugin sees them.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
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