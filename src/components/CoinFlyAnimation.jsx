/**
 * CoinFlyAnimation v2 — 3D Parabolic Coin Burst System
 *
 * Props:
 *   trigger    — boolean: set true to fire, reset to false to re-arm
 *   onDone     — called when animation fully completes
 *   count      — number of coins 1-10 (default 8)
 *   direction  — "debit" (pill → task) | "credit" (task → pill)
 *   fromPos    — { x, y } source coords (overrides auto-detect)
 *   toPos      — { x, y } destination coords (overrides auto-detect)
 *   fromEl     — ref to source element (fallback)
 *   toEl       — ref to target element (fallback)
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const DURATION = 1300; // ms per coin
const STAGGER  = 50;   // ms between coins
const COIN_SIZE = 36;

function getPillPos() {
  const el = document.querySelector('[data-credit-pill]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function CoinSVG({ size }) {
  const id = `cg${size}`;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="36" rx="11" ry="3.5" fill="rgba(0,0,0,0.18)" />
      <ellipse cx="20" cy="22" rx="14" ry="5" fill="#d97706" />
      <ellipse cx="20" cy="18" rx="14" ry="14" fill={`url(#${id})`} />
      <ellipse cx="20" cy="18" rx="14" ry="14" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <ellipse cx="20" cy="18" rx="10" ry="10" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <ellipse cx="14" cy="11" rx="5" ry="3" fill="rgba(255,255,255,0.45)" transform="rotate(-25 14 11)" />
      <text x="20" y="24" textAnchor="middle" fill="#1a4fa0" fontSize="15" fontWeight="900" fontFamily="Inter,Arial,sans-serif">J</text>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="40%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function Coin({ sx, sy, tx, ty, delay, arcH, size = COIN_SIZE }) {
  const dx = tx - sx;
  const dy = ty - sy;
  const peakY = -arcH;

  return (
    <div style={{
      position: 'fixed', left: sx, top: sy,
      width: 0, height: 0,
      zIndex: 999999, pointerEvents: 'none',
      '--dx': `${dx}px`,
      animation: `c2ArcX ${DURATION}ms linear ${delay}ms both`,
    }}>
      <div style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        '--dy': `${dy}px`,
        '--peak': `${peakY}px`,
        animation: `c2ArcY ${DURATION}ms ease-in ${delay}ms both`,
        willChange: 'transform',
      }}>
        <CoinSVG size={size} />
      </div>
    </div>
  );
}

function LandingGlow({ x, y, delay }) {
  return (
    <div style={{
      position: 'fixed', left: x, top: y,
      width: 0, height: 0,
      zIndex: 999998, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        width: 60, height: 60,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.7) 0%, rgba(251,191,36,0) 70%)',
        transform: 'translate(-50%, -50%)',
        animation: `c2GlowPulse 0.5s ease-out ${delay}ms both`,
      }} />
    </div>
  );
}

export default function CoinFlyAnimation({ trigger, onDone, count = 8, direction, fromPos, toPos, fromEl, toEl }) {
  const [coins, setCoins] = useState([]);
  const [glow, setGlow] = useState(null);

  useEffect(() => {
    if (!trigger) return;

    const pillPos = getPillPos();

    // Resolve source
    let sx, sy;
    if (direction === 'debit') {
      // Coins start from credit pill
      const p = fromPos || pillPos;
      sx = p?.x ?? window.innerWidth - 80;
      sy = p?.y ?? 30;
    } else if (direction === 'credit') {
      // Coins start from provided fromPos or fromEl
      if (fromPos) { sx = fromPos.x; sy = fromPos.y; }
      else if (fromEl?.current) {
        const r = fromEl.current.getBoundingClientRect();
        sx = r.left + r.width / 2; sy = r.top + r.height / 2;
      } else { sx = window.innerWidth / 2; sy = window.innerHeight * 0.5; }
    } else {
      if (fromPos) { sx = fromPos.x; sy = fromPos.y; }
      else if (fromEl?.current) {
        const r = fromEl.current.getBoundingClientRect();
        sx = r.left + r.width / 2; sy = r.top + r.height / 2;
      } else { sx = window.innerWidth / 2; sy = window.innerHeight * 0.8; }
    }

    // Resolve target
    let tx, ty;
    if (direction === 'credit') {
      // Coins land on credit pill
      const p = toPos || pillPos;
      tx = p?.x ?? window.innerWidth - 80;
      ty = p?.y ?? 30;
    } else if (direction === 'debit') {
      // Coins land on provided toPos or toEl
      if (toPos) { tx = toPos.x; ty = toPos.y; }
      else if (toEl?.current) {
        const r = toEl.current.getBoundingClientRect();
        tx = r.left + r.width / 2; ty = r.top + r.height / 2;
      } else { tx = window.innerWidth / 2; ty = window.innerHeight * 0.7; }
    } else {
      if (toPos) { tx = toPos.x; ty = toPos.y; }
      else if (toEl?.current) {
        const r = toEl.current.getBoundingClientRect();
        tx = r.left + r.width / 2; ty = r.top + r.height / 2;
      } else { tx = window.innerWidth - 80; ty = 30; }
    }

    const n = Math.min(10, Math.max(1, count));
    const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2);
    const arcH = Math.max(80, Math.min(220, dist * 0.45));

    const newCoins = Array.from({ length: n }, (_, i) => ({
      id: Date.now() + i,
      sx: sx + (Math.random() - 0.5) * 16,
      sy: sy + (Math.random() - 0.5) * 16,
      tx, ty,
      arcH: arcH + (Math.random() - 0.5) * 40,
      delay: i * STAGGER,
    }));

    setCoins(newCoins);

    const lastDelay = (n - 1) * STAGGER + DURATION;
    const glowTimer = setTimeout(() => {
      setGlow({ x: tx, y: ty, t: Date.now() });
      setTimeout(() => setGlow(null), 600);
    }, lastDelay);

    const clearTimer = setTimeout(() => {
      setCoins([]);
      onDone?.();
    }, lastDelay + 200);

    return () => { clearTimeout(glowTimer); clearTimeout(clearTimer); };
  }, [trigger]);

  if (!coins.length && !glow) return null;

  return createPortal(
    <>
      {coins.map(c => (
        <Coin key={c.id} sx={c.sx} sy={c.sy} tx={c.tx} ty={c.ty} arcH={c.arcH} delay={c.delay} />
      ))}
      {glow && <LandingGlow key={glow.t} x={glow.x} y={glow.y} delay={0} />}
      <style>{`
        @keyframes c2ArcX {
          0%   { transform: translateX(0); }
          100% { transform: translateX(var(--dx)); }
        }
        @keyframes c2ArcY {
          0%   { transform: translateY(0)            scale(1.2); opacity: 1; }
          35%  { transform: translateY(var(--peak))  scale(1.35); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(var(--dy))    scale(0.25); opacity: 0; }
        }
        @keyframes c2GlowPulse {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.9; }
          60%  { transform: translate(-50%,-50%) scale(1.4); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(2);   opacity: 0; }
        }
      `}</style>
    </>,
    document.body
  );
}