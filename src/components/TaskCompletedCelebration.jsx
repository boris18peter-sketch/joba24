import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * TaskCompletedCelebration — shows a success animation banner
 * when a worker's active task transitions to COMPLETED.
 * Supports swipe-up-to-dismiss and X close button (like LiveNotificationPopup).
 */
export default function TaskCompletedCelebration({ task, onDismiss }) {
  const [phase, setPhase] = useState('enter');
  const [swipeY, setSwipeY] = useState(0);
  const touchStartY = useRef(null);
  const timerRef = useRef(null);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('exit');
    setSwipeY(0);
    setTimeout(onDismiss, 400);
  };

  useEffect(() => {
    setPhase('show');
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 5500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy < 0) setSwipeY(dy);
  };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -40) { dismiss(); }
    else setSwipeY(0);
    touchStartY.current = null;
  };

  if (!task) return null;

  return (
    <div
      style={{
        opacity: phase === 'exit' ? 0 : 1,
        transform: phase === 'exit' ? 'scale(0.96)' : `translateY(${swipeY}px)`,
        transition: swipeY === 0 ? 'opacity 0.4s ease, transform 0.4s ease' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          borderRadius: 20,
          padding: '14px 16px 16px',
          boxShadow: '0 6px 24px rgba(5,150,105,0.32)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'celebrationSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          style={{
            position: 'absolute', top: 10, left: 10,
            width: 28, height: 28, borderRadius: 9,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, flexShrink: 0,
          }}
        >
          <X size={14} color="white" />
        </button>

        {/* Confetti particles */}
        {phase === 'show' && (
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 5 }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * 360;
              const dist = 30 + Math.random() * 50;
              const tx = Math.cos((angle * Math.PI) / 180) * dist;
              const ty = Math.sin((angle * Math.PI) / 180) * dist * 0.6 - 10;
              const colors = ['#fbbf24', '#f59e0b', '#4ade80', '#86efac', '#white', '#fde68a'];
              const color = colors[i % colors.length];
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 5 + Math.random() * 4,
                    height: 5 + Math.random() * 4,
                    borderRadius: '50%',
                    background: color,
                    animation: `confettiBurst 1.2s ${i * 0.03}s ease-out forwards`,
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`,
                  }}
                />
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
          {/* Checkmark */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="13" fill="rgba(255,255,255,0.15)" />
              <path className="j-checkmark-path" d="M7 13.5l4.5 4.5L19 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 17, lineHeight: 1.2 }}>המשימה הושלמה! 🎉</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
          </div>

          {/* Price */}
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: '6px 14px',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'white', fontWeight: 900, fontSize: 19 }}>₪{task.price}</span>
          </div>
        </div>

        <style>{`
          @keyframes celebrationSlideIn {
            from { opacity: 0; transform: translateY(-12px) scale(0.94); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes confettiBurst {
            0% { transform: translate(0, 0) scale(0.3); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0.2); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}