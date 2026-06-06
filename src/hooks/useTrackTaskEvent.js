import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Tracks a unique view or click for a task.
// Uses sessionStorage to avoid counting the same user twice per session.
export function useTrackTaskView(taskId, enabled = true) {
  useEffect(() => {
    if (!taskId || !enabled) return;
    const key = `task_view_${taskId}`;
    if (sessionStorage.getItem(key)) return; // already tracked this session
    sessionStorage.setItem(key, '1');
    base44.functions.invoke('trackTaskEvent', { taskId, eventType: 'view' }).then((res) => {
      if (res?.data?.views_count != null) {
        // Invalidate task queries so owner sees updated count
        base44.entities.Task.filter({ id: taskId }).catch(() => {});
      }
    }).catch(() => {});
  }, [taskId, enabled]);
}

export function trackTaskClick(taskId, queryClient) {
  if (!taskId) return;
  const key = `task_click_${taskId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  base44.functions.invoke('trackTaskEvent', { taskId, eventType: 'click' }).catch(() => {});
}