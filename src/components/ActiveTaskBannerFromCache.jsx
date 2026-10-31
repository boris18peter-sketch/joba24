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
export default function ActiveTaskBannerFromCache({ taskId, isWorker, extraInfo }) {
  const { user: me } = useAuth();

  // The banner must never show a task the worker has already left, completed or
  // had cancelled — but it no longer pays for that with a request on every open.
  //
  // A zero staleTime here meant the query was ALWAYS stale, so merely opening a
  // task detail page re-downloaded the task the app was already holding. These
  // two caches are now seeded from the shared task lists and patched by the
  // realtime layer, so a 30s window is trusted instead of refetching on every
  // mount. The queryFn stays for a cold start (a deep link straight into a task).
  const { data: activeWorkerTask } = useQuery({
    queryKey: ['activeWorkerTask', me?.id],
    queryFn: () =>
      base44.entities.Task.filter({ worker_id: me.id, status: 'TAKEN' }, '-created_date', 1).then(r => r?.[0] || null),
    enabled: !!me?.id && isWorker,
    staleTime: 30000,
  });

  const { data: activeClientTask } = useQuery({
    queryKey: ['activeClientTask', me?.id],
    queryFn: () =>
      base44.entities.Task.filter({ client_id: me.id, status: 'TAKEN' }, '-created_date', 1).then(r => r?.[0] || null),
    enabled: !!me?.id && !isWorker,
    staleTime: 30000,
  });

  const liveTask = isWorker ? activeWorkerTask : activeClientTask;

  // Only show if the cached task matches the current task page
  if (!liveTask || liveTask.id !== taskId) return null;

  return (
    // Inside the task detail sheet the panel sits in the sheet's own padded
    // column, so it must not add a second inset of its own.
    <div style={{ padding: extraInfo?.inSheet ? 0 : '0 12px', paddingTop: extraInfo?.inSheet ? 0 : 8 }}>
      <ActiveTaskBanner
        tasks={[{ ...liveTask, _roleHint: isWorker ? 'worker' : 'client' }]}
        roleHint={isWorker ? 'worker' : 'client'}
        extraInfo={extraInfo}
      />
    </div>
  );
}