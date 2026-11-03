import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizeConfig } from '../../shared/liveActivityConfig.ts';
import { requireInternalOperator } from '../../shared/internalAuth.ts';
import {
  PRESENTATION_VERSION,
  detectContentChanges,
  fingerprintCategories,
  affectedCategoryKeys,
  isDue,
  nextVersionState,
  MAX_CONTENT_REFRESH_ATTEMPTS,
} from '../../shared/liveActivityContent.ts';
import { dispatchRecipient } from '../../shared/liveActivitySend.ts';
import { pickTrackedTask } from '../../shared/taskActivitySnapshot.ts';

/**
 * liveActivityContentRefresh — re-word running Live Activities when the CONTENT
 * a card is made of changes.
 *
 * ── THE PROBLEM IT SOLVES ──────────────────────────────────────────────────
 * Every visible string comes from a GlobalCategory row. Editing one (renaming a
 * step, re-wording a button) changes nothing on the Task, so the revision a
 * dispatch carries does not move, and a revision-driven pipeline never notices.
 * This function watches the CONTENT instead: it fingerprints each category's
 * resolved presentation, and when a fingerprint changes it refreshes the cards
 * of the tasks in that category — parent and inherited children alike.
 *
 * ── WHAT IT MAY TOUCH ──────────────────────────────────────────────────────
 * Task: READ ONLY (loaded to build a snapshot; no update, create or delete
 * anywhere in this file). Writes go to LiveActivityContentVersion (its own
 * bookkeeping), and through the shared sender to LiveActivityState,
 * LiveActivityDispatch and — only for a token Apple rejected — LiveActivityToken.
 * Payments, credits, authentication and FCM are not referenced at all.
 *
 * ── BOUNDED BY DESIGN ──────────────────────────────────────────────────────
 *   • at most MAX_CATEGORIES_PER_PASS changes are attempted per invocation;
 *   • at most `limit` recipients (default 12, hard cap 30), one dispatch each;
 *   • one dispatch per recipient — no fan-out loop over tasks;
 *   • failures retry on a backoff and give up at MAX_CONTENT_REFRESH_ATTEMPTS,
 *     so nothing can spin;
 *   • identical content is suppressed by the planner's content key, so a pass
 *     over unchanged cards sends nothing.
 *
 * ── DISABLED MEANS INERT ───────────────────────────────────────────────────
 * If `LiveActivityConfig.enabled` is false this returns immediately: no scan, no
 * rows, no dispatch. With `dry_run` true it runs the whole pass and records what
 * it WOULD send, and never contacts APNs.
 */

const TRACKABLE_STATUSES = ['OPEN', 'TAKEN', 'APPROVED_PENDING_DEPARTURE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];
const MAX_CATEGORIES_PER_PASS = 2;
const DEFAULT_RECIPIENTS = 12;
const MAX_RECIPIENTS = 30;
const RECIPIENT_BATCH = 4;

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const denied = await requireInternalOperator(base44, req, user ?? null);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === 'scan' ? 'scan' : 'refresh';
    const requested = Number(body?.limit);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.floor(requested), 1), MAX_RECIPIENTS)
      : DEFAULT_RECIPIENTS;
    const forceKeys = Array.isArray(body?.category_keys)
      ? body.category_keys.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim())
      : [];

    const now = Date.now();
    const at = new Date(now).toISOString();

    // ── 1. The switch, before any read that costs anything ──────────────────
    const configPage = await base44.asServiceRole.entities.LiveActivityConfig
      .list({ sort: '-updated_date', limit: 1 })
      .catch(() => ({ items: [] }));
    const config = normalizeConfig((configPage?.items || [])[0]);
    if (!config.enabled) {
      return Response.json({
        ok: true,
        enabled: false,
        decision: 'disabled',
        contactedApns: false,
        note: 'Live Activities are disabled. Nothing was scanned, written or sent.',
      });
    }

    // ── 2. What the content says NOW ────────────────────────────────────────
    const categoryPage = await base44.asServiceRole.entities.GlobalCategory
      .filter({ active: true }, { limit: 500 })
      .catch(() => ({ items: [] }));
    const categories = categoryPage?.items || [];
    const current = fingerprintCategories(categories);

    const versionPage = await base44.asServiceRole.entities.LiveActivityContentVersion
      .list({ limit: 500 })
      .catch(() => ({ items: [] }));
    const stored = versionPage?.items || [];

    const changes = detectContentChanges({ previous: stored, current });

    // ── 3. Record what changed (and baseline what is new) ───────────────────
    const byKey = new Map();
    for (const row of stored) if (row?.category_key) byKey.set(row.category_key, row);

    for (const key of changes.baseline) {
      await base44.asServiceRole.entities.LiveActivityContentVersion.create({
        category_key: key,
        fingerprint: current[key],
        pending: false,
        attempts: 0,
        observed_at: at,
        last_result: 'baseline',
      }).catch(() => null);
    }

    for (const key of [...changes.changed, ...forceKeys]) {
      if (!(key in current)) continue;
      const row = byKey.get(key);
      const fields = {
        fingerprint: current[key],
        previous_fingerprint: row?.fingerprint || (row ? '' : current[key]),
        pending: true,
        attempts: 0,
        next_attempt_at: null,
        changed_at: at,
        observed_at: at,
        last_result: 'pending',
      };
      if (row?.id) {
        await base44.asServiceRole.entities.LiveActivityContentVersion.update(row.id, fields).catch(() => null);
      } else {
        await base44.asServiceRole.entities.LiveActivityContentVersion.create({ category_key: key, ...fields }).catch(() => null);
      }
    }

    for (const key of changes.removed) {
      const row = byKey.get(key);
      if (row?.id) {
        await base44.asServiceRole.entities.LiveActivityContentVersion.update(row.id, {
          pending: false,
          last_result: 'category_removed',
          observed_at: at,
        }).catch(() => null);
      }
    }

    const scan = {
      presentation_version: PRESENTATION_VERSION,
      categories: Object.keys(current).length,
      baseline: changes.baseline.length,
      changed: changes.changed,
      unchanged: changes.unchanged.length,
      removed: changes.removed.length,
      forced: forceKeys,
    };

    if (mode === 'scan') {
      return Response.json({ ok: true, enabled: true, mode, dry_run: config.dry_run, scan, contactedApns: false, pass: null });
    }

    // ── 4. Which pending changes are due now ────────────────────────────────
    const freshPage = await base44.asServiceRole.entities.LiveActivityContentVersion
      .filter({ pending: true }, { limit: 100 })
      .catch(() => ({ items: [] }));
    const due = (freshPage?.items || [])
      .filter((row) => isDue(row, now))
      .sort((a, b) => Date.parse(a.changed_at || 0) - Date.parse(b.changed_at || 0))
      .slice(0, MAX_CATEGORIES_PER_PASS);

    const stillPending = (freshPage?.items || []).filter((row) => row.pending !== false).length;

    if (!due.length) {
      return Response.json({
        ok: true,
        enabled: true,
        mode,
        dry_run: config.dry_run,
        scan,
        pass: { attempted: 0, note: 'nothing_due', pending_rows: stillPending },
        contactedApns: false,
      });
    }

    // A parent's change reaches every category that inherits from it.
    const affectedKeys = affectedCategoryKeys(due.map((r) => r.category_key), categories);
    const affected = new Set(affectedKeys);

    // ── 5. Who could be showing a card at all ───────────────────────────────
    const tokenPage = await base44.asServiceRole.entities.LiveActivityToken
      .filter({ status: 'active' }, { limit: 200 })
      .catch(() => ({ items: [] }));
    const userIds = [];
    for (const row of tokenPage?.items || []) {
      if (row?.user_id && !userIds.includes(row.user_id)) userIds.push(row.user_id);
      if (userIds.length >= limit) break;
    }

    // ── 6. Refresh each recipient's card, in small sequential batches ───────
    const tallies = new Map(due.map((row) => [row.category_key, { dispatches: 0, sent: 0, failures: 0, dryRun: 0, results: [] }]));
    const results = [];

    // Which pending change does a task's category belong to? The exact key wins,
    // otherwise the nearest key it inherits from — so a card attributed to the
    // wrong change can never hold the right one's retry open.
    const coverage = new Map(due.map((row) => [row.category_key, new Set(affectedCategoryKeys([row.category_key], categories))]));
    const ownerOf = (taskCategory) => {
      if (!taskCategory) return null;
      const exact = due.find((row) => row.category_key === taskCategory);
      if (exact) return exact.category_key;
      const inherited = due.find((row) => coverage.get(row.category_key)?.has(taskCategory));
      return inherited ? inherited.category_key : null;
    };

    for (const batch of chunk(userIds, RECIPIENT_BATCH)) {
      const settled = await Promise.allSettled(batch.map(async (userId) => {
        const taskPage = await base44.asServiceRole.entities.Task
          .filter(
            { status: { $in: TRACKABLE_STATUSES }, $or: [{ client_id: userId }, { worker_id: userId }] },
            { sort: '-updated_date', limit: 20 },
          )
          .catch(() => ({ items: [] }));

        const relevant = (taskPage?.items || []).filter((t) => t && affected.has(t.category));
        const picked = pickTrackedTask(relevant, userId, now);
        if (!picked) return { user_id: userId, decision: 'no_affected_task' };

        const result = await dispatchRecipient({
          base44,
          config,
          task: picked.task,
          role: picked.role,
          recipientId: userId,
          mode: 'dispatch',
          eventRevision: null,
          now,
          // The whole catalogue, so the resolver sees the same inheritance the
          // app does — including a service that declares no flow of its own.
          categories,
        });

        return {
          user_id: userId,
          task_id: picked.task.id,
          task_category: picked.task.category,
          role: picked.role,
          decision: result.decision,
          revision: result.revision,
          sent: result.sent || 0,
          dry_run: result.dryRun === true,
          failed: result.failed || 0,
          contacted_apns: result.contactedApns === true,
        };
      }));

      for (const entry of settled) {
        if (entry.status !== 'fulfilled') {
          const failure = { decision: 'error', failed: 1, error: String(entry.reason?.message || entry.reason || 'failed') };
          results.push(failure);
          const key = due[0]?.category_key;
          if (key && tallies.has(key)) tallies.get(key).failures += 1;
          continue;
        }
        const row = entry.value;
        results.push(row);
        const key = ownerOf(row.task_category);
        if (!key || !tallies.has(key)) continue;
        const tally = tallies.get(key);
        if (row.failed > 0) {
          tally.failures += 1;
          tally.dispatches += 1;
        } else if (row.sent > 0) {
          tally.sent += row.sent;
          tally.dispatches += 1;
        } else if (row.dry_run) {
          tally.dryRun += 1;
          tally.dispatches += 1;
        }
        tally.results.push({ decision: row.decision, role: row.role });
      }
    }

    // ── 7. Close or retry each change ───────────────────────────────────────
    const pass = [];
    for (const row of due) {
      const tally = tallies.get(row.category_key) || { dispatches: 0, sent: 0, failures: 0, dryRun: 0, results: [] };
      const result = tally.failures > 0
        ? 'retry_scheduled'
        : (tally.sent > 0 ? 'refreshed' : (tally.dryRun > 0 ? 'dry_run' : 'no_recipients'));
      const fields = nextVersionState({
        attempts: row.attempts,
        failures: tally.failures,
        result,
        error: tally.failures > 0 ? 'dispatch_failed' : '',
        now,
      });
      await base44.asServiceRole.entities.LiveActivityContentVersion.update(row.id, fields).catch(() => null);
      pass.push({
        category_key: row.category_key,
        changed_at: row.changed_at || null,
        recipients_dispatched: tally.dispatches,
        sent: tally.sent,
        failures: tally.failures,
        result: fields.last_result,
        attempts: fields.attempts,
        pending: fields.pending,
      });
    }

    return Response.json({
      ok: true,
      enabled: true,
      mode,
      dry_run: config.dry_run,
      contactedApns: results.some((r) => r.contacted_apns === true),
      scan,
      pass: {
        attempted: due.length,
        categories: pass,
        recipients: userIds.length,
        affected_categories: affectedKeys.length,
        max_attempts: MAX_CONTENT_REFRESH_ATTEMPTS,
      },
      results,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message, contactedApns: false }, { status: 500 });
  }
});