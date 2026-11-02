import { useEffect, useRef, useState } from 'react';
import { Tag } from 'lucide-react';

/**
 * CategoryCarousel — the "או התחל מקטגוריה" rail of the published-tasks empty state.
 *
 * Every category the caller hands over is rendered, in the order it was handed
 * over. This component never sorts, filters or renames anything: the order is
 * whatever the task creation form uses, so the two can never drift apart.
 *
 * One round icon and one short label per category, scrolling horizontally. In
 * RTL the FIRST category sits at the right edge and the rail scrolls leftwards,
 * which the browser does natively once `dir="rtl"` is in effect.
 */
export default function CategoryCarousel({ items = [], onSelect, isRTL = true }) {
  const railRef = useRef(null);
  const touchRef = useRef({ x: 0, y: 0, moved: false });
  const [scrollable, setScrollable] = useState(false);

  // A scroll hint only makes sense when there is really more to scroll to, so
  // the fade is attached only while the rail actually overflows.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const check = () => setScrollable(el.scrollWidth - el.clientWidth > 8);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);

  // A swipe must scroll the rail and NOT open a category. The movement is
  // measured on touch, and the click that follows a real swipe is swallowed.
  const onTouchStart = (e) => {
    const p = e.touches[0];
    touchRef.current = { x: p.clientX, y: p.clientY, moved: false };
  };
  const onTouchMove = (e) => {
    const p = e.touches[0];
    if (Math.abs(p.clientX - touchRef.current.x) + Math.abs(p.clientY - touchRef.current.y) > 8) {
      touchRef.current.moved = true;
    }
  };
  const handleSelect = (key) => {
    if (touchRef.current.moved) { touchRef.current.moved = false; return; }
    onSelect(key);
  };

  if (!items.length) return null;

  const fade = scrollable
    ? `linear-gradient(${isRTL ? 'to left' : 'to right'}, #000 84%, transparent 100%)`
    : undefined;

  return (
    <>
      <div
        ref={railRef}
        className="j-cat-rail"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          overflowX: 'auto', overflowY: 'hidden',
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: 2,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      >
        {items.map(({ key, label, emoji }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleSelect(key)}
            style={{
              flex: '0 0 auto', width: 72, minWidth: 72,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: 0, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: 44, height: 44, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface-2)', border: '1px solid var(--border-1)',
              fontSize: 20, lineHeight: 1, flexShrink: 0,
            }}>
              {emoji || <Tag size={17} strokeWidth={2} color="var(--brand-primary)" />}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: 'var(--text-2)',
              maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <style>{`.j-cat-rail::-webkit-scrollbar { display: none; }`}</style>
    </>
  );
}