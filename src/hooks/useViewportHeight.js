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

      el.style.height = `${h}px`;
      el.style.transform = y ? `translateY(${y}px)` : '';

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