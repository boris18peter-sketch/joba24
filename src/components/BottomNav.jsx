/**
 * BottomNav — the app's bottom bar, with ONE selection bubble that behaves like
 * a piece of soft material rather than a highlighted background.
 *
 * ── WHAT MAKES IT FEEL NATIVE ───────────────────────────────────────────────
 * There is exactly ONE bubble element. It is not a per-tab background that turns
 * on and off; it is a single rounded shape that MOVES to wherever the selection
 * is. Because it persists, every transition is a movement of the same object —
 * which is the whole difference between "the active tab changed colour" and "the
 * selection travelled".
 *
 * Three things happen to it:
 *
 *   1. PRESS — on `pointerdown`, before the finger is lifted, it squashes
 *      (wider and shorter) and springs back on release. The response starts on
 *      TOUCH, not on click.
 *   2. DRAG — while the finger travels, the bubble follows it frame by frame and
 *      stretches along the axis of travel, thinning across it: a rubber band,
 *      not a cursor. The tab nearest the bubble's centre lights up as it passes,
 *      so the selection is readable mid-gesture.
 *   3. LOCK — on release it springs onto the nearest tab. Navigation happens
 *      ONLY here, once, on the final selection — never on a move.
 *
 * ── PERFORMANCE ─────────────────────────────────────────────────────────────
 * The bubble's position, width and shape are framer-motion values written
 * directly by the pointer handler. A finger moving across the bar therefore
 * causes NO React render: the transform is updated on the compositor. The only
 * state a gesture sets is the index of the lit tab, and only when it CHANGES —
 * at most a handful of renders for a whole drag.
 *
 * There is deliberately no `backdrop-filter` on the bubble. A blur that has to be
 * re-sampled while an element is moving is the single most expensive thing this
 * bar could do on Android, and the glassy look is achieved instead with a
 * translucent gradient plus an inner highlight — identical to the eye, free to
 * move. The bar itself keeps its static frosted blur, which never animates.
 *
 * ── THE PUBLISH BUTTON ──────────────────────────────────────────────────────
 * The raised blue button is an ACTION, not a tab. It is excluded from the tab
 * set entirely, so the bubble can never be selected onto it, a drag across it
 * passes straight through to the tab on the far side, and no gesture can ever
 * trigger a publish.
 *
 * ── GEOMETRY, RTL AND ACCESSIBILITY ─────────────────────────────────────────
 * Every position comes from the real elements' measured boxes, so RTL (where the
 * first tab is on the right), a zoomed desktop surface and a font change all land
 * in the right place with no direction-specific calculation.
 * `touch-action: pan-y` keeps vertical scrolling with the browser and hands us
 * the horizontal gesture instead of having it cancelled mid-drag.
 * The bar is a real `nav` of real links: Tab moves through them, Enter opens
 * one, and the arrow keys move focus along the row. `prefers-reduced-motion`
 * turns the springs into instant placement.
 */

const DRAG_THRESHOLD = 8;     // px of horizontal travel before a press becomes a drag
const MAX_STRETCH = 0.28;     // most the bubble will stretch while being dragged
const PRESS_SQUISH_X = 1.16;  // the squash it takes under a finger
const PRESS_SQUISH_Y = 0.84;
const SPRING_MOVE = { type: 'spring', stiffness: 430, damping: 32, mass: 0.7 };
const SPRING_SHAPE = { type: 'spring', stiffness: 520, damping: 26, mass: 0.5 };

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';

export default function BottomNav({ items, activePath, isRTL, onNavigate, onPrimary }) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef(null);
  const tabRefs = useRef({});
  const gesture = useRef(null);
  const emphasisRef = useRef(null);
  const suppressClickRef = useRef(false);
  const firstAimRef = useRef(true);

  // Written by the pointer handler and by the aim effect — never by a render.
  const x = useMotionValue(0);      // the bubble's left edge, inside the track
  const w = useMotionValue(0);      // and its width
  const sx = useMotionValue(1);     // shape: stretch along the travel axis…
  const sy = useMotionValue(1);     // …and thin across it

  const [rects, setRects] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [emphasis, setEmphasis] = useState(null);

  const regular = items.filter((i) => !i.primary);
  const primary = items.find((i) => i.primary);
  // A stable signature for the tab set — `items` is a fresh array on every render
  // of the parent, so measuring on its identity would loop forever.
  const tabKey = regular.map((i) => i.to).join('|');

  const activeIndex = Math.max(0, regular.findIndex((i) => i.to === activePath));
  const activeRect = rects[activeIndex] || null;

  // ── Measure the real tab boxes ─────────────────────────────────────────────
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const base = track.getBoundingClientRect();
      const next = regular.map((item) => {
        const node = tabRefs.current[item.to];
        if (!node) return null;
        const r = node.getBoundingClientRect();
        return {
          left: r.left - base.left,
          width: r.width,
          center: r.left - base.left + r.width / 2,
          top: r.top - base.top,
          height: r.height,
        };
      });
      if (next.some((r) => !r)) return;
      // Only commit when something actually moved: the same numbers in a new
      // array would re-render the bar on every parent render.
      setRects((prev) => (
        prev.length === next.length &&
        prev.every((p, i) => Math.abs(p.left - next[i].left) < 0.5 && Math.abs(p.width - next[i].width) < 0.5 && Math.abs(p.top - next[i].top) < 0.5)
          ? prev
          : next
      ));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [tabKey, activePath]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Where the bubble rests ─────────────────────────────────────────────────
  const restX = activeRect ? activeRect.left : null;
  const restW = activeRect ? activeRect.width : null;

  useEffect(() => {
    if (restX == null || dragging) return;
    // The very first placement is a JUMP, never a slide: the bar unmounts on the
    // map and the publish screens, so it remounts on the way back — and a bubble
    // that glided in from the left edge every time would read as a glitch.
    if (firstAimRef.current) {
      firstAimRef.current = false;
      x.set(restX);
      w.set(restW);
      return;
    }
    const opts = reduceMotion ? { duration: 0 } : SPRING_MOVE;
    const move = animate(x, restX, opts);
    const size = animate(w, restW, opts);
    return () => { move.stop(); size.stop(); };
  }, [restX, restW, dragging, reduceMotion, x, w]);

  // ── Gesture ────────────────────────────────────────────────────────────────
  const setEmphasisIndex = (i) => {
    if (emphasisRef.current === i) return;
    emphasisRef.current = i;
    setEmphasis(i);
  };

  const springShapeBack = () => {
    if (reduceMotion) { sx.set(1); sy.set(1); return; }
    animate(sx, 1, SPRING_SHAPE);
    animate(sy, 1, SPRING_SHAPE);
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesture.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
    setEmphasisIndex(activeIndex);
    // The response begins HERE, under the finger — not when the finger leaves.
    if (!reduceMotion) { sx.set(PRESS_SQUISH_X); sy.set(PRESS_SQUISH_Y); }
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.moved) {
      // A press only becomes a drag once it is clearly horizontal, so a vertical
      // swipe still scrolls the feed and a slightly-off tap stays a tap.
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      g.moved = true;
      setDragging(true);
      try { trackRef.current?.setPointerCapture?.(e.pointerId); } catch { /* unsupported */ }
    }

    if (!activeRect || rects.length < 2) return;

    // The bubble tracks the finger continuously, clamped to the row so it can
    // never wander off the bar. Written straight to the motion value.
    const minLeft = rects[0].left;
    const maxLeft = rects[rects.length - 1].left;
    const left = Math.min(Math.max(activeRect.left + dx, minLeft), maxLeft);
    x.set(left);

    // Rubber: it stretches along the direction of travel and thins across it, so
    // the material reads as being pulled rather than teleported.
    if (!reduceMotion) {
      const s = Math.min(Math.abs(dx) / 150, MAX_STRETCH);
      sx.set(1 + s);
      sy.set(1 - s * 0.35);
    }

    // The tab nearest the bubble's centre is lit while the bubble is over it.
    const centre = left + w.get() / 2;
    let nearest = 0;
    let best = Infinity;
    rects.forEach((r, i) => {
      const d = Math.abs(r.center - centre);
      if (d < best) { best = d; nearest = i; }
    });
    setEmphasisIndex(nearest);
  };

  const endGesture = (e, cancelled) => {
    const g = gesture.current;
    if (!g || (e && e.pointerId !== g.id)) return;
    gesture.current = null;

    const moved = g.moved;
    const landedOn = emphasisRef.current;
    emphasisRef.current = null;

    if (moved) {
      // The click that follows a drag must not also navigate to the tab the
      // finger happened to lift over — the drag already decided.
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 400);
    }

    setDragging(false);
    setEmphasis(null);
    springShapeBack();

    // Navigation happens ONLY here, once, on the final selection.
    if (moved && !cancelled && landedOn != null && landedOn !== activeIndex) {
      onNavigate?.(regular[landedOn].to);
      return; // the aim effect springs it onto the newly active tab
    }
    // Not enough travel, or cancelled: the bubble returns to where it belongs.
    if (activeRect) {
      if (reduceMotion) x.set(activeRect.left);
      else animate(x, activeRect.left, SPRING_MOVE);
    }
  };

  // Arrow keys move focus along the row; Enter (on a real link) opens it.
  const onKeyDown = (e) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const step = isRTL ? -dir : dir;
    const next = (activeIndex + step + regular.length) % regular.length;
    tabRefs.current[regular[next].to]?.focus();
  };

  return createPortal(
    <div
      className="j-bottom-nav"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: 'var(--j-nav-glass, var(--nav-bg))',
        borderTop: '1px solid var(--border-1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        touchAction: 'pan-y',
        WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
      }}
    >
      <nav
        ref={trackRef}
        aria-label="ניווט ראשי"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endGesture(e, false)}
        onPointerCancel={(e) => endGesture(e, true)}
        onLostPointerCapture={(e) => endGesture(e, true)}
        onContextMenu={(e) => { if (gesture.current) e.preventDefault(); }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
          position: 'relative',
          maxWidth: 560, margin: '0 auto',
        }}
      >
        {/* ── THE ONE BUBBLE ──────────────────────────────────────────────────
            A single element that moves. Its translucency and inner highlight give
            it the depth of glass without a blur that would have to be re-sampled
            while it travels. */}
        {restX != null && (
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: activeRect.top,
              left: 0,
              height: activeRect.height,
              borderRadius: 999,
              x, width: w, scaleX: sx, scaleY: sy,
              background: 'linear-gradient(160deg, var(--j-nav-bubble-hi, rgba(255,255,255,0.5)) 0%, var(--j-nav-bubble, rgba(26,111,212,0.20)) 100%)',
              border: '1.5px solid var(--j-nav-bubble-border, rgba(26,111,212,0.36))',
              boxShadow: 'inset 0 1px 0 var(--j-nav-bubble-hi, rgba(255,255,255,0.6)), 0 2px 10px rgba(26,111,212,0.14)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {items.map(({ to, icon: Icon, label, primary: isPrimary, badge }) => {
          if (isPrimary) {
            // An ACTION, not a tab: never a bubble target, never reachable by a
            // drag, and the bubble passes straight through it.
            return (
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

          const index = regular.indexOf(items.find((i) => i.to === to));
          // Lit when it is the active tab, and also while the bubble is passing
          // over it mid-drag — so the gesture is readable before it is committed.
          const lit = activePath === to || (dragging && emphasis === index);

          return (
            <Link
              key={to}
              to={to}
              ref={(node) => { tabRefs.current[to] = node; }}
              aria-current={activePath === to ? 'page' : undefined}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: lit ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.34,1.4,0.64,1)' }}>
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
      </nav>
    </div>,
    document.body
  );
}