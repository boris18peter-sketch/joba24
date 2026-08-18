import { useState, useEffect } from 'react';

/**
 * useViewportHeight — tracks the VisualViewport height so chat screens
 * shrink to fit above the on-screen keyboard (WhatsApp-style) instead of
 * the keyboard pushing the whole layout up.
 *
 * Returns the current visualViewport height in px (falls back to
 * window.innerHeight when VisualViewport is unavailable).
 */
export function useViewportHeight() {
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      setHeight(vv ? vv.height : window.innerHeight);
    };
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    update();
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}