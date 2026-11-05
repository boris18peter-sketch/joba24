import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig, isTrackedRecipient, isRoleTracked } from '../../shared/liveActivityConfig.ts';
import { TERMINAL_TASK_STATUSES } from '../../shared/liveActivityDispatch.ts';
import { dispatchRecipient, loadCategoryChain } from '../../shared/liveActivitySend.ts';

/**
 * taskTransitionDispatch — the FAST LANE for a task transition.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * A Task write reaches the app's workflows immediately (0.15–0.35 s), but the
 * workflow ENGINE only hands the event to the backend function 30–84 seconds
 * later under a burst. Measured on this app: the dispatch function answers in
 * 677 ms while the single-step workflow run carrying it took 82.9 s. That delay
 * is platform-side and has no documented bound, so it cannot be tuned away from
 * application code — and a function-level entity automation cannot replace it,
 * because automations cannot be deployed in an app that uses workflows.
 *
 * The durable chain therefore stays exactly as it is (entity event → workflow →
 * liveActivityTaskEvent / notifyTaskWorkerStatusChange). This function is the
 * SECOND, immediate path: the participant who performed the transition asks for
 * the same work to be done now, and AWAITS the answer. It is not fire-and-forget
 * — the caller gets a result it can act on — and it is not a second source of
 * truth: it reuses the SAME shared planner and the SAME notification function,
 * so both paths produce identical outcomes.
 *
 * ── WHY BOTH PATHS CAN COEXIST ─────────────────────────────────────────────
 * Duplicates are impossible, not merely unlikely:
 *   • Live Activity — the shared sender claims the next revision per
 *     (user, task, role) and writes `content_key`; the workflow's late run finds
 *     the revision already committed and records `duplicate`, sending nothing.
 *   • Notifications — notifyTaskWorkerStatusChange compares the event's stage
 *     with the stored record and refuses a stage the record has already passed,
 *     and notificationManager applies its own cooldown per (user, event).
 * So the fast lane can be early without the safety net ever double-sending.
 *
 * ── AUTHORIZATION ──────────────────────────────────────────────────────────
 * The caller must be one of the two people on the task. Nothing is taken from
 * the request except the id: the record is read server-side and IS the truth, so
 * a caller cannot describe a status it does not have.
 */
export default async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    if (!taskId) return Response.json({ error: 'task_id is required' }, { status: 400 });

    // ── The record is the authority ────────────────────────────────────────
    const task = await base44.asServiceRole.entities.Task.get(taskId).catch(() => null);
    if (!task) return Response.json({ error: 'task_not_found' }, { status: 404 });
    if (task.client_id !== user.id && task.worker_id !== user.id) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    // The stage the caller replaced, so the notification path can tell a real
    // change from a repeated call. Absent is fine — the record still decides.
    const previousWorkerStatus = typeof body?.previous_worker_status === 'string'
      ? body.previous_worker_status
      : '';

    // ── 1. Live Activity — through the one shared sender ───────────────────
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
      const targets = candidates.filter(({ userId, role }) => (
        isTrackedRecipient(config, userId) && (terminal || isRoleTracked(config, task.status, role))
      ));

      if (!targets.length) {
        liveActivitySkipped = 'no_tracked_recipients';
      } else {
        liveActivitySkipped = '';
        // Read once per event, exactly as the workflow path does.
        const [categories, settingsPage] = await Promise.all([
          task.category
            ? loadCategoryChain(base44, task.category, task.parent_category_key || '')
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

    // ── 2. The stage notification — through the one gated sender ───────────
    // Only a notifiable worker status produces one; approval and completion have
    // their own workflows and their own notification functions, so this path
    // never invents a notification they do not already own.
    let notification = null;
    const stage = task.worker_status || '';
    // OPT-IN ONLY. Approval and completion have their own notification
    // workflows; running this branch for them sent a "worker is on the way /
    // done" push for a stage nobody had just changed (proven by a live test of
    // this function against a completed task). Only a caller that actually moved
    // a worker stage asks for the notification, and it always sends the stage it
    // replaced — so an unchanged stage is refused twice over.
    if (body?.notify_stage === true
      && ['on_the_way', 'arrived', 'done'].includes(stage)
      && stage !== previousWorkerStatus
      && task.client_id) {
      notification = await base44.asServiceRole.functions.invoke('notifyTaskWorkerStatusChange', {
        // The same payload shape the workflow builds, so the function's own
        // stage guard runs on the current record — not on a stale snapshot.
        data: { ...task, worker_status: stage },
        event: { entity_id: task.id, type: 'update' },
        old_data: { worker_status: previousWorkerStatus },
      }).then((r) => r?.data || null).catch((error) => ({ error: error?.message || 'notify_failed' }));
    }

    return Response.json({
      ok: true,
      task_status: task.status,
      worker_status: stage,
      terminal,
      live_activity: liveActivity,
      live_activity_skipped: liveActivitySkipped || null,
      notification,
    });
  } catch (error) {
    // The task transition itself already succeeded; this path is an accelerator.
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
}