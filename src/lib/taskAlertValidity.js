/**
 * taskAlertValidity — the ONE definition of "is this full-screen task alert still
 * asking the user for something?".
 *
 * ── THE BUG THIS CLOSES ────────────────────────────────────────────────────
 * An alert is raised at the moment an event arrives and then lives in memory
 * until the user closes it. The device can be backgrounded in between, and a
 * backgrounded app receives no realtime events — so the ONE event that would
 * have closed the sheet (the publisher approving the completion from the Lock
 * Screen) is never seen. Reopening the app therefore showed a completion
 * confirmation for a job that was already closed: "I approved it on the widget
 * and the app still asked me again".
 *
 * The record is the authority, so the question is answered against a fresh read
 * of the Task, not against the state that raised the alert. Only alerts that
 * carry an ACTION can go stale; the historical ones (cancelled, revoked,
 * cancellation confirmed) are news about something that already happened and
 * must still be delivered.
 */
export const ACTION_ALERT_KINDS = ['completion_ready', 'new_applicant', 'approved'];

const TERMINAL = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

/**
 * The task an alert is ABOUT.
 *
 * `new_applicant` nests its payload ({ task, application }) while the others
 * carry the task directly, so the id is read from both shapes in one place
 * instead of in every caller.
 */
export function alertTaskId(alert) {
  const payload = alert?.task;
  if (!payload) return '';
  return payload?.task?.id || payload?.id || '';
}

/**
 * Has the record moved on from what this alert is asking?
 *
 * A `false` answer is never a reason to drop the alert — an alert whose read
 * fails keeps its own guard (CompletionApprovalPopup re-reads before drawing).
 */
export function isAlertResolved(kind, task, meId) {
  if (!ACTION_ALERT_KINDS.includes(kind)) return false;
  if (!task || !meId) return false;

  switch (kind) {
    // The publisher is being asked to approve a completion.
    case 'completion_ready':
      return task.client_id !== meId
        || TERMINAL.includes(task.status)
        || task.worker_status !== 'done';

    // The publisher is being asked to pick an applicant.
    case 'new_applicant':
      return task.client_id !== meId || task.status !== 'OPEN';

    // The worker is being asked to set off.
    case 'approved':
      return task.worker_id !== meId
        || !['TAKEN', 'APPROVED_PENDING_DEPARTURE'].includes(task.status)
        || !!task.on_the_way_at
        || !!task.worker_status;

    default:
      return false;
  }
}