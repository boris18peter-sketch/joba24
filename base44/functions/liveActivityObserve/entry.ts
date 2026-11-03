import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig } from '../../shared/liveActivityConfig.ts';
import { planObservation, retentionCutoffMs, recipientKey, OBSERVED_EVENTS } from '../../shared/liveActivityObserve.ts';
import { requireInternalOperator } from '../../shared/internalAuth.ts';

/**
 * liveActivityObserve — Stage 2's only entry point.
 *
 * ── HOW IT IS REACHED ──────────────────────────────────────────────────────
 * One entity-triggered workflow ("Live Activity Diagnostic Observer") calls it on
 * Task create / update / delete. Workflows are asynchronous, so a task operation
 * never waits for this function and a failure here cannot reach the operation
 * that caused it.
 *
 * ── WHAT IT IS ALLOWED TO DO ───────────────────────────────────────────────
 * Read the stored Task, read categories/settings/tokens, and WRITE DIAGNOSTIC
 * ROWS. That is the whole surface: this file imports no APNs module, no HTTP
 * client and no notification helper, so it cannot push to Apple, cannot touch
 * FCM, and cannot change a task. There is no `mode` parameter that would ever
 * turn it into a sender.
 *
 * ── DIAGNOSTIC SWITCH ──────────────────────────────────────────────────────
 * `diagnostic_events` on the LiveActivityConfig row is a SEPARATE switch from
 * `enabled`. Turning observation on therefore does not arm the send path, and
 * arming the send path later does not start writing observation rows.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // ── WHO MAY TRIGGER AN OBSERVATION ──────────────────────────────────────
    // The workflow invokes this as the platform's own service caller, while a
    // human hitting the URL is a signed-in user. The app's existing rule
    // (shared with Market Maker) allows exactly those two and nothing else — so
    // the workflow's call is accepted, and an ordinary app user is refused.
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const denied = await requireInternalOperator(base44, req, user ?? null);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body?.task_id === 'string' ? body.task_id.trim() : '';
    const eventType = OBSERVED_EVENTS.includes(body?.event_type) ? body.event_type : '';
    if (!taskId || !eventType) {
      return Response.json({ error: 'task_id and event_type are required' }, { status: 400 });
    }

    const now = Date.now();

    // ── 1. The switch, before any other read ────────────────────────────────
    const configPage = await base44.asServiceRole.entities.LiveActivityConfig
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const config = normalizeConfig((configPage?.items || [])[0]);
    if (!config.diagnostic_events) {
      return Response.json({
        ok: true,
        recorded: 0,
        skipped: 'diagnostics_off',
        contactedApns: false,
      });
    }

    // ── 2. Authoritative task (the event payload is never the source) ───────
    const task = await base44.asServiceRole.entities.Task.get(taskId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));

    const hints = {
      task_id: taskId,
      client_id: typeof body?.client_id === 'string' ? body.client_id : '',
      worker_id: typeof body?.worker_id === 'string' ? body.worker_id : '',
      status: typeof body?.status === 'string' ? body.status : '',
    };

    // ── 3. Supporting reads, only what the snapshot needs ───────────────────
    const candidateIds = Array.from(new Set([task?.client_id, task?.worker_id, hints.client_id, hints.worker_id].filter(Boolean))).slice(0, 4);

    const [tokenPage, lastPage, settingsPage] = await Promise.all([
      candidateIds.length
        ? base44.asServiceRole.entities.LiveActivityToken
            .filter({ user_id: { $in: candidateIds } }, { limit: 50 })
            .catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
      base44.asServiceRole.entities.LiveActivityEvent
        .filter({ task_id: taskId }, { sort: '-received_ms', limit: 8 })
        .catch(() => ({ items: [] })),
      base44.asServiceRole.entities.JobaSettings
        .list({ sort: '-updated_date', limit: 1 })
        .catch(() => ({ items: [] })),
    ]);

    // The most recent observation per recipient is the memory that makes
    // duplicate suppression and "close only once" work without touching
    // LiveActivityState. Keyed by user AND role, so a reassigned worker is a new
    // recipient rather than a duplicate of the one they replaced.
    const lastByRecipient = {};
    for (const row of lastPage?.items || []) {
      if (!row?.role || !row?.user_id) continue;
      const key = recipientKey(row.user_id, row.role);
      if (!lastByRecipient[key]) lastByRecipient[key] = row;
    }

    const categories = task?.category ? await loadCategoryChain(base44, task.category) : [];

    // ── 4. Plan, then record ───────────────────────────────────────────────
    const { rows } = planObservation({
      task,
      event: eventType,
      config,
      lastByRecipient,
      categories,
      settings: (settingsPage?.items || [])[0] || {},
      tokens: tokenPage?.items || [],
      hints,
      now,
    });

    const receivedAt = new Date(now).toISOString();
    let recorded = 0;
    for (const row of rows) {
      const created = await base44.asServiceRole.entities.LiveActivityEvent
        .create({ ...row, received_at: receivedAt, received_ms: now })
        .catch(() => null);
      if (created) recorded += 1;
    }

    // ── 5. Retention: keep the diagnostic table bounded ─────────────────────
    let pruned = false;
    if (recorded > 0) {
      pruned = await base44.asServiceRole.entities.LiveActivityEvent
        .deleteMany({ received_ms: { $lt: retentionCutoffMs(config, now) } })
        .then(() => true)
        .catch(() => false);
    }

    return Response.json({
      ok: true,
      event: eventType,
      recorded,
      pruned,
      contactedApns: false,
      sent: 0,
      rows: rows.map((r) => ({
        role: r.role,
        decision: r.decision,
        kind: r.kind,
        phase: r.phase,
        revision: r.revision,
      })),
    });
  } catch (error) {
    // An observer must never fail loudly: the task operation that triggered it
    // has already completed, and nothing here is allowed to look like an error
    // in the app.
    return Response.json({ ok: false, error: error.message, recorded: 0, contactedApns: false });
  }
});

/** The category chain (service → root) the flow resolver reads. */
async function loadCategoryChain(base44, categoryKey) {
  const rows = [];
  let current = categoryKey;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const page = await base44.asServiceRole.entities.GlobalCategory
      .filter({ category_key: current }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const row = (page?.items || [])[0];
    if (!row) break;
    rows.push(row);
    current = row.parent_key || '';
  }
  return rows;
}