import React from 'react';

/**
 * A lazily-loaded route chunk can end up on a different module generation than
 * the app root — a stale chunk after a deploy, or a live-preview rebuild that
 * re-fetched a shared module. React compares contexts by identity, so the stale
 * chunk reads a SECOND copy of LanguageContext and throws
 * "must be used inside <X>Provider" even though the provider is right there.
 *
 * Two module instances can't be reconciled at runtime, so the only real fix is
 * to reload onto a single fresh module graph. Throttled so a genuine bug can
 * never turn into a reload loop.
 */
const STALE_MODULE_RE = /must be used inside \w+Provider|Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;

function healStaleModule() {
  const KEY = 'joba24_boundary_reload_ts';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last <= 10000) return false;
  sessionStorage.setItem(KEY, String(Date.now()));
  // Unregister stale service workers first, otherwise the reload can serve the
  // same outdated chunks from cache.
  try {
    navigator.serviceWorker?.getRegistrations?.()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .then(() => window.location.reload())
      .catch(() => window.location.reload());
  } catch {
    window.location.reload();
  }
  return true;
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, recovering: false };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      recovering: STALE_MODULE_RE.test(error?.message || ''),
    };
  }

  componentDidCatch(error, info) {
    console.error('[Joba24] React crash:', error.message, info.componentStack);
    if (STALE_MODULE_RE.test(error?.message || '')) {
      // If the throttle blocked the reload, fall back to the normal crash screen
      // rather than leaving the user on a spinner forever.
      if (!healStaleModule()) this.setState({ recovering: false });
    }
  }

  render() {
    if (this.state.recovering) {
      return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border-1)', borderTopColor: '#1a6fd4' }} className="animate-spin" />
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#f4f7fb', padding: 24, fontFamily: 'Inter, sans-serif', textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f1e40', marginBottom: 8 }}>משהו השתבש</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, maxWidth: 320, lineHeight: 1.6 }}>
            האפליקציה נתקלה בשגיאה בלתי צפויה. נסה לרענן את הדף.
          </div>
          <button onClick={() => window.location.reload()} style={{
            padding: '14px 40px', borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white',
            fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,111,212,0.35)'
          }}>
            רענן דף
          </button>
          {this.state.error && (
            <details style={{ marginTop: 20, fontSize: 11, color: '#94a3b8', maxWidth: 320, textAlign: 'left', direction: 'ltr' }}>
              <summary style={{ cursor: 'pointer' }}>Error details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error.message}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}