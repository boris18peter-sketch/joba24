/**
 * BottomSheet — shared animated bottom-sheet wrapper
 * Usage: <BottomSheet onClose={fn}> ... </BottomSheet>
 * - Smooth slide-up open / slide-down close
 * - Blurred overlay, tap-outside closes
 * - Safe-area aware
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function BottomSheet({
  onClose,
  children,
  maxWidth = 480,
  showHandle = true,
  showCloseBtn = true,
  zIndex = 999999,
  dir = 'rtl',
}) {
  const [phase, setPhase] = useState('enter'); // enter | exit

  const close = useCallback(() => {
    setPhase('exit');
    setTimeout(onClose, 280);
  }, [onClose]);

  // Allow parent to call close via keyboard (Escape)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const sheetStyle = {
    position: 'relative',
    background: 'var(--sheet-bg)',
    borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
    width: '100%',
    maxWidth,
    paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
    boxShadow: 'var(--shadow-xl)',
    maxHeight: '92dvh',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    transform: phase === 'exit' ? 'translateY(110%)' : 'translateY(0)',
    opacity: phase === 'exit' ? 0 : 1,
    transition: phase === 'exit'
      ? 'transform 0.28s cubic-bezier(0.4,0,1,1), opacity 0.22s ease'
      : 'transform 0.38s cubic-bezier(0.32,1.2,0.64,1), opacity 0.22s ease',
    willChange: 'transform',
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex,
    background: 'var(--overlay-bg)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    touchAction: 'none',
    opacity: phase === 'exit' ? 0 : 1,
    transition: 'opacity 0.28s ease',
  };

  return createPortal(
    <div
      style={overlayStyle}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div dir={dir} style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        {showHandle && (
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
        )}

        {/* Close button */}
        {showCloseBtn && (
          <button
            onClick={close}
            className="j-icon-btn"
            style={{
              position: 'absolute', top: 14, left: 16,
              width: 36, height: 36, borderRadius: 'var(--r-sm)',
              background: 'var(--surface-3)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10, flexShrink: 0,
            }}
          >
            <X size={16} color="var(--text-3)" />
          </button>
        )}

        {children}
      </div>
    </div>,
    document.body
  );
}