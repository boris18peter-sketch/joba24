import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

var __origAlert = window.alert ? window.alert.bind(window) : null;
window.alert = function (msg) {
  try {
    var el = document.getElementById('joba24_debug_toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'joba24_debug_toast';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#0a52b0;color:#fff;font-family:monospace;font-size:12px;line-height:1.4;padding:8px 10px;max-height:72vh;overflow:auto;white-space:pre-wrap;direction:ltr;text-align:left;box-shadow:0 4px 24px rgba(0,0,0,0.5)';
      var host = document.body || document.documentElement;
      host.appendChild(el);
    }
    var time = new Date().toLocaleTimeString();
    var line = document.createElement('div');
    line.style.cssText = 'border-top:1px solid rgba(255,255,255,0.25);padding:4px 0';
    line.textContent = '[' + time + '] ' + msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  } catch (e) {}
  try { if (__origAlert) __origAlert(msg); } catch (e) {}
};
setTimeout(function () { alert('BLUE APP LOADED v3'); }, 0);

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