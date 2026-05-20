/**
 * CreditBalancePill
 * Animated credit balance display — smooth count-up + pulse glow on change.
 * Used in HomeFeed header and wherever credits are shown.
 */
import { useState, useEffect, useRef } from 'react';
import CreditIcon from '@/components/CreditIcon';

function useAnimatedCount(value, duration = 700) {
  const [display, setDisplay] = useState(value);
  const [glowing, setGlowing] = useState(false);
  const prevRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current ?? value;
    const to = value ?? 0;
    if (from === to) { prevRef.current = to; return; }

    const isGain = to > from;
    if (isGain) setGlowing(true);

    prevRef.current = to;
    const start = performance.now();
    const diff = to - from;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + diff * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        if (isGain) setTimeout(() => setGlowing(false), 900);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return { display, glowing };
}

export default function CreditBalancePill({ credits, onClick, pillRef }) {
  const { display, glowing } = useAnimatedCount(credits ?? 0);

  return (
    <button
      ref={pillRef}
      data-credit-pill="true"
      onClick={onClick}
      style={{
        background: glowing
          ? 'linear-gradient(135deg, #fde68a, #fbbf24)'
          : '#fbbf24',
        color: '#1a3a6b',
        border: 'none',
        height: 36,
        padding: '0 14px',
        borderRadius: 12,
        fontWeight: 900,
        fontSize: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        boxShadow: glowing
          ? '0 2px 16px rgba(251,191,36,0.7), 0 0 0 3px rgba(251,191,36,0.2)'
          : '0 2px 8px rgba(251,191,36,0.35)',
        whiteSpace: 'nowrap',
        transition: 'box-shadow 0.3s ease, background 0.3s ease',
        WebkitTapHighlightColor: 'transparent',
        animation: glowing ? 'creditPulse 0.45s cubic-bezier(0.34,1.6,0.64,1)' : undefined,
      }}
    >
      <CreditIcon size={16} />
      <span
        style={{
          display: 'inline-block',
          minWidth: 20,
          textAlign: 'center',
          transition: 'transform 0.15s',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
      </span>
      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>

      <style>{`
        @keyframes creditPulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
      `}</style>
    </button>
  );
}