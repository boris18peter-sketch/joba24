import { base44 } from '@/api/base44Client';
import { fetchPublicTasks } from '@/lib/publicTasks';

/**
 * Canonical query definitions for the CURRENT USER'S OWN data.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 * The same three lists — my published tasks, the tasks I'm working on, and my
 * applications — were being fetched from several screens at once, each with its
 * own query key, its own limit and its own queryFn:
 *
 *   · my published tasks   ['myTasks'] (limit 20) + ['myPublishedTasks'] (50)
 *   · my applications      ['myApplicationsFeed'] (100 in one screen, 50 in
 *                          another) + ['myApplicationsLayout'] (50)
 *
 * React Query keys a cache by its key, so two keys are two caches — which meant
 * the same records were downloaded twice on every app start, and the two copies
 * could disagree. Worse, when two screens DID share a key but passed different
 * queryFns, the first one to mount silently decided the limit and the shape for
 * everyone else.
 *
 * These helpers are now the single definition of each list. Every screen imports
 * them, so the key AND the queryFn are always identical: React Query collapses
 * all observers onto ONE request, and the data every screen reads is the same
 * data. Change a limit here and it changes everywhere, deliberately.
 *
 * Reads only. Anything that mutates a task or an application still goes through
 * its backend function, and taskSync / useRealtimeSync still own cache
 * invalidation and live updates.
 */

/** How many of the user's own tasks a list holds. */
export const MY_TASKS_LIMIT = 50;

/** How many applications a list holds — deep enough for the ranking history. */
export const MY_APPLICATIONS_LIMIT = 100;

/** Tasks I published (I am the client). */
export const myPublishedTasksQuery = (meId) => ({
  queryKey: ['myPublishedTasks', meId],
  queryFn: () => base44.entities.Task.filter({ client_id: meId }, '-created_date', MY_TASKS_LIMIT),
  enabled: !!meId,
  staleTime: 60000,
  // Safety net only — live updates arrive over the realtime subscription.
  refetchInterval: 60000,
  refetchOnWindowFocus: false,
});

/** Tasks I am working on (I am the worker). */
export const workerTasksQuery = (meId) => ({
  queryKey: ['workerTasksLayout', meId],
  queryFn: () => base44.entities.Task.filter({ worker_id: meId }, '-created_date', MY_TASKS_LIMIT),
  enabled: !!meId,
  staleTime: 60000,
  refetchOnWindowFocus: false,
});

/** Applications I submitted. */
export const myApplicationsQuery = (meId) => ({
  queryKey: ['myApplicationsFeed', meId],
  queryFn: () => base44.entities.TaskApplication.filter({ worker_id: meId }, '-created_date', MY_APPLICATIONS_LIMIT),
  enabled: !!meId,
  staleTime: 60000,
  refetchOnWindowFocus: false,
});

/** The task I am actively working on — derived from the worker list. */
export const selectActiveWorkerTask = (workerTasks) =>
  (workerTasks || []).find((t) => t.status === 'TAKEN') || null;

/** The task I published that is actively being worked on — derived from the published list. */
export const selectActiveClientTask = (publishedTasks) =>
  (publishedTasks || []).find((t) => t.status === 'TAKEN') || null;

/**
 * The OPEN-task feed — the marketplace itself.
 *
 * The feed, the map and the daily goal all want exactly this list, and each used
 * to declare it under its own key (['allTasks'], ['tasks'], ['open-tasks-daily'])
 * — three caches of the same hundred tasks, so moving between those three screens
 * downloaded the whole feed again every time. One key means one request, and the
 * realtime patches that keep it live now benefit all three screens at once.
 *
 * The options are deliberately identical for every caller. With one shared query,
 * whichever screen mounted LAST used to decide the polling interval — so a screen
 * that set no interval could silently switch the feed's refresh off entirely.
 */
export const openTasksQuery = () => ({
  queryKey: ['allTasks'],
  queryFn: () => fetchPublicTasks({ mode: 'open', limit: 100 }),
  staleTime: 60000,
  gcTime: 300000,
  // Returning to the app from the background must re-read the feed: on Android the
  // interval timer is throttled while backgrounded, so without this a visitor
  // could come back to whatever was on screen until the next tick.
  refetchOnWindowFocus: true,
  refetchInterval: 60000,
  // A failed read is a failure, not an empty marketplace — retry before giving up,
  // and keep the tasks already loaded meanwhile (React Query only keeps them
  // because fetchPublicTasks throws instead of returning []).
  retry: 2,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
});

/**
 * My applications still awaiting a decision — the list the app reads to compute
 * the LOCKED Jobas balance, i.e. the work-capacity already committed to open
 * applications.
 *
 * The header, the purchase popup and the profile each declared this exact query
 * by hand. It is one definition now, so the balance can never be computed from a
 * differently-limited copy on a different screen.
 */
export const pendingApplicationsQuery = (meId) => ({
  queryKey: ['myLockedJobas', meId],
  queryFn: () => base44.entities.TaskApplication.filter({ worker_id: meId, status: 'pending' }, '-created_date', 50),
  enabled: !!meId,
  staleTime: 15000,
});