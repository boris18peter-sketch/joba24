import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig } from '../../shared/liveActivityConfig.ts';
import { buildBackendSnapshot } from '../../shared/liveActivitySnapshot.ts';
import { planLiveActivityDispatch, nextRevision } from '../../shared/liveActivityDispatch.ts';
import { pickTrackedTask } from '../../shared/taskActivitySnapshot.ts';

/**
 * liveActivityReconcile — the DRY, read-only reconciliation pass.
 *
 * ── WHAT IT IS FOR ─────────────────────────────────────────────────────────
 * A push can be lost (device offline, APNs hiccup, app killed mid-update). The
 * Live Activity is then showing an older revision than the database. Rather than
 * polling on a timer, reconciliation answers one question on demand: for every
 * recipient with an active token, what WOULD the Lock Screen show right now, and
 * does the stored revision agree?
 *
 * It is deliberately read-only: no dispatch, no state write, no token change, no
 * APNs call. Whatever it reports is a plan an operator (or the Stage 2 workflow)
 * can act on through liveActivityDispatch.
 *
 * ── NO POLLING ─────────────────────────────────────────────────────────────
 * Nothing schedules this. It is an admin endpoint and, in Stage 2, may be called
 * by a workflow on a wide interval purely as a safety net — never per task
 * mutation, and never on a short timer.
 */
const TRACKABLE_STATUSES = ['OPEN', 'TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 50);

    const configPage = await base44.asServiceRole.entities.LiveActivityConfig
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const config = normalizeConfig((configPage?.items || [])[0]);

    if (!config.enabled) {
      return Response.json({
        enabled: false,
        decision: 'disabled',
        contactedApns: false,
        note: 'Live Activities are disabled. Reconciliation is a no-op.',
      });
    }

    const tokenPage = await base44.asServiceRole.entities.LiveActivityToken
      .filter({ status: 'active' }, { limit: 200 })
      .catch(() => ({ items: [] }));

    const userIds = [];
    for (const row of tokenPage?.items || []) {
      if (row?.user_id && !userIds.includes(row.user_id)) userIds.push(row.user_id);
      if (userIds.length >= limit) break;
    }

    const settingsPage = await base44.asServiceRole.entities.JobaSettings
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const settings = (settingsPage?.items || [])[0] || {};
    const categoryPage = await base44.asServiceRole.entities.GlobalCategory
      .filter({ active: true }, { limit: 500 })
      .catch(() => ({ items: [] }));
    const categories = categoryPage?.items || [];

    const plans = [];

    for (const userId of userIds) {
      const taskPage = await base44.asServiceRole.entities.Task
        .filter(
          { status: { $in: TRACKABLE_STATUSES }, $or: [{ client_id: userId }, { worker_id: userId }] },
          { sort: '-updated_date', limit: 15 },
        )
        .catch(() => ({ items: [] }));

      const picked = pickTrackedTask(taskPage?.items || [], userId);
      if (!picked) {
        plans.push({ user_id: userId, decision: 'no_trackable_task' });
        continue;
      }

      const statePage = await base44.asServiceRole.entities.LiveActivityState
        .filter({ user_id: userId, task_id: picked.task.id, role: picked.role }, { limit: 1 })
        .catch(() => ({ items: [] }));
      const state = (statePage?.items || [])[0] || null;

      const snapshot = buildBackendSnapshot({
        task: picked.task,
        role: picked.role,
        userId,
        categories,
        settings,
        timeZone: undefined,
        revision: nextRevision(state),
      });

      const plan = planLiveActivityDispatch({
        task: picked.task,
        role: picked.role,
        userId,
        config,
        state,
        snapshot,
      });

      plans.push({
        user_id: userId,
        task_id: picked.task.id,
        role: picked.role,
        task_status: picked.task.status,
        stored_revision: state?.revision || 0,
        next_revision: plan.revision || null,
        decision: plan.decision,
        phase: snapshot?.phase || null,
        title: snapshot?.title || null,
      });
    }

    return Response.json({
      enabled: true,
      dry_run: config.dry_run,
      contactedApns: false,
      wrote: false,
      recipients_checked: plans.length,
      updates_planned: plans.filter((p) => p.decision === 'send' || p.decision === 'terminal').length,
      plans,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});