import { useEffect, useRef, useState } from 'react';

/**
 * useViewportHeight — React-state version. Kept for the quick-chat drawer.
 * Prefer `useChatViewport` for full-screen chat: it writes to the DOM directly
 * and therefore never re-renders the message list while the keyboard moves.
 */
export function useViewportHeight() {
  const [state, setState] = useState(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
  }));

  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      setState({
        height: vv ? vv.height : window.innerHeight,
        offsetTop: vv ? vv.offsetTop : 0,
      });
    };
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    update();
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);

  return state;
}

/**
 * useChatViewport — pins a full-screen chat shell to the *visible* viewport so
 * the composer always sits directly above the on-screen keyboard.
 *
 * How it avoids the classic "double adjustment" jump:
 *   • it writes styles straight onto the DOM node — no React state, so the
 *     message list is never re-rendered while the keyboard animates;
 *   • all writes are coalesced into a single requestAnimationFrame per change;
 *   • it uses `transform: translateY()` rather than `top`, so following the
 *     visual viewport stays on the compositor instead of triggering layout;
 *   • identical geometry is skipped, so idle scroll events cost nothing.
 *
 * The element keeps `position: fixed; inset: 0` from CSS; only `height` and the
 * translate are overridden. Because the document itself never scrolls, the
 * layout viewport stays put and the two adjustments can't compound.
 *
 * When the keyboard is open the bottom safe-area inset is zeroed via
 * `--safe-bottom`, so the composer doesn't float above the keyboard with a
 * phantom home-indicator gap.
 */
/**
 * The surface scale, as a number.
 *
 * On a tablet or a desktop the whole app is painted inside a `zoom` (see
 * src/lib/desktopScale.js, which publishes the factor as `--ui-scale`). `zoom`
 * multiplies every length written into that surface — INCLUDING a px height set
 * from JavaScript. So a shell measured at 900px and then magnified 1.3× became
 * 1170px tall on a 900px screen, and the composer — its last child — was simply
 * off the bottom of the window. That is why the chat had no input on a computer
 * while working perfectly on a phone.
 *
 * Every measurement below is therefore divided by this factor before it is
 * written, so the geometric result after zooming is exactly the visible viewport.
 */
function surfaceScale() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 1;
  const root = document.documentElement;
  const declared = parseFloat(root.style.getPropertyValue('--ui-scale'));
  if (Number.isFinite(declared) && declared > 0) return declared;
  const computed = parseFloat(window.getComputedStyle(root).zoom);
  if (Number.isFinite(computed) && computed > 0) return computed;
  return 1;
}

export function useChatViewport(ref, onGeometryChange) {
  // Held in a ref so a new callback identity never re-subscribes the listeners.
  const callbackRef = useRef(onGeometryChange);
  callbackRef.current = onGeometryChange;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    let frame = 0;
    let lastH = -1;
    let lastW = -1;
    let lastY = -1;
    let lastX = -1;
    let lastKeyboard = null;
    // The tallest geometry ever seen: the WITH-keyboard state is measured
    // against this, never against `window.innerHeight`. On Android the viewport
    // meta declares `interactive-widget=resizes-content`, so the layout viewport
    // — and therefore innerHeight — shrinks BY the keyboard, which made the old
    // comparison ("vv.height < innerHeight - 120") false whenever the keyboard
    // opened and left the bottom safe-area inset in place, floating the composer
    // above the keyboard. A high-water mark is a fact on both platforms.
    let baseline = 0;

    const apply = () => {
      frame = 0;
      const h = Math.round(vv.height);
      const w = Math.round(vv.width);
      const y = Math.round(vv.offsetTop);
      const x = Math.round(vv.offsetLeft);
      if (h === lastH && w === lastW && y === lastY && x === lastX) return;
      lastH = h;
      lastW = w;
      lastY = y;
      lastX = x;
      if (h > baseline) baseline = h;

      // ÷ the surface scale: the viewport is reported in the window's own px,
      // while everything written into the zoomed surface is multiplied by it.
      const scale = surfaceScale();
      el.style.height = `${Math.round(h / scale)}px`;
      // ── THE WIDTH AND THE HORIZONTAL OFFSET ARE PART OF THE SAME PIN ───────
      // Compensating only `top` left the horizontal axis to the browser: a
      // visual viewport that ends up shifted sideways (Safari nudging the page
      // to reveal a focused field) moved the chat under the finger. Writing the
      // width and both offsets pins the shell to the visible rectangle on both
      // axes — one frame, one write, nothing left for the browser to decide.
      el.style.width = `${Math.round(w / scale)}px`;
      el.style.transform = (x || y)
        ? `translate3d(${Math.round(x / scale)}px, ${Math.round(y / scale)}px, 0)`
        : '';

      // iOS keeps the home-indicator inset while the keyboard is up, which
      // would push the composer off the keyboard by ~34px.
      //
      // A keyboard is only ever up around a focused field, so a shrink with
      // nothing focused is a ROTATION or a resized window, not a keyboard — the
      // baseline is moved down to it instead of reporting a phantom keyboard
      // that would keep the composer's inset switched off.
      const editableFocused = () => {
        const a = document.activeElement;
        return !!a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.isContentEditable);
      };
      if (baseline - h > 120 && !editableFocused()) baseline = h;
      const keyboardOpen = baseline - h > 120;
      if (keyboardOpen !== lastKeyboard) {
        lastKeyboard = keyboardOpen;
        if (keyboardOpen) el.style.setProperty('--safe-bottom', '0px');
        else el.style.removeProperty('--safe-bottom');
      }

      // Let the owner react to the new geometry in the same frame the height
      // changed (e.g. keep the newest message anchored to the bottom).
      callbackRef.current?.({ height: h, offsetTop: y, keyboardOpen });
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    apply();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      el.style.height = '';
      el.style.width = '';
      el.style.transform = '';
      el.style.removeProperty('--safe-bottom');
    };
  }, [ref]);
}