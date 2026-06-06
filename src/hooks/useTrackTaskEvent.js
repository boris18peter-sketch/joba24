import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

function fireEvent(taskId, eventType) {
  const key = `task_${eventType}_${taskId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  base44.functions.invoke('trackTaskEvent', { taskId, eventType }).catch(() => {});
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
          // Start a 500ms timer — only count if card stays visible
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
export function trackTaskClick(taskId) {
  if (!taskId) return;
  fireEvent(taskId, 'click');
}