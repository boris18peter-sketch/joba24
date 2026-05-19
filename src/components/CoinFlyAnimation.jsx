/**
 * CoinFlyAnimation
 * Premium coin fly effect — coins animate from a source point toward a target.
 * Usage:
 *   <CoinFlyAnimation trigger={true} onDone={() => {}} count={3} direction="up" />
 *
 * Props:
 *   trigger   — boolean: set true to fire, reset to false to re-arm
 *   onDone    — called when animation completes
 *   count     — number of coins (1-5), default 3
 *   direction — "up" (toward header balance) | "down" (scatter outward)
 *   fromEl    — ref to source element (optional, defaults to center)
 *   toEl      — ref to target element (optional)
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function Coin({ x, y, tx, ty, delay, size = 18 }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: size,
        height: size,
        zIndex: 999999,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        animation: `coinFly 0.62s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
        '--tx': `${tx - x}px`,
        '--ty': `${ty - y}px`,
      }}
    >
      {/* Coin SVG — gold coin */}
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        <ellipse cx="16" cy="19" rx="13" ry="4" fill="rgba(10,82,176,0.2)" />
        <ellipse cx="16" cy="15" rx="13" ry="13" fill="url(#cg)" />
        <ellipse cx="16" cy="15" rx="10" ry="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <ellipse cx="12" cy="10" rx="4.5" ry="2.8" fill="rgba(255,255,255,0.4)" transform="rotate(-20 12 10)" />
        <text x="16" y="20" textAnchor="middle" fill="#1a6fd4" fontSize="13" fontWeight="900" fontFamily="Inter,Arial,sans-serif">J</text>
        <defs>
          <radialGradient id="cg" cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function CoinFlyAnimation({ trigger, onDone, count = 3, fromEl, toEl }) {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    if (!trigger) return;

    // Source position
    let sx = window.innerWidth / 2;
    let sy = window.innerHeight * 0.85;
    if (fromEl?.current) {
      const r = fromEl.current.getBoundingClientRect();
      sx = r.left + r.width / 2;
      sy = r.top + r.height / 2;
    }

    // Target position — default: top-right header credits area
    let tx = window.innerWidth - 60;
    let ty = 28;
    if (toEl?.current) {
      const r = toEl.current.getBoundingClientRect();
      tx = r.left + r.width / 2;
      ty = r.top + r.height / 2;
    }

    const n = Math.min(5, Math.max(1, count));
    const newCoins = Array.from({ length: n }, (_, i) => ({
      id: Date.now() + i,
      // Spread source slightly
      x: sx + (Math.random() - 0.5) * 20,
      y: sy + (Math.random() - 0.5) * 20,
      tx,
      ty,
      delay: i * 60,
    }));

    setCoins(newCoins);

    const total = 620 + (n - 1) * 60 + 100;
    const t = setTimeout(() => {
      setCoins([]);
      onDone?.();
    }, total);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!coins.length) return null;

  return createPortal(
    <>
      {coins.map(c => (
        <Coin key={c.id} x={c.x} y={c.y} tx={c.tx} ty={c.ty} delay={c.delay} />
      ))}
      <style>{`
        @keyframes coinFly {
          0%   { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.4); opacity: 0; }
        }
      `}</style>
    </>,
    document.body
  );
}