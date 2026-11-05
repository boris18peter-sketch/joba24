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
 *
 * ── AND IT ALWAYS SHOWS THE TOP OF THE SHEET ───────────────────────────────
 * The cache lookup was the ONLY source, so whenever it did not hold the very
 * task that was opened, this returned null and the sheet rendered its details
 * with no banner above them — the "active task sheet without the top" the
 * publisher kept hitting. The cache holds the user's *newest* TAKEN task, and a
 * publisher can have more than one published task marked TAKEN (an older one, a
 * second job taken in the same hour), or the list that seeds it simply is not
 * loaded yet on a cold open / deep link.
 *
 * The task the screen is already showing is therefore passed in as `task` and
 * used as the fallback: the live cache still WINS whenever it has the match (it
 * is the WebSocket-fed value, which is what keeps the banner in sync), and
 * otherwise the banner shows the record this sheet is open on. Never a second
 * fetch, never a second source of truth.
 */
export default function ActiveTaskBannerFromCache({ taskId, isWorker, extraInfo, task = null }) {
  const { user: me } = useAuth();
  const useCache = !!me?.id;

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
    enabled: useCache && isWorker,
    staleTime: 30000,
  });

  const { data: activeClientTask } = useQuery({
    queryKey: ['activeClientTask', me?.id],
    queryFn: () =>
      base44.entities.Task.filter({ client_id: me.id, status: 'TAKEN' }, '-created_date', 1).then(r => r?.[0] || null),
    enabled: useCache && !isWorker,
    staleTime: 30000,
  });

  const cached = isWorker ? activeWorkerTask : activeClientTask;
  // The cache wins when it holds THIS task; otherwise the record already on
  // screen keeps the banner there instead of leaving a hole — but ONLY while
  // that job is still live. A finished task (a Lock Screen completion opening
  // its own details, for example) has no active state to report, so asking the
  // banner to draw it produced an empty banner frame above the details.
  const candidate = cached?.id === taskId ? cached : (task?.id === taskId ? task : null);
  // The cache can still hold the record for a moment after it was finished (the
  // TAKEN list that reconciles it has not answered yet), so the rule is applied
  // to whichever record won — a finished job never keeps a banner alive.
  const liveTask = candidate && !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(candidate.status) ? candidate : null;

  if (!liveTask) return null;

  return (
    <div style={{ padding: '0 12px', paddingTop: 8 }}>
      <ActiveTaskBanner
        tasks={[{ ...liveTask, _roleHint: isWorker ? 'worker' : 'client' }]}
        roleHint={isWorker ? 'worker' : 'client'}
        extraInfo={extraInfo}
      />
    </div>
  );
}