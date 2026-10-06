import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useMyScheduleTasks — every task the signed-in user takes part in, as client
 * or as worker, that could carry a schedule.
 *
 * One cached query keyed by user, shared by the Job Calendar page and the small
 * Upcoming card on the Home feed, so opening the calendar never refetches what
 * the feed already loaded.
 *
 * Cancelled and expired tasks are dropped: they are no longer engagements.
 */
export function useMyScheduleTasks() {
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });
  const meId = me?.id;

  const { data = [], isLoading } = useQuery({
    queryKey: ['myScheduleTasks', meId],
    queryFn: async () => {
      const [asWorker, asClient] = await Promise.all([
        base44.entities.Task.filter({ worker_id: meId }, '-created_date', 100),
        base44.entities.Task.filter({ client_id: meId }, '-created_date', 100),
      ]);
      const seen = new Set();
      const merged = [];
      for (const task of [...(asWorker || []), ...(asClient || [])]) {
        if (!task?.id || seen.has(task.id)) continue;
        seen.add(task.id);
        if (task.status === 'CANCELLED' || task.status === 'EXPIRED') continue;
        merged.push(task);
      }
      return merged;
    },
    enabled: !!meId,
    staleTime: 30000,
  });

  return { tasks: data, meId, isLoading };
}