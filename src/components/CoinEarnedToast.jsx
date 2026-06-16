/**
 * CoinEarnedToast
 * Premium dopamine-hit notification when user earns credits.
 * Fire with: window.dispatchEvent(new CustomEvent('coin_earned', { detail: { amount: 50, label: 'בונוס הרשמה' } }))
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function CoinEarnedToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const { amount, label } = e.detail || {};
      if (!amount) return;
      const id = Date.now();
      setToasts(prev => [...prev.slice(-2), { id, amount, label }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    window.addEventListener('coin_earned', handler);
    return () => window.removeEventListener('coin_earned', handler);
  }, []);

  if (!toasts.length) return null;

  return createPortal(
    <div style={{ position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)', zIndex: 99999999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #1e3a5f, #0f2b6b)',
            color: 'white', borderRadius: 99, padding: '8px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(251,191,36,0.3)',
            fontSize: 14, fontWeight: 800,
            animation: 'coinToastIn 0.45s cubic-bezier(0.34,1.5,0.64,1)',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Coin icon */}
          <svg viewBox="0 0 24 24" width="22" height="22" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="11" fill="#fbbf24"/>
            <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
            <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="Inter,Arial,sans-serif" fill="#1a6fd4">J</text>
          </svg>
          <span style={{ color: '#fbbf24', fontSize: 17 }}>+{t.amount}</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>{t.label || 'קרדיטים'}</span>
        </div>
      ))}
      <style>{`
        @keyframes coinToastIn {
          0%   { opacity:0; transform: scale(0.7) translateY(-10px); }
          60%  { transform: scale(1.06) translateY(2px); }
          100% { opacity:1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}