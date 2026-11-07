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
    let lastY = -1;
    let lastKeyboard = null;

    const apply = () => {
      frame = 0;
      const h = Math.round(vv.height);
      const y = Math.round(vv.offsetTop);
      if (h === lastH && y === lastY) return;
      lastH = h;
      lastY = y;

      // ÷ the surface scale: the viewport is reported in the window's own px,
      // while everything written into the zoomed surface is multiplied by it.
      const scale = surfaceScale();
      el.style.height = `${Math.round(h / scale)}px`;
      el.style.transform = y ? `translateY(${Math.round(y / scale)}px)` : '';

      // iOS keeps the home-indicator inset while the keyboard is up, which
      // would push the composer off the keyboard by ~34px.
      const keyboardOpen = vv.height < window.innerHeight - 120;
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
      el.style.transform = '';
      el.style.removeProperty('--safe-bottom');
    };
  }, [ref]);
}