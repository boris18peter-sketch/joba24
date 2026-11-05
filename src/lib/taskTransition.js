import { base44 } from '@/api/base44Client';

/**
 * dispatchTaskTransition — ask the server to run a transition's Live Activity
 * update and stage notification NOW, instead of waiting for the workflow engine.
 *
 * ── AWAITED, NOT FIRE-AND-FORGET ───────────────────────────────────────────
 * The caller awaits this and may look at its answer. It never throws: a
 * transition that has already been written must not be reported as failed just
 * because the accelerator could not reach the server — the durable workflow
 * still carries the same event and will complete the work. Returning `null` is
 * that case, and it is visible to the caller rather than swallowed silently.
 *
 * ── NO SECOND SOURCE OF TRUTH ──────────────────────────────────────────────
 * Only the task id and the stage it replaced are sent. The server re-reads the
 * record, re-checks that the caller is on the task, and runs the SAME planner
 * and the SAME notification function the workflow uses — so a duplicate is
 * refused rather than deduplicated by hand here.
 *
 * @param {string|{id: string}} taskOrId
 * @param {string} [previousWorkerStatus] the stage the caller replaced
 */
export async function dispatchTaskTransition(taskOrId, previousWorkerStatus = '') {
  const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId?.id;
  if (!taskId) return null;

  try {
    const response = await base44.functions.invoke('taskTransitionDispatch', {
      task_id: taskId,
      previous_worker_status: previousWorkerStatus || '',
    });
    return response?.data || null;
  } catch {
    // The workflow is the durable path; this is only the accelerator.
    return null;
  }
}