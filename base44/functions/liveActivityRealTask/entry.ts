import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig, isTestUser, testModeActive, sendGateFor } from '../../shared/liveActivityConfig.ts';
import { beginRecipientState, syncRecipientState, closeRecipientState } from '../../shared/liveActivitySend.ts';

/**
 * liveActivityRealTask — the DEVICE half of the real-task Live Activity.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The server can push an UPDATE to a running Live Activity, but it can never
 * START one: ActivityKit activities are created by the app on the device. So
 * when a REAL task becomes active, the device starts the activity and needs
 * three things this function provides:
 *
 *   begin → the revision to start with (the server owns that sequence)
 *   sync  → a revision for an update the device applies itself (dry-run, or to
 *           reflect an action instantly instead of waiting for a push)
 *   end   → the state marked terminal, so a late duplicate cannot push a second
 *           "end" for work already off the Lock Screen
 *   report→ what the device actually did, so the diagnostic view is evidence
 *           instead of an intention
 *
 * ── THE TWO LOCKS, IN ORDER ────────────────────────────────────────────────
 *  1. The caller must be signed in.
 *  2. The caller must be on `test_user_ids`. An empty allowlist means nobody,
 *     so the shipped configuration refuses every call here.
 * Then the TASK record (read as service role, the authority) decides the role:
 * the publisher is `client_id`, the worker is `worker_id`. A uid in the body is
 * never trusted; the identity is always the session.
 *
 * Nothing in this file writes a Task, a credit, a payment or a notification.
 */
const ROLES = ['publisher', 'worker'];
const DEVICE_EVENTS = [
  'started', 'updated', 'ended', 'start_failed', 'update_failed', 'end_failed',
  // What the LOCK SCREEN tap did. The App Intent has no session, so it records
  // its stages in the shared App Group and the app forwards them here with its
  // own authorized call. Without these a tap that did nothing left no evidence
  // anywhere — which is exactly how a dead button went unnoticed.
  'action_applied', 'action_failed',
];
const ACTIONS = ['access', 'begin', 'sync', 'end', 'report'];

const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = ACTIONS.includes(body?.action) ? body.action : '';

    // ── Configuration first: a missing row is "off", never "on" ─────────────
    const configPage = await base44.asServiceRole.entities.LiveActivityConfig
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const config = normalizeConfig((configPage?.items || [])[0]);

    // ── ACCESS: the one answer every device needs at launch ─────────────────
    // Only ever about the CALLER. It reveals no id, no allowlist and no task.
    if (action === 'access') {
      const allowed = isTestUser(config, user.id);
      return Response.json({
        allowed,
        test_mode: testModeActive(config),
        gate: sendGateFor(config, user.id),
        environment: config.environment,
      });
    }

    if (!action) return Response.json({ error: 'unknown_action' }, { status: 400 });

    // ── EVERY OTHER ACTION IS ALLOWLIST-ONLY ────────────────────────────────
    if (!isTestUser(config, user.id)) {
      return Response.json({ error: 'not_allowlisted', test_mode: testModeActive(config) }, { status: 403 });
    }

    const taskId = clip(body?.task_id, 200);
    const role = ROLES.includes(body?.role) ? body.role : '';
    if (!taskId) return Response.json({ error: 'task_id_required' }, { status: 400 });

    const task = await base44.asServiceRole.entities.Task.get(taskId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!task) return Response.json({ error: 'task_not_found' }, { status: 404 });

    if (action === 'report') {
      return respondToReport(base44, { user, task, role, body });
    }

    if (!role) return Response.json({ error: 'invalid_role' }, { status: 400 });

    if (action === 'begin' || action === 'sync') {
      const result = action === 'begin'
        ? await beginRecipientState(base44, { task, role, recipientId: user.id })
        : await syncRecipientState(base44, { task, role, recipientId: user.id });
      if (!result.ok) {
        return Response.json({ error: result.decision, detail: result.reason || null }, { status: 403 });
      }
      return Response.json({
        ok: true,
        action,
        revision: result.revision,
        // What the REAL configuration allows for THIS user — shown in the
        // in-app diagnostic, never used to decide anything here.
        gate: sendGateFor(config, user.id),
        test_apns: config.test_apns === true,
      });
    }

    // action === 'end'
    const closed = await closeRecipientState(base44, { task, role, recipientId: user.id });
    if (!closed.ok) return Response.json({ error: closed.decision }, { status: 403 });
    return Response.json({ ok: true, action, revision: closed.revision, decision: closed.decision });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * The device's own account of what it did.
 *
 * This is the ONLY evidence that an activity was ever created on a phone: the
 * server never starts one, and a push that no activity is listening for is
 * acknowledged by Apple and dropped. Authorized against the stored record, so a
 * stranger cannot write a row about somebody else's task.
 */
async function respondToReport(base44, { user, task, role, body }) {
  if (!ROLES.includes(role)) return Response.json({ error: 'invalid_role' }, { status: 400 });
  const event = DEVICE_EVENTS.includes(body?.event) ? body.event : '';
  if (!event) return Response.json({ error: 'invalid_event' }, { status: 400 });

  const owns = role === 'worker' ? task.worker_id === user.id : task.client_id === user.id;
  if (!owns) return Response.json({ error: 'not_participant' }, { status: 403 });

  const now = Date.now();
  const created = await base44.asServiceRole.entities.LiveActivityDeviceEvent.create({
    task_id: task.id,
    user_id: user.id,
    role,
    event,
    reason: clip(body?.reason, 120),
    activity_id: clip(body?.activity_id, 200),
    revision: Number.isFinite(Number(body?.revision)) ? Math.max(0, Math.floor(Number(body.revision))) : null,
    phase: clip(body?.phase, 40),
    app_version: clip(body?.app_version, 40),
    platform: 'ios',
    occurred_at: new Date(now).toISOString(),
    received_ms: now,
  }).catch(() => null);

  return Response.json({ ok: Boolean(created), event });
}