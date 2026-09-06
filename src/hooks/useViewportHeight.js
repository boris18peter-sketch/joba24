import { useState, useEffect } from 'react';

/**
 * useViewportHeight — tracks the VisualViewport height so chat screens
 * shrink to fit above the on-screen keyboard (WhatsApp-style) instead of
 * the keyboard pushing the whole layout up.
 *
 * Returns { height, offsetTop }:
 *   - height:   current visualViewport height in px (falls back to
 *               window.innerHeight when VisualViewport is unavailable)
 *   - offsetTop: visualViewport.offsetTop — on iOS the visual viewport can
 *               scroll independently of the layout viewport when the keyboard
 *               opens.  Setting `top: offsetTop` on the container keeps it
 *               aligned with the visible area so the input bar never floats
 *               over the wrong screen.
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