import { normalizeConfig, isTrackedRecipient, isRoleTracked } from './liveActivityConfig.ts';
import { TERMINAL_TASK_STATUSES } from './liveActivityDispatch.ts';
import { dispatchRecipient, loadCategoryChain } from './liveActivitySend.ts';

/**
 * taskTransitionFastLane — the ONE implementation of the immediate transition
 * path, shared by every caller that can perform a transition.
 *
 * ── WHY IT IS SHARED, NOT COPIED ───────────────────────────────────────────
 * A transition can be performed from two places: a React button handler (which
 * calls the user-facing `taskTransitionDispatch` function) and the Lock Screen
 * itself (Apple's App Intent → `liveActivityAction`, with no WebView and no
 * session). Both must produce the same Live Activity update and the same stage
 * notification, so both call this module — there is no second copy to drift.
 *
 * ── IT DOES NOT AUTHORIZE ──────────────────────────────────────────────────
 * Authorization belongs to the entry point, which is the only place that knows
 * who is calling: `taskTransitionDispatch` checks the session, `liveActivityAction`
 * checks its capability token and then runs the real authoritative operation.
 * This module is handed a task that has ALREADY been read from the database.
 *
 * ── IT CANNOT START A FINISHED TASK ────────────────────────────────────────
 * A terminal task is passed through unchanged to the shared sender, whose
 * planner returns `end` for it before any snapshot work (see the `terminalTask`
 * branch in liveActivitySend.ts, and planLiveActivityDispatch's first rule). The
 * payload is therefore chosen as `end`, never `start`, for a completed task.
 */
export const NOTIFIABLE_STAGES = ['on_the_way', 'arrived', 'done'];

export async function runTaskTransition({ base44, task, previousWorkerStatus = '', notifyStage = false }) {
  if (!task?.id) return { ok: false, error: 'task_missing' };

  // ── 1. Live Activity — through the one shared sender ────────────────────
  const configPage = await base44.asServiceRole.entities.LiveActivityConfig
    .list({ sort: '-updated_date', limit: 1 })
    .catch(() => ({ items: [] }));
  const config = normalizeConfig((configPage?.items || [])[0]);

  const terminal = TERMINAL_TASK_STATUSES.includes(task.status);
  let liveActivity = [];
  let liveActivitySkipped = 'disabled';

  if (config.enabled === true || (Array.isArray(config.test_user_ids) && config.test_user_ids.length > 0)) {
    const candidates = [];
    if (task.client_id) candidates.push({ userId: task.client_id, role: 'publisher' });
    if (task.worker_id) candidates.push({ userId: task.worker_id, role: 'worker' });

    // A finished task closes for both sides regardless of the tracking toggles:
    // a stale card outlives the work, and closing it is not an "update".
    const targets = candidates.filter(({ userId, role }) => (
      isTrackedRecipient(config, userId) && (terminal || isRoleTracked(config, task.status, role))
    ));

    if (!targets.length) {
      liveActivitySkipped = 'no_tracked_recipients';
    } else {
      liveActivitySkipped = '';
      // Read once per transition, not once per recipient.
      const [categories, settingsPage] = await Promise.all([
        // Nothing here may throw: this module is reached from a Lock Screen tap
        // that has ALREADY committed the task transition, so an exception would
        // turn a successful approval into a reported failure.
        task.category
          ? loadCategoryChain(base44, task.category, task.parent_category_key || '').catch(() => [])
          : Promise.resolve([]),
        base44.asServiceRole.entities.JobaSettings.list({ sort: '-updated_date', limit: 1 })
          .catch(() => ({ items: [] })),
      ]);
      const settings = (settingsPage?.items || [])[0] || null;

      liveActivity = await Promise.all(targets.map(async ({ userId, role }) => {
        const outcome = await dispatchRecipient({
          base44,
          config,
          task,
          role,
          recipientId: userId,
          mode: 'dispatch',
          categories,
          settings,
        }).catch((error) => ({ decision: 'error', reason: error?.message || 'dispatch_failed' }));
        return {
          role,
          decision: outcome.decision || 'none',
          kind: outcome.kind || 'none',
          revision: outcome.revision || 0,
          sent: outcome.sent || 0,
          contactedApns: outcome.contactedApns === true,
          reason: outcome.reason || null,
        };
      }));
    }
  }

  // ── 2. The stage notification — OPT-IN ──────────────────────────────────
  // Approval and completion own their own notifications, so only a caller that
  // actually moved a worker stage asks for this one, and it always reports the
  // stage it replaced. notifyTaskWorkerStatusChange then refuses it a second
  // time if that (task, stage) has already been sent.
  let notification = null;
  const stage = task.worker_status || '';
  if (notifyStage === true
    && NOTIFIABLE_STAGES.includes(stage)
    && stage !== previousWorkerStatus
    && task.client_id) {
    notification = await base44.asServiceRole.functions.invoke('notifyTaskWorkerStatusChange', {
      // The same payload shape the workflow builds, so the function's own
      // record-based guard runs against the current task.
      data: { ...task, worker_status: stage },
      event: { entity_id: task.id, type: 'update' },
      old_data: { worker_status: previousWorkerStatus },
    }).then((r) => r?.data || null).catch((error) => ({ error: error?.message || 'notify_failed' }));
  }

  return {
    ok: true,
    task_status: task.status,
    worker_status: stage,
    terminal,
    live_activity: liveActivity,
    live_activity_skipped: liveActivitySkipped || null,
    notification,
  };
}