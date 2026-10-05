/**
 * Review classification — the SINGLE source of truth for "which role did the
 * profile owner hold when they received this review".
 *
 * Joba24 users act as both client and worker, so a review is only meaningful
 * with its context. The type is derived EXCLUSIVELY from the real Task
 * relationships:
 *
 *   • the reviewer was the task's CLIENT and the profile owner was its WORKER
 *       → ABOUT_WORKER  (a review the owner received as the doer of the work)
 *   • the reviewer was the task's WORKER and the profile owner was its CLIENT
 *       → ABOUT_CLIENT  (a review the owner received as the poster)
 *
 * The review's own `role` field stores the REVIEWER's role, and is used only as
 * a fallback for legacy rows whose task can no longer be resolved. The review
 * TEXT is never used to infer the type — it cannot determine it reliably.
 *
 * Both the reviews section and the history view consume this module, so a
 * review can never be classified two different ways in two places.
 */

export const REVIEW_ABOUT_WORKER = 'about_worker';
export const REVIEW_ABOUT_CLIENT = 'about_client';

/** Index a user's tasks by the role that user held in each one. */
export function buildTaskRoleIndex(tasks = [], profileUserId) {
  const workerTaskIds = new Set();
  const clientTaskIds = new Set();
  tasks.forEach((task) => {
    if (!task?.id || !profileUserId) return;
    if (task.worker_id === profileUserId) workerTaskIds.add(task.id);
    if (task.client_id === profileUserId) clientTaskIds.add(task.id);
  });
  return { workerTaskIds, clientTaskIds };
}

/** Classify ONE review for the given profile owner. */
export function classifyReview(review, profileUserId, index = {}) {
  const { workerTaskIds, clientTaskIds } = index;
  if (review?.task_id) {
    if (workerTaskIds?.has(review.task_id)) return REVIEW_ABOUT_WORKER;
    if (clientTaskIds?.has(review.task_id)) return REVIEW_ABOUT_CLIENT;
  }
  // Legacy fallback — `role` is the reviewer's role in that task.
  if (review?.role === 'client') return REVIEW_ABOUT_WORKER;
  if (review?.role === 'worker') return REVIEW_ABOUT_CLIENT;
  return null;
}

/** Split a review list into the two received-as roles. */
export function classifyReviews(reviews = [], profileUserId, tasks = []) {
  const index = buildTaskRoleIndex(tasks, profileUserId);
  const aboutWorker = [];
  const aboutClient = [];
  const unknown = [];
  reviews.forEach((r) => {
    const kind = classifyReview(r, profileUserId, index);
    if (kind === REVIEW_ABOUT_WORKER) aboutWorker.push(r);
    else if (kind === REVIEW_ABOUT_CLIENT) aboutClient.push(r);
    else unknown.push(r);
  });
  return { aboutWorker, aboutClient, unknown };
}

/**
 * The person who WROTE the review, taken from the task relationship (the
 * Review entity stores only `reviewer_id`). Returns null when the task can no
 * longer be resolved — we never guess a name.
 */
export function reviewerNameFromTask(review, task, kind) {
  if (!task) return null;
  if (kind === REVIEW_ABOUT_WORKER) return task.client_name || null;
  if (kind === REVIEW_ABOUT_CLIENT) return task.worker_name || null;
  return null;
}