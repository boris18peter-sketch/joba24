import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// queryClient is passed in so we can patch the cache immediately after the server responds
function fireEvent(taskId, eventType, queryClient) {
  const key = `task_${eventType}_${taskId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  base44.functions.invoke('trackTaskEvent', { taskId, eventType })
    .then((res) => {
      if (!queryClient || !res?.data) return;
      const { views_count, clicks_count } = res.data;
      // Patch the cached task directly — no full refetch needed
      queryClient.setQueryData(['task', taskId], (old) => {
        if (!old) return old;
        return {
          ...old,
          ...(views_count  != null ? { views_count }  : {}),
          ...(clicks_count != null ? { clicks_count } : {}),
        };
      });
      // Also patch the tasks list cache
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((t) =>
          t.id === taskId
            ? { ...t, ...(views_count != null ? { views_count } : {}), ...(clicks_count != null ? { clicks_count } : {}) }
            : t
        );
      });
    })
    .catch(() => {});
}

// Track a view when the card element scrolls into view (≥50% visible for ≥500ms)
export function useTrackTaskView(taskId, elementRef, enabled = true) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!taskId || !enabled || !elementRef?.current) return;
    const key = `task_view_${taskId}`;
    if (sessionStorage.getItem(key)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timerRef.current = setTimeout(() => {
            fireEvent(taskId, 'view');
          }, 500);
        } else {
          clearTimeout(timerRef.current);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(elementRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timerRef.current);
    };
  }, [taskId, enabled, elementRef]);
}

// Track a click (entering TaskDetail) — called once per session per task
// Pass queryClient so the banner updates immediately
export function trackTaskClick(taskId, queryClient) {
  if (!taskId) return;
  fireEvent(taskId, 'click', queryClient);
}