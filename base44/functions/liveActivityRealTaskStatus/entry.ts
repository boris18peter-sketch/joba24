import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig, testModeActive, sendGateFor, isTestUser } from '../../shared/liveActivityConfig.ts';

/**
 * liveActivityRealTaskStatus — the diagnostic view for a REAL task.
 *
 * ── WHAT IT ANSWERS, IN THE ORDER THE QUESTION IS ASKED ────────────────────
 *  • Did a real task reach the Live Activity pipeline at all?  → state rows + dispatches
 *  • Did each device register a push token?                   → tokens (with environment)
 *  • Did the device actually START a card?                    → device events ('started')
 *  • Were updates dispatched (and did Apple accept them)?     → dispatches (status/apns_status)
 *  • Did the activity end?                                    → terminal state + 'ended' events
 *
 * ── READ-ONLY, ADMIN-ONLY ──────────────────────────────────────────────────
 * It reads and returns; it never dispatches, never flips a flag and never
 * writes a row. Admin is required because the answer includes other users'
 * token presence and delivery history — nothing secret (no token values, no
 * secrets) but still operator-only.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    if (!taskId) return Response.json({ error: 'task_id is required' }, { status: 400 });

    const configPage = await base44.asServiceRole.entities.LiveActivityConfig
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const config = normalizeConfig((configPage?.items || [])[0]);

    const task = await base44.asServiceRole.entities.Task.get(taskId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));

    const [statePage, dispatchPage, devicePage] = await Promise.all([
      base44.asServiceRole.entities.LiveActivityState
        .filter({ task_id: taskId }, { limit: 10 })
        .catch(() => ({ items: [] })),
      base44.asServiceRole.entities.LiveActivityDispatch
        .filter({ task_id: taskId }, { sort: '-dispatched_at', limit: 20 })
        .catch(() => ({ items: [] })),
      base44.asServiceRole.entities.LiveActivityDeviceEvent
        .filter({ task_id: taskId }, { sort: '-received_ms', limit: 20 })
        .catch(() => ({ items: [] })),
    ]);

    const states = statePage?.items || [];
    const dispatches = dispatchPage?.items || [];
    const deviceEvents = devicePage?.items || [];

    // Only the two participants are looked up — never a task's whole audience.
    const participantIds = Array.from(new Set([task?.client_id, task?.worker_id, ...states.map((s) => s.user_id)].filter(Boolean)));
    const tokenPage = participantIds.length
      ? await base44.asServiceRole.entities.LiveActivityToken
          .filter({ user_id: { $in: participantIds } }, { limit: 50 })
          .catch(() => ({ items: [] }))
      : { items: [] };

    const roles = [
      { role: 'publisher', userId: task?.client_id },
      { role: 'worker', userId: task?.worker_id },
    ].filter((r) => r.userId);

    const recipients = roles.map(({ role, userId }) => {
      const tokens = (tokenPage?.items || []).filter((t) => t.user_id === userId);
      const state = states.find((s) => s.user_id === userId && s.role === role) || null;
      const sends = dispatches.filter((d) => d.user_id === userId && d.role === role);
      const events = deviceEvents.filter((e) => e.user_id === userId && e.role === role);
      return {
        role,
        user_id: userId,
        allowlisted: isTestUser(config, userId),
        gate: sendGateFor(config, userId),
        tokens: {
          total: tokens.length,
          active: tokens.filter((t) => t.status === 'active').length,
          environments: Array.from(new Set(tokens.map((t) => t.environment).filter(Boolean))),
          timezones: Array.from(new Set(tokens.map((t) => t.timezone).filter(Boolean))),
          last_seen_at: tokens.map((t) => t.last_seen_at).filter(Boolean).sort().pop() || null,
        },
        state: state ? {
          revision: state.revision,
          phase: state.phase || '',
          task_status: state.task_status || '',
          terminal: state.terminal === true,
          terminal_at: state.terminal_at || null,
          last_decision: state.last_decision || '',
          last_event_at: state.last_event_at || null,
          last_pushed_at: state.last_pushed_at || null,
        } : null,
        device: events.slice(0, 6).map((e) => ({
          event: e.event,
          reason: e.reason || '',
          revision: e.revision ?? null,
          phase: e.phase || '',
          at: e.occurred_at || null,
        })),
        dispatches: sends.slice(0, 8).map((d) => ({
          event: d.event,
          status: d.status,
          decision: d.decision || '',
          reason: d.reason || '',
          revision: d.revision ?? null,
          apns_status: d.apns_status ?? null,
          at: d.dispatched_at || null,
        })),
      };
    });

    return Response.json({
      ok: true,
      config: {
        enabled: config.enabled,
        dry_run: config.dry_run,
        test_mode: testModeActive(config),
        test_apns: config.test_apns === true,
        test_users: (config.test_user_ids || []).length,
        environment: config.environment,
      },
      task: task ? {
        id: task.id,
        status: task.status,
        worker_status: task.worker_status || '',
        category: task.category || '',
        updated_date: task.updated_date || null,
        has_worker: Boolean(task.worker_id),
      } : null,
      recipients,
      totals: {
        states: states.length,
        dispatches: dispatches.length,
        sent: dispatches.filter((d) => d.status === 'sent').length,
        dry_run: dispatches.filter((d) => d.status === 'dry_run').length,
        failed: dispatches.filter((d) => d.status === 'failed').length,
        device_events: deviceEvents.length,
        started: deviceEvents.filter((e) => e.event === 'started').length,
        ended: deviceEvents.filter((e) => e.event === 'ended').length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}