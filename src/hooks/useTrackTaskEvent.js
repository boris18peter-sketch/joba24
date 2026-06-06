import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Tracks a unique view or click for a task.
// Uses localStorage to avoid counting the same user twice per event type.
export function useTrackTaskView(taskId, enabled = true) {
  useEffect(() => {
    if (!taskId || !enabled) return;
    const key = `task_view_${taskId}`;
    if (sessionStorage.getItem(key)) return; // already tracked this session
    sessionStorage.setItem(key, '1');
    base44.functions.invoke('trackTaskEvent', { taskId, eventType: 'view' }).catch(() => {});
  }, [taskId, enabled]);
}

export function trackTaskClick(taskId) {
  if (!taskId) return;
  const key = `task_click_${taskId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  base44.functions.invoke('trackTaskEvent', { taskId, eventType: 'click' }).catch(() => {});
}