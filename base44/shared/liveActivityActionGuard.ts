/**
 * liveActivityActionGuard — the execution rules for a Lock Screen action.
 *
 * ── THIS IS NOT A SECOND WORKFLOW ─────────────────────────────────────────
 * It authorizes, then hands over to the existing authoritative operation:
 *
 *   worker_step        → the exact three field writes ActiveTaskBanner performs
 *                        (`worker_status` + its own timestamp), on the task the
 *                        caller already owns. Notifications and downstream
 *                        behaviour come from the existing entity-triggered
 *                        workflows, exactly as they do for an in-app tap.
 *   publisher_approve  → `completeTaskCore`, which IS `completeTask`: worker
 *                        counter, pending-application refunds, credit ledger,
 *                        applicant projection and its idempotency guard.
 *
 * No task rule, payment rule or notification is reimplemented here.
 *
 * ── THE STATE MACHINE ─────────────────────────────────────────────────────
 * The worker may only move FORWARD along the canonical order
 * (none → on_the_way → arrived → done). A repeated tap, an out-of-order request
 * and a request against a task that is no longer TAKEN are all refused by name,
 * so the intent can report the truth and never double-writes.
 */

import { CANONICAL_STEPS } from './liveActivityFlow.ts';

/** The only ids a token may carry. Stable forever — labels are display only. */
export const ACTION_IDS = ['worker_step', 'publisher_approve', 'publisher_assign'];

/** Which action ids a role may ever perform on a task. */
export function actionsForRole(role: string): string[] {
  if (role === 'worker') return ['worker_step'];
  if (role === 'publisher') return ['publisher_approve', 'publisher_assign'];
  return [];
}

/**
 * Is assigning an applicant legal right now — and is the choice UNAMBIGUOUS?
 *
 * ── WHY THIS EXISTS AT ALL ─────────────────────────────────────────────────
 * A Lock Screen card cannot hold a list, so it can only offer a choice that
 * needs no choosing. This guard is what makes that honest: it approves nothing
 * unless the database currently holds EXACTLY ONE pending application, and that
 * application belongs to the worker it names.
 *
 * It re-reads the applications instead of trusting the card (or the task's
 * `applicants` projection, which is only rebuilt on certain writes). If a second
 * worker applied while the card was on screen, the count is 2 and the tap is
 * refused with `selection_ambiguous` — nothing is guessed, and the refreshed
 * snapshot has no action, so the button disappears rather than inviting a second
 * tap. The publisher then picks in the app, where the choice can be shown.
 */
export function guardPublisherAssign(input: {
  task: any;
  userId: string;
  applications: any[];
}):
  | { ok: true; applicationId: string; workerId: string }
  | { ok: false; reason: string; status: number; detail?: any } {
  const { task, userId, applications } = input || ({} as any);
  if (!task) return { ok: false, reason: 'task_missing', status: 404 };
  if (task.client_id !== userId) return { ok: false, reason: 'not_owner', status: 403 };
  if (task.status === 'TAKEN') {
    return { ok: false, reason: 'already_assigned', status: 409, detail: { task_status: task.status } };
  }
  if (task.status !== 'OPEN') {
    return { ok: false, reason: 'task_not_active', status: 409, detail: { task_status: task.status } };
  }

  const pending = (Array.isArray(applications) ? applications : [])
    .filter((a) => a?.status === 'pending');
  if (pending.length === 0) return { ok: false, reason: 'no_applicants', status: 409 };
  if (pending.length > 1) {
    return { ok: false, reason: 'selection_ambiguous', status: 409, detail: { pending: pending.length } };
  }

  const app = pending[0];
  if (!app?.id || !app?.worker_id) {
    return { ok: false, reason: 'application_incomplete', status: 409 };
  }
  return { ok: true, applicationId: app.id, workerId: app.worker_id };
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string; status: number; detail?: any };

/**
 * Is this worker step a legal move right now?
 *
 * `expectedStep` is the step the DEVICE believed it was submitting. It is checked
 * so a tap that was queued while the task moved on cannot apply an older
 * transition — the intent gets `stale_step` and re-reads the truth.
 */
export function guardWorkerStep(input: {
  task: any;
  userId: string;
  step: string;
  expectedStep?: string;
}): GuardResult {
  const { task, userId, step, expectedStep } = input || ({} as any);

  if (!task) return { ok: false, reason: 'task_missing', status: 404 };
  if (task.worker_id !== userId) return { ok: false, reason: 'not_assigned', status: 403 };
  if (task.status !== 'TAKEN') {
    // COMPLETED / CANCELLED / EXPIRED are terminal; a legacy live status is not
    // something a Lock Screen button ever targets.
    return { ok: false, reason: 'task_not_active', status: 409, detail: { task_status: task.status } };
  }
  if (!CANONICAL_STEPS.includes(step)) return { ok: false, reason: 'invalid_step', status: 400 };

  if (expectedStep && expectedStep !== step) {
    return { ok: false, reason: 'stale_step', status: 409, detail: { current_step: step } };
  }

  const currentIdx = CANONICAL_STEPS.indexOf(task.worker_status);
  const targetIdx = CANONICAL_STEPS.indexOf(step);

  // Same step again: the tap already landed (or another device sent it). Not an
  // error — a duplicate that must not write, notify or move anything twice.
  if (currentIdx === targetIdx) {
    return { ok: false, reason: 'duplicate', status: 200, detail: { worker_status: task.worker_status } };
  }
  if (targetIdx < currentIdx) {
    return { ok: false, reason: 'stale_step', status: 409, detail: { worker_status: task.worker_status } };
  }
  // Skipping a step is not a transition the app ever performs.
  if (targetIdx !== currentIdx + 1) {
    return { ok: false, reason: 'step_out_of_order', status: 409, detail: { worker_status: task.worker_status } };
  }

  return { ok: true };
}

/** Is publisher approval legal right now? Final eligibility is completeTask's own. */
export function guardPublisherApproval(input: { task: any; userId: string }): GuardResult {
  const { task, userId } = input || ({} as any);
  if (!task) return { ok: false, reason: 'task_missing', status: 404 };
  if (task.client_id !== userId) return { ok: false, reason: 'not_owner', status: 403 };
  if (task.status === 'COMPLETED') {
    return { ok: false, reason: 'already_completed', status: 200, detail: { task_status: task.status } };
  }
  if (task.status !== 'TAKEN') {
    return { ok: false, reason: 'task_not_active', status: 409, detail: { task_status: task.status } };
  }
  // The button exists only once the worker reported the work finished — the same
  // gate ActiveTaskBanner uses (`tIsOwner && task.worker_status === 'done'`).
  if (task.worker_status !== 'done') {
    return { ok: false, reason: 'worker_not_done', status: 409, detail: { worker_status: task.worker_status || null } };
  }
  return { ok: true };
}

/**
 * The field write ActiveTaskBanner performs for a worker step — reproduced
 * exactly, including the "only set the timestamp once" rule. Geolocation is the
 * one thing a Lock Screen tap cannot supply; the coordinates a previous in-app
 * action recorded are left untouched.
 */
export function workerStepPatch(task: any, step: string, now = new Date()): Record<string, any> {
  const patch: Record<string, any> = { worker_status: step };
  const iso = now.toISOString();
  if (step === 'on_the_way' && !task?.on_the_way_at) patch.on_the_way_at = iso;
  else if (step === 'arrived' && !task?.arrived_at) patch.arrived_at = iso;
  else if (step === 'done') patch.completed_at = iso;
  return patch;
}