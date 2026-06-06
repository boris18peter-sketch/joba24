import { useState, useEffect, useRef } from 'react';

/**
 * usePullToRefresh
 * Attaches pull-to-refresh gesture to a scroll container.
 * @param {Function} onRefresh - async function to call on pull
 * @param {string} scrollContainerId - id of the scrollable element (default: 'main-scroll')
 * @returns {{ refreshing, pullProgress }} - refreshing: boolean, pullProgress: 0–1
 */
export default function usePullToRefresh(onRefresh, scrollContainerId = 'main-scroll') {
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const startY = useRef(null);
  const pulling = useRef(false);
  const refreshingRef = useRef(false);

  const THRESHOLD = 72; // px to trigger

  useEffect(() => {
    const el = document.getElementById(scrollContainerId);
    if (!el) return;

    const onTouchStart = (e) => {
      if (refreshingRef.current) return;
      if (el.scrollTop > 0) return; // only trigger at top
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e) => {
      if (!pulling.current || startY.current === null) return;
      if (el.scrollTop > 0) { pulling.current = false; setPullProgress(0); return; }
      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) { setPullProgress(0); return; }
      // Rubber-band: dampen the pull
      const damped = Math.min(delta * 0.45, THRESHOLD * 1.2);
      setPullProgress(Math.min(damped / THRESHOLD, 1));
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullProgress >= 1 && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullProgress(0);
        try { await onRefresh(); } finally {
          setRefreshing(false);
          refreshingRef.current = false;
        }
      } else {
        setPullProgress(0);
      }
      startY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, pullProgress, scrollContainerId]);

  return { refreshing, pullProgress };
}