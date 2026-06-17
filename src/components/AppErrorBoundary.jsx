import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Joba24] React crash:', error.message, info.componentStack);
  }

  render() {
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