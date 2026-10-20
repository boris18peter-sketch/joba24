import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, animate, useReducedMotion } from 'framer-motion';

/**
 * The bottom navigation, with a SLIDING SELECTION BUBBLE.
 *
 * ── WHAT THE BUBBLE IS ───────────────────────────────────────────────────────
 * One rounded pill that lives INSIDE the bar (not a floating layer over the
 * app), sits behind the active tab's icon, and slides from the old tab to the
 * new one with a spring. Tapping a tab moves it; dragging a finger along the bar
 * moves it too.
 *
 * ── WHY IT IS BUILT THIS WAY ─────────────────────────────────────────────────
 * · It moves with `transform` only (a framer-motion MotionValue bound to `x`),
 *   so a drag never touches layout — no reflow, no recalculation, 60fps.
 * · Nothing re-renders per pixel. While the finger moves, the bubble's x is set
 *   directly on the MotionValue; React state changes ONLY when the candidate tab
 *   under the finger actually changes, and navigation happens ONLY on release.
 * · `touch-action: pan-y` on the bar means the browser keeps vertical scrolling
 *   entirely (a swipe up still scrolls the feed) and hands us the horizontal
 *   gesture instead of cancelling it mid-drag.
 * · The four REGULAR tabs are the only candidates. The raised publish button is
 *   never a target: dragging across it passes straight through to the tab on the
 *   far side, and it can never be triggered by a swipe.
 * · Geometry is measured from the real elements, so RTL (where the first tab is
 *   on the right) needs no special case.
 * · prefers-reduced-motion is honoured: the bubble jumps instead of springing.
 */

const DRAG_THRESHOLD = 8;   // px of horizontal travel before a press becomes a drag
const TAP_TOLERANCE = 6;    // px of movement still treated as a plain tap

export default function BottomNav({ items, activePath, isRTL, onNavigate, onPrimary }) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef(null);
  const tabRefs = useRef({});
  const x = useMotionValue(0);
  const suppressClickRef = useRef(false);
  const gesture = useRef({ active: false, startX: 0, startY: 0, moved: false, index: null });

  const [rects, setRects] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const regular = items.filter((i) => !i.primary);
  const primary = items.find((i) => i.primary);
  // A stable signature for the tab set — `items` is a fresh array on every render
  // of the parent, so measuring on its identity would loop.
  const tabKey = regular.map((i) => i.to).join('|');

  const activeIndex = regular.findIndex((i) => i.to === activePath);

  // ── Measure the real tab boxes ─────────────────────────────────────────────
  // Everything the bubble needs (position, size, hit-testing) comes from here, so
  // RTL, a zoomed desktop surface and a font change all land in the right place
  // without a single direction-specific calculation.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const parent = el.getBoundingClientRect();
      const next = regular.map((it) => {
        const node = tabRefs.current[it.to];
        if (!node) return null;
        const r = node.getBoundingClientRect();
        const left = r.left - parent.left;
        return { to: it.to, left, width: r.width, center: left + r.width / 2, top: r.top - parent.top, height: r.height };
      }).filter(Boolean);
      setRects((prev) =>
        prev.length === next.length &&
        prev.every((p, i) => p.to === next[i].to && Math.abs(p.center - next[i].center) < 0.5 && Math.abs(p.width - next[i].width) < 0.5)
          ? prev
          : next
      );
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      if (ro) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey]);

  // The bubble is the tab box, inset a little — one size, shared by every tab.
  const bubbleW = rects[0] ? Math.min(58, Math.max(44, rects[0].width - 12)) : 52;
  const bubbleH = rects[0] ? Math.max(36, rects[0].height - 10) : 42;
  const bubbleTop = rects[0] ? rects[0].top + 5 : 9;

  // Where the bubble wants to be: the tab under the finger while dragging, the
  // active tab otherwise. Null when the current route is not one of the four
  // tabs (e.g. the wallet) — then there is nothing to point at.
  const aimIndex = dragging ? dragIndex : (activeIndex >= 0 ? activeIndex : null);
  const targetX = aimIndex != null && rects[aimIndex] ? rects[aimIndex].center - bubbleW / 2 : null;

  // ── The spring ─────────────────────────────────────────────────────────────
  // Runs whenever the destination changes AND whenever a drag ends — so a drag
  // that did not reach another tab springs gently home. During a drag the finger
  // owns the value and this stands aside.
  const firstAimRef = useRef(true);
  useEffect(() => {
    if (targetX == null || dragging) return;
    // The very first placement is a JUMP, never a slide: the nav unmounts on the
    // map and the publish screens, so it remounts on the way back — and a bubble
    // that glided in from the left edge every time would read as a glitch rather
    // than as motion.
    if (firstAimRef.current) {
      firstAimRef.current = false;
      x.set(targetX);
      return;
    }
    const controls = animate(
      x,
      targetX,
      reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }
    );
    return () => controls.stop();
  }, [targetX, dragging, reduceMotion, x]);

  const endGesture = useCallback((pointerId, navigateOnRelease) => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    try { trackRef.current?.releasePointerCapture?.(pointerId); } catch { /* not captured */ }
    if (!g.moved) {
      setDragging(false);
      setDragIndex(null);
      return; // a plain tap — the tab's own link handles it
    }
    // The drag must not also fire the link it happened to end on.
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 400);
    const idx = g.index;
    setDragging(false);
    setDragIndex(null);
    if (navigateOnRelease && idx != null) {
      const target = rects[idx];
      if (target && target.to !== activePath) onNavigate?.(target.to);
    }
    // No navigation: `dragging` flipping to false re-aims the spring at the
    // active tab, which is the gentle return-to-place.
  }, [rects, activePath, onNavigate]);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesture.current = { active: true, startX: e.clientX, startY: e.clientY, moved: false, index: null };
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g.active) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved) {
      // Only a clearly HORIZONTAL gesture becomes a drag. Until then nothing is
      // prevented and nothing is captured, so a vertical swipe scrolls the page
      // exactly as it always did.
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      g.moved = true;
      setDragging(true);
      try { trackRef.current?.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    }
    const el = trackRef.current;
    if (!el || !rects.length) return;
    const parent = el.getBoundingClientRect();
    const fingerX = e.clientX - parent.left;
    // The bubble follows the finger, clamped to the span of the four tabs, so it
    // glides continuously across the publish button instead of jumping over it.
    const first = rects[0];
    const last = rects[rects.length - 1];
    const clamped = Math.max(first.center, Math.min(last.center, fingerX));
    x.set(clamped - bubbleW / 2);
    // The candidate is the NEAREST regular tab — which is what lets a swipe past
    // the publish button carry on to the tab on the other side.
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < rects.length; i += 1) {
      const d = Math.abs(rects[i].center - fingerX);
      if (d < best) { best = d; nearest = i; }
    }
    if (g.index !== nearest) {
      g.index = nearest;
      setDragIndex(nearest);
    }
  };

  const onPointerUp = (e) => endGesture(e.pointerId, true);
  const onPointerCancel = (e) => endGesture(e.pointerId, false);

  return (
    <div
      className="j-bottom-nav"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: 'var(--j-nav-glass, var(--nav-bg))',
        borderTop: '1px solid var(--border-1)',
        boxShadow: '0 -1px 10px rgba(10,90,190,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        ref={trackRef}
        // No `dir` here on purpose: the grid follows the document's direction, so
        // the tabs are already laid out right-to-left in Hebrew. The bubble's
        // position is measured from the real elements, so it needs no direction
        // logic of its own either.
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'grid',
          gridTemplateColumns: primary ? '1fr 1fr auto 1fr 1fr' : '1fr 1fr 1fr 1fr',
          alignItems: 'center',
          padding: '4px 4px 2px',
          position: 'relative',
          // Vertical scrolling stays the browser's; the horizontal gesture is ours.
          touchAction: 'pan-y',
        }}
      >
        {/* The bubble — inside the bar, behind the icons. */}
        {targetX != null && (
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: bubbleTop,
              left: 0,
              width: bubbleW,
              height: bubbleH,
              borderRadius: 999,
              background: 'var(--j-nav-bubble, rgba(26,111,212,0.13))',
              border: '1.5px solid var(--j-nav-bubble-border, rgba(26,111,212,0.26))',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              pointerEvents: 'none',
              zIndex: 0,
              x,
            }}
          />
        )}

        {items.map(({ to, icon: Icon, label, primary: isPrimary, badge }) => {
          if (isPrimary) {
            return (
              // The publish form is open to EVERYONE: a visitor — guest
              // included — fills it freely and is asked to sign in only at the
              // PUBLISH step. Gating this button behind login was the one reason
              // the form was reachable from the side menu but not from the main
              // feed. Untouched by the bubble: it is never a target.
              <button
                id="onboarding-create-btn"
                key={to}
                onClick={() => onPrimary?.(to)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  marginTop: -22, background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, WebkitTapHighlightColor: 'transparent', justifySelf: 'center',
                  position: 'relative', zIndex: 2,
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-nav-active, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(26,111,212,0.4)' }}>
                  <Icon size={24} color="white" />
                </div>
                <span style={{ fontSize: 9.5, color: 'var(--brand-nav-active, var(--brand-primary))', marginTop: 3, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
              </button>
            );
          }
          // The icon under the bubble is highlighted as the bubble passes over it,
          // not only once the tab is chosen.
          const lit = activePath === to || (dragging && rects[dragIndex]?.to === to);
          return (
            <Link
              key={to}
              to={to}
              ref={(node) => { tabRefs.current[to] = node; }}
              onClick={(e) => {
                if (suppressClickRef.current) { e.preventDefault(); e.stopPropagation(); return; }
                onNavigate?.(to, e);
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2, padding: '8px 4px 6px',
                textDecoration: 'none', position: 'relative', height: 52,
                WebkitTapHighlightColor: 'transparent', zIndex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon
                  size={21}
                  color={lit ? 'var(--brand-nav-active, var(--brand-primary))' : 'var(--brand-nav-text, #9bb3d4)'}
                  strokeWidth={lit ? 2.4 : 2}
                  style={{ transition: 'color 0.18s ease' }}
                />
                {badge > 0 && (
                  <div style={{ position: 'absolute', top: -5, right: -10, background: '#dc2626', color: 'white', fontSize: 9, fontWeight: 900, minWidth: 17, height: 17, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white', padding: '0 4px' }}>{badge}</div>
                )}
              </div>
              <span style={{ fontSize: 9.5, color: lit ? 'var(--brand-nav-active, var(--brand-primary))' : 'var(--brand-nav-text, var(--text-3))', fontWeight: lit ? 700 : 500, transition: 'color 0.18s ease' }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}