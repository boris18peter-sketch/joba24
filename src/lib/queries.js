import { base44 } from '@/api/base44Client';

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