/**
 * taskSync — the SINGLE place that knows every cache affected by a task-lifecycle
 * action (create / take / approve / reject / status change / cancel / delete /
 * worker exit / completion).
 *
 * The backend is the source of truth; this helper only tells React Query which
 * cached reads are now stale, so every screen that shows a task, an application,
 * a banner or a credit balance refreshes together — without a page reload and
 * without per-component workarounds.
 *
 * Safe to call after ANY mutation: invalidation is idempotent and never causes a
 * charge, refund or release (those are backend-only and idempotent by design).
 */

/**
 * Invalidate every task-lifecycle-related query for the given user.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {{ taskId?: string, meId?: string, includeCredits?: boolean }} [opts]
 */
export function invalidateTaskCaches(queryClient, { taskId, meId, includeCredits = true } = {}) {
  if (!queryClient) return;

  // The task itself — every reader of ['task', id] (sheet, detail page, chat header)
  if (taskId) {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['applications', taskId] });
    queryClient.invalidateQueries({ queryKey: ['applications-pulse', taskId] });
    queryClient.invalidateQueries({ queryKey: ['applicant-stats', taskId] });
    queryClient.invalidateQueries({ queryKey: ['lockedPopupTasks'] });
  }

  // Task lists (feed, my tasks, published, worker's tasks)
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  queryClient.invalidateQueries({ queryKey: ['myTasks'] });
  queryClient.invalidateQueries({ queryKey: ['myTasksPage'] });

  if (meId) {
    queryClient.invalidateQueries({ queryKey: ['workerTasksLayout', meId] });
    queryClient.invalidateQueries({ queryKey: ['myPublishedTasks', meId] });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsLayout', meId] });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed', meId] });
    queryClient.invalidateQueries({ queryKey: ['appliedTasks', meId] });
    // Active-task banners (feed + inside the task sheet) — read the same caches
    queryClient.invalidateQueries({ queryKey: ['activeWorkerTask', meId] });
    queryClient.invalidateQueries({ queryKey: ['activeClientTask', meId] });
  } else {
    // No id known — invalidate by prefix so every user-scoped variant refreshes
    queryClient.invalidateQueries({ queryKey: ['workerTasksLayout'] });
    queryClient.invalidateQueries({ queryKey: ['myPublishedTasks'] });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsLayout'] });
    queryClient.invalidateQueries({ queryKey: ['myApplicationsFeed'] });
    queryClient.invalidateQueries({ queryKey: ['activeWorkerTask'] });
    queryClient.invalidateQueries({ queryKey: ['activeClientTask'] });
  }

  // Credits — available balance, locked/committed jobas and the ledger.
  // Every action that settles an application moves credits, so these are always
  // invalidated together (they are cheap, read-only queries).
  if (includeCredits) {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['myLockedJobas'] });
    queryClient.invalidateQueries({ queryKey: ['creditTxns'] });
  }
}