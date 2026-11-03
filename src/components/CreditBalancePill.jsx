/**
 * CreditBalancePill — the Jobas balance in the header.
 *
 * ONE pill, three things inside it: the official Joba24 coin, the real balance,
 * and a blue plus circle that opens the existing purchase flow. The plus is part
 * of the pill (not a second button beside it), so the whole element reads as one
 * quiet control instead of two competing ones — and the purchase is still one tap
 * away from the balance it tops up.
 *
 * The pill is a neutral surface with a thin border rather than a filled accent:
 * the balance is information, not the screen's main action, and a saturated block
 * in the header competed with the page's own CTA. Colours come from the design
 * tokens, so light and dark mode are both covered.
 */
import { useState, useEffect, useRef } from 'react';
import CreditIcon from '@/components/CreditIcon';
import { Lock, PlusCircle } from 'lucide-react';

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

export default function CreditBalancePill({ credits, locked = 0, onClick, onLockedClick, pillRef }) {
  const { display, glowing } = useAnimatedCount(credits ?? 0);
  const showLocked = locked > 0;

  // A large balance must never push the header's own controls out of the row:
  // the step down is on the number alone, and the pill keeps its size.
  const digits = String(display ?? 0).length;
  const numberSize = digits > 5 ? 12 : digits > 4 ? 13 : 14.5;

  return (
    <div data-credit-pill="true" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {/* ── The pill ── */}
      <button
        ref={pillRef}
        data-credit-pill="true"
        onClick={onClick}
        aria-label={`יתרת ג'ובות: ${display}. לרכישת ג'ובות`}
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-1)',
          height: 42,
          minHeight: 42,
          minWidth: 'unset',
          paddingInlineStart: 11,
          paddingInlineEnd: 6,
          borderRadius: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: 'var(--shadow-xs)',
          whiteSpace: 'nowrap',
          WebkitTapHighlightColor: 'transparent',
          transition: 'box-shadow 0.25s ease, border-color 0.2s ease',
          animation: glowing ? 'creditPulse 0.45s cubic-bezier(0.34,1.6,0.64,1)' : undefined,
        }}
      >
        {/* The official Joba24 coin — the balance's own sign, never an emoji */}
        <CreditIcon size={16} />

        <span
          style={{
            display: 'inline-block',
            minWidth: 16,
            textAlign: 'center',
            fontSize: numberSize,
            fontWeight: 600,
            letterSpacing: -0.1,
            color: 'var(--j-credit-text)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {display}
        </span>

        {/* The purchase action, INSIDE the pill. A span (not a nested button)
            keeps the markup valid; it stops the click from bubbling so the pill's
            own handler and this one never both fire. */}
        <span
          role="button"
          tabIndex={0}
          aria-label="רכישת ג'ובות"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onClick?.(); }
          }}
          style={{
            width: 28,
            height: 28,
            minHeight: 'unset',
            minWidth: 'unset',
            flexShrink: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--brand-primary-light)',
            border: '1px solid var(--border-2)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <PlusCircle size={17} strokeWidth={2} color="var(--brand-primary)" />
        </span>
      </button>

      {/* Locked indicator — unchanged behaviour (opens LockedCreditsPopup) */}
      {showLocked && (
        <button
          onClick={onLockedClick}
          aria-label="ג'ובות בהתחייבות"
          style={{
            height: 42,
            minHeight: 42,
            minWidth: 'unset',
            padding: '0 10px',
            borderRadius: 14,
            background: 'rgba(217,119,6,0.12)',
            border: '1px solid rgba(217,119,6,0.3)',
            color: '#b45309',
            fontWeight: 800,
            fontSize: 12.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.12s, background 0.15s',
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Lock size={13} strokeWidth={2.5} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{locked}</span>
        </button>
      )}

      <style>{`
        @keyframes creditPulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}