/**
 * BottomNav — the app's bottom bar, with ONE selection bubble that behaves like
 * a piece of soft material rather than a highlighted background.
 *
 * ── WHY THE PREVIOUS VERSION COULD NOT BE DRAGGED ───────────────────────────
 * The gesture died on its first frame, and the cause was a single line. On touch,
 * the browser gives the pressed element an IMPLICIT pointer capture. The handler
 * then called `setPointerCapture` on the bar to take the gesture over — which
 * TRANSFERS capture, so the element that had it (the tab link under the finger)
 * fires `lostpointercapture`. That event bubbles, the bar listened for it, and
 * the handler treated it as "the gesture was cancelled" — so every drag was torn
 * down the instant it started, and the bar fell back to being a row of buttons.
 *
 * Two changes make that impossible now:
 *   • the gesture is followed with `pointermove`/`pointerup`/`pointercancel`
 *     listeners on the WINDOW, attached when the gesture starts and removed when
 *     it ends. They receive every move wherever the finger goes, so the gesture
 *     no longer depends on who holds the capture — and `lostpointercapture` is
 *     not listened for at all, so it cannot cancel anything.
 *   • capture is taken only for a MOUSE, where there is no implicit capture to
 *     transfer and the drag must survive the pointer leaving the bar.
 *
 * ── THREE THINGS HAPPEN TO THE BUBBLE ───────────────────────────────────────
 *   1. PRESS — on `pointerdown`, before the finger is lifted, it shrinks
 *      slightly. The response starts on TOUCH, not on click, and it is visible
 *      even when the finger never moves.
 *   2. DRAG — while the finger travels, the bubble follows it frame by frame and
 *      the tab nearest the bubble's centre lights up, so the selection is
 *      readable mid-gesture. The gesture can start ANYWHERE in the bar, not only
 *      on an icon.
 *   3. LOCK — on release it springs onto the nearest tab. Navigation happens
 *      ONLY here, once, on the final selection — never on a move.
 *
 * ── ONE SHAPE, AND IT NEVER CHANGES ─────────────────────────────────────────
 * The bubble is a single fixed size — uniform width and height on every tab, one
 * radius, no stretching and no scaling while it travels. An earlier version
 * stretched it along the axis of travel; that is what made it read as
 * asymmetric, because the shape you saw depended on how fast you were dragging.
 * It is now positioned only, so it is perfectly symmetric at every instant.
 *
 * ── GEOMETRY IS MEASURED, NEVER GUESSED ─────────────────────────────────────
 * Every position comes from the real elements' boxes: each tab's own centre, and
 * the bar's own width. Nothing is a hard-coded `left`/`right`, so RTL (where the
 * first tab is on the right), a zoomed desktop surface, a wider phone and a font
 * change all land in the right place with no direction-specific calculation.
 * Because all tab cells are equal and the bubble has one uniform width, the gap
 * between the bubble and each end of the bar is identical on both sides — that
 * symmetry is a consequence of the measurement, not a number anyone tuned.
 *
 * ── PERFORMANCE ─────────────────────────────────────────────────────────────
 * The bubble's position is a framer-motion value written directly by the pointer
 * handler, so a moving finger causes NO React render. The only state a gesture
 * sets is the index of the lit tab, and only when it CHANGES — at most a handful
 * of renders for a whole drag. Tab boxes are measured once per layout change,
 * never per pointer event.
 *
 * `touch-action: pan-y` keeps vertical scrolling with the browser and hands us
 * the horizontal gesture instead of having it cancelled mid-drag.
 *
 * ── THE PUBLISH BUTTON ──────────────────────────────────────────────────────
 * The raised blue button is an ACTION, not a tab. It is excluded from the tab
 * set entirely, so the bubble can never be selected onto it, a drag across it
 * passes straight through to the tab on the far side, and no gesture can ever
 * trigger a publish.
 *
 * The bar is a real `nav` of real links: Tab moves through them, Enter opens
 * one, and the arrow keys move focus along the row. `prefers-reduced-motion`
 * turns the springs into instant placement.
 */

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';

// ── The bubble's shape — one size for every tab ──────────────────────────────
const BUBBLE_H = 40;         // uniform height
const BUBBLE_RATIO = 0.74;   // width as a share of a tab's own cell…
const BUBBLE_MIN_W = 52;     // …bounded, so it is never a sliver on a narrow
const BUBBLE_MAX_W = 68;     // screen and never a wide bar on a wide one
const BUBBLE_RADIUS = 999;   // one radius, everywhere

// ── The gesture ──────────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 6;    // px of clearly-horizontal travel before a press is a drag
const PRESS_SCALE = 0.95;    // the gentle shrink under a finger
const LIFT_SCALE = 1.04;     // and the slight lift once it is being carried
const SPRING_MOVE = { type: 'spring', stiffness: 430, damping: 34, mass: 0.7 };
const SPRING_PRESS = { type: 'spring', stiffness: 620, damping: 30, mass: 0.5 };

export default function BottomNav({ items, activePath, isRTL, onNavigate, onPrimary }) {
  const reduceMotion = useReducedMotion();
  const navRef = useRef(null);
  const tabRefs = useRef({});
  const gesture = useRef(null);
  const emphasisRef = useRef(null);
  const suppressClickRef = useRef(false);
  const firstAimRef = useRef(true);

  // Written by the pointer handler — never by a render.
  const x = useMotionValue(0);       // the bubble's left edge, inside the bar
  const scale = useMotionValue(1);   // press / lift, uniform on both axes

  const [geom, setGeom] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [emphasis, setEmphasis] = useState(null);

  const regular = items.filter((i) => !i.primary);
  const primary = items.find((i) => i.primary);
  // A stable signature for the tab set — `items` is a fresh array on every render
  // of the parent, so measuring on its identity would loop forever.
  const tabKey = regular.map((i) => i.to).join('|');

  const activeIndex = Math.max(0, regular.findIndex((i) => i.to === activePath));

  // ── Measure the real tab boxes ─────────────────────────────────────────────
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const base = nav.getBoundingClientRect();
      const next = [];
      for (const item of regular) {
        const node = tabRefs.current[item.to];
        if (!node) return; // the row is not laid out yet — leave the last good numbers
        const r = node.getBoundingClientRect();
        next.push({
          center: r.left - base.left + r.width / 2,
          width: r.width,
          height: r.height,
          top: r.top - base.top,
        });
      }
      if (!next.length) return;

      const cellW = next[0].width;
      const bubbleW = Math.round(Math.min(Math.max(cellW * BUBBLE_RATIO, BUBBLE_MIN_W), BUBBLE_MAX_W));
      const bubbleH = Math.round(Math.min(BUBBLE_H, next[0].height - 8));
      const bubbleTop = next[0].top + next[0].height / 2 - bubbleH / 2;
      const candidate = { rects: next, bubbleW, bubbleH, bubbleTop };

      // Only commit when something actually moved: the same numbers in a new
      // object would re-render the bar on every parent render.
      setGeom((prev) => (
        prev &&
        prev.rects.length === next.length &&
        Math.abs(prev.bubbleW - bubbleW) < 0.5 &&
        Math.abs(prev.bubbleTop - bubbleTop) < 0.5 &&
        prev.rects.every((p, i) => Math.abs(p.center - next[i].center) < 0.5 && Math.abs(p.width - next[i].width) < 0.5)
          ? prev
          : candidate
      ));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [tabKey, activePath]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Where the bubble rests ─────────────────────────────────────────────────
  const rects = geom?.rects || null;
  const activeRect = rects ? (rects[activeIndex] || rects[0]) : null;
  // Centred on the active tab's own centre — so it sits exactly around that
  // tab's icon and label, whatever the screen width.
  const restX = geom && activeRect ? activeRect.center - geom.bubbleW / 2 : null;

  useEffect(() => {
    if (restX == null || dragging) return;
    // The very first placement is a JUMP, never a slide: the bar unmounts on the
    // map and the publish screens, so it remounts on the way back — and a bubble
    // that glided in from the left edge every time would read as a glitch.
    if (firstAimRef.current) {
      firstAimRef.current = false;
      x.set(restX);
      return;
    }
    const opts = reduceMotion ? { duration: 0 } : SPRING_MOVE;
    const move = animate(x, restX, opts);
    return () => move.stop();
  }, [restX, dragging, reduceMotion, x]);

  // ── Gesture plumbing ───────────────────────────────────────────────────────
  const detach = (g) => {
    if (!g) return;
    window.removeEventListener('pointermove', g.onMove);
    window.removeEventListener('pointerup', g.onEnd);
    window.removeEventListener('pointercancel', g.onCancel);
  };

  // A finished gesture must leave nothing behind if the bar unmounts mid-drag.
  useEffect(() => () => detach(gesture.current), []); // eslint-disable-line react-hooks/exhaustive-deps

  const setEmphasisIndex = (i) => {
    if (emphasisRef.current === i) return;
    emphasisRef.current = i;
    setEmphasis(i);
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // A press that BEGINS on the raised publish button is never the start of a
    // drag — so no gesture can ever publish by accident. A drag ACROSS the middle
    // still works: it starts on a tab and every move after that is tracked
    // wherever the finger goes, including over the button.
    if (e.target?.closest?.('#onboarding-create-btn')) return;
    if (!geom || restX == null) return;

    const g = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      from: restX,
      rects: geom.rects,
      bubbleW: geom.bubbleW,
      // The bubble can never leave the span of the outer tab centres, so it can
      // neither be clipped at an end nor protrude past the bar asymmetrically.
      minX: geom.rects[0].center - geom.bubbleW / 2,
      maxX: geom.rects[geom.rects.length - 1].center - geom.bubbleW / 2,
    };
    gesture.current = g;

    // The response begins HERE, under the finger — not when the finger leaves.
    if (!reduceMotion) animate(scale, PRESS_SCALE, SPRING_PRESS);
    setEmphasisIndex(activeIndex);

    // ── CAPTURE ON DRAG, NEVER ON A PLAIN PRESS ──────────────────────────────
    // This used to capture the pointer here, on pointerdown, "so a fast drag
    // that leaves the bar keeps receiving moves". That is a real need — but
    // capturing this early also RETARGETS the compatibility mouse events to the
    // capturing element, so the `click` that follows a press was dispatched to
    // the bar itself instead of to the tab under the cursor. On a phone there is
    // no mouse and no problem; on a DESKTOP the entire bottom bar was visible
    // and completely dead — every tab press did nothing at all.
    //
    // The capture is now taken in onMove, at the exact moment the press becomes
    // a real drag, which is the only moment it is needed. A tap therefore keeps
    // its own click and navigates; a drag still tracks the pointer past the edge
    // of the bar. Touch remains uncaptured for the same reason as before: that
    // hand-over is what used to fire `lostpointercapture` and kill the gesture.
    g.capture = () => {
      if (g.captured) return;
      g.captured = true;
      try { navRef.current?.setPointerCapture?.(g.id); } catch { /* unsupported */ }
    };

    g.onMove = (ev) => {
      const cur = gesture.current;
      if (!cur || ev.pointerId !== cur.id) return;
      const dx = ev.clientX - cur.startX;
      const dy = ev.clientY - cur.startY;

      if (!cur.moved) {
        // A press only becomes a drag once it is clearly horizontal, so a
        // vertical swipe still scrolls the feed and a slightly-off tap stays a tap.
        if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
        cur.moved = true;
        // Now that it is a drag, hold the pointer so the moves keep arriving
        // even when the cursor leaves the bar.
        cur.capture?.();
        setDragging(true);
        if (!reduceMotion) animate(scale, LIFT_SCALE, SPRING_PRESS);
      }

      if (ev.cancelable) ev.preventDefault(); // no text selection / native drag

      // The bubble tracks the finger's travel continuously, at pixel resolution —
      // this is a motion value, so no React render happens here.
      const left = Math.min(Math.max(cur.from + dx, cur.minX), cur.maxX);
      x.set(left);

      // The tab nearest the BUBBLE's centre is lit while the bubble is over it.
      const centre = left + cur.bubbleW / 2;
      let nearest = 0;
      let best = Infinity;
      cur.rects.forEach((r, i) => {
        const d = Math.abs(r.center - centre);
        if (d < best) { best = d; nearest = i; }
      });
      setEmphasisIndex(nearest);
    };

    g.onEnd = (ev) => endGesture(ev, false);
    g.onCancel = (ev) => endGesture(ev, true);

    window.addEventListener('pointermove', g.onMove, { passive: false });
    window.addEventListener('pointerup', g.onEnd);
    window.addEventListener('pointercancel', g.onCancel);
  };

  const endGesture = (e, cancelled) => {
    const g = gesture.current;
    if (!g) return;
    if (e && e.pointerId !== g.id) return;
    gesture.current = null;
    detach(g);

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
    if (reduceMotion) scale.set(1);
    else animate(scale, 1, SPRING_PRESS);

    // Navigation happens ONLY here, once, on the final selection. The resting
    // spring-back is the aim effect's job — it runs the moment `dragging` clears.
    if (moved && !cancelled && landedOn != null && landedOn !== activeIndex) {
      onNavigate?.(regular[landedOn].to);
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
        // The browser keeps vertical scrolling and leaves the horizontal
        // gesture to us, instead of cancelling it mid-drag.
        touchAction: 'pan-y',
        WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
      }}
    >
      <nav
        ref={navRef}
        aria-label="ניווט ראשי"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onContextMenu={(e) => { if (gesture.current) e.preventDefault(); }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
          position: 'relative',
          maxWidth: 560, margin: '0 auto',
          touchAction: 'pan-y',
        }}
      >
        {/* ── THE ONE BUBBLE ──────────────────────────────────────────────────
            A single element that moves. Fixed width and height, one radius, no
            stretch — so it is symmetric on every tab and at every instant. Its
            translucency and inner highlight give it the depth of glass without a
            blur that would have to be re-sampled while it travels. */}
        {geom && restX != null && (
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: geom.bubbleTop,
              width: geom.bubbleW,
              height: geom.bubbleH,
              borderRadius: BUBBLE_RADIUS,
              x, scale,
              transformOrigin: 'center',
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
              {/* The icons never move — only their colour and weight respond, so
                  the row is still while the bubble travels through it. */}
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
      </nav>
    </div>,
    document.body
  );
}