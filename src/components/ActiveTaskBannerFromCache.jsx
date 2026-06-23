import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ActiveTaskBanner from '@/components/ActiveTaskBanner';

/**
 * Reads the active task directly from the shared React Query caches
 * (['activeWorkerTask', meId] or ['activeClientTask', meId]) — the same
 * caches that HomeFeed and Layout keep live via WebSocket.
 *
 * This ensures TaskDetail's banner is always in sync with the feed banner
 * without creating a second data source.
 */
export default function ActiveTaskBannerFromCache({ taskId, isWorker }) {
  const { user: me } = useAuth();

  const { data: activeWorkerTask } = useQuery({
    queryKey: ['activeWorkerTask', me?.id],
    queryFn: () =>
      base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }, '-created_date', 1).then(r => r?.[0] || null),
    enabled: !!me?.id && isWorker,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: activeClientTask } = useQuery({
    queryKey: ['activeClientTask', me?.id],
    queryFn: () =>
      base44.entities.Task.filter({ client_id: me.id, status: 'TAKEN' }, '-created_date', 1).then(r => r?.[0] || null),
    enabled: !!me?.id && !isWorker,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const liveTask = isWorker ? activeWorkerTask : activeClientTask;

  // Only show if the cached task matches the current task page
  if (!liveTask || liveTask.id !== taskId) return null;

  return (
    <div style={{ padding: '0 12px', paddingTop: 8 }}>
      <ActiveTaskBanner
        tasks={[{ ...liveTask, _roleHint: isWorker ? 'worker' : 'client' }]}
        roleHint={isWorker ? 'worker' : 'client'}
      />
    </div>
  );
}