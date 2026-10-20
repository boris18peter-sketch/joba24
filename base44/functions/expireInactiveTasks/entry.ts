import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { fetchUserMap } from '../../shared/userLookup.ts';
import { applyCreditDeltas } from '../../shared/userCredits.ts';

/**
 * Cron job — runs every hour.
 * Expires OPEN tasks whose `expires_at` has passed, OR tasks older than 48h with no expiry set.
 * Refunds credits to ALL applicants (pending or approved).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow: scheduled cron (no auth token) OR authenticated admin users
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    // Unauthenticated requests are allowed (scheduled cron automation)

    const now = new Date().toISOString();
    const fallbackCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // ── The database decides which tasks can have expired ───────────────────
    // This used to download EVERY open task — with no limit at all, and every
    // field each one carries — and then pick the expired ones out in JavaScript.
    // An hourly job paid that cost for the entire marketplace in order to touch
    // the handful that had actually lapsed.
    //
    // The two ways a task can lapse are now the query itself, so a healthy
    // marketplace reads nothing at all.
    //
    // It is deliberately a SUPERSET: "has an expiry that has passed" OR "was
    // created before the fallback cutoff". A task with no expiry set falls to
    // the second branch, which is exactly what the rule below then applies. The
    // precise rule is still re-applied to every row that comes back, so the two
    // can never disagree.
    const expiryQuery = {
      status: 'OPEN',
      $or: [
        { expires_at: { $lt: now } },
        { created_date: { $lt: fallbackCutoff } },
      ],
    };

    const openTasks = [];
    let skip = 0;
    const pageSize = 200;
    while (true) {
      const page = await base44.asServiceRole.entities.Task.filter(expiryQuery, 'created_date', pageSize, skip);
      openTasks.push(...page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    const expiredTasks = openTasks.filter(t => {
      if (t.expires_at) return t.expires_at < now;
      return t.created_date && t.created_date < fallbackCutoff;
    });

    if (expiredTasks.length === 0) {
      console.log('✅ No expired tasks found');
      return Response.json({ success: true, expired: 0 });
    }

    // ── Every expired task's applications are read in ONE query ─────────────
    // This used to be a TaskApplication read per expired task, inside the loop.
    const expiredIds = expiredTasks.map(t => t.id);
    const appsByTask = {};
    for (const id of expiredIds) appsByTask[id] = [];

    const APP_CHUNK = 50;
    const appChunkCount = Math.ceil(expiredIds.length / APP_CHUNK);
    for (const [c] of Array.from({ length: appChunkCount }).entries()) {
      const chunk = expiredIds.slice(c * APP_CHUNK, c * APP_CHUNK + APP_CHUNK);
      const rows = await base44.asServiceRole.entities.TaskApplication.filter(
        { task_id: { $in: chunk } }, '-created_date', 500, 0,
      );
      for (const row of rows || []) {
        if (appsByTask[row.task_id]) appsByTask[row.task_id].push(row);
      }
    }

    const appsToRefund = [];
    for (const task of expiredTasks) {
      for (const a of appsByTask[task.id] || []) {
        if (a.status === 'pending' || a.status === 'approved') appsToRefund.push(a);
      }
    }

    // Every applicant's worker record is read in ONE query, not one query each.
    const workerIds = [...new Set(appsToRefund.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
    const workerMap = await fetchUserMap(base44.asServiceRole, workerIds);

    // ── The whole batch settles in a handful of calls, not four per applicant ─
    // Cancel every application in one call, then settle the refunds in batches —
    // this runs hourly over every expired task, so a per-applicant chain of
    // reads, updates and inserts multiplied across the whole batch.
    if (appsToRefund.length) {
      await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
        appsToRefund.map(a => ({ id: a.id, status: 'cancelled' })),
      );
    }

    const taskById = {};
    for (const t of expiredTasks) taskById[t.id] = t;

    const runningBalance = {};
    const userPatches = [];
    const ledgerRows = [];
    let refundedCount = 0;

    for (const app of appsToRefund) {
      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund <= 0) continue;

      const worker = workerMap[app.worker_id];
      if (!worker) continue;

      const base = runningBalance[worker.id] ?? (worker.worker_credits ?? 0);
      const newBalance = base + creditsToRefund;
      runningBalance[worker.id] = newBalance;
      // The DELTA, not the resulting balance. `runningBalance` is still what the
      // ledger records, but the write below must be additive: an absolute balance
      // would make each patch for the same worker a full overwrite of the last.
      userPatches.push({ id: worker.id, delta: creditsToRefund });

      const task = taskById[app.task_id] || {};
      ledgerRows.push({
        user_id: app.worker_id,
        amount: creditsToRefund,
        type: 'Refund_Expiration',
        task_id: app.task_id,
        task_title: task.title,
        balance_after: newBalance,
        note: `החזר ג'ובות - משימה "${task.title}" פגה תוקף`,
      });

      refundedCount++;
    }

    // The balance writes stay one call per worker — the User entity rejects a
    // batched update — but everything around them is batched, which is where the
    // round-trips actually were.
    if (userPatches.length) {
      // ── ONE WRITE PER WORKER, AND IT MUST BE ADDITIVE ────────────────────
      // A worker holding several expired applications is refunded for each of
      // them. The patches used to carry a RESULTING BALANCE and were written in
      // parallel, so the same worker got two writes that each replaced the
      // other: whichever landed last won and the other refund vanished from the
      // balance while its ledger row still claimed it was paid.
      //
      // applyCreditDeltas sums the deltas per worker and writes the balance ONCE,
      // so every refund lands. It also suits this job's context: it is a
      // scheduled run with no user token, where the platform refuses a bulk user
      // update outright ("Bulk user update not allowed") — this uses a
      // single-record write, which is allowed from every context.
      await applyCreditDeltas(base44.asServiceRole, userPatches);
    }
    if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);

    // ── Every task is marked EXPIRED in one call ────────────────────────────
    // Every application on it was just cancelled, so the task's denormalised
    // `applicants` projection is empty — the same thing syncTaskApplicants would
    // have written, without a second read and a second write per task.
    await base44.asServiceRole.entities.Task.bulkUpdate(
      expiredTasks.map(t => ({ id: t.id, status: 'EXPIRED', applicants: [] })),
    );

    console.log(`✅ Done: ${expiredTasks.length} tasks expired, ${refundedCount} refunds issued`);
    return Response.json({ success: true, expired: expiredTasks.length, refunded: refundedCount });

  } catch (error) {
    console.error('❌ expireInactiveTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});