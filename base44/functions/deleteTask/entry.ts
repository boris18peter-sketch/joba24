import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { fetchUserMap } from '../../shared/userLookup.ts';

/**
 * deleteTask — permanent removal of a task by its publisher.
 *
 * Deleting a task must never strand an applicant's committed jobas. This is the
 * server-authoritative replacement for the old client-side `Task.delete()`:
 *
 *   1. Only the task's own client (or an admin) may delete it.
 *   2. A task with work already under way cannot be deleted — it must be
 *      cancelled instead, so the worker keeps their record and the fee rules
 *      stay intact.
 *   3. Every ACTIVE application (pending + approved) is settled and its
 *      committed jobas are refunded to the worker — automatically, with no
 *      action required from the applicant.
 *   4. Only then is the task record removed.
 *
 * IDEMPOTENCY / DOUBLE-REFUND SAFETY
 *   - Each application is flipped out of an active status BEFORE its refund is
 *     written, so a re-entrant run finds nothing left to refund.
 *   - The refunds and the delete happen inside one invocation, and the delete is
 *     last: a second invocation fails at "Task not found" and can never pay out
 *     twice. No client input is trusted for any amount — `credits_charged` is
 *     read from the persisted application row.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'Missing taskId' }, { status: 400 });

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Ownership is checked server-side — the RLS rule is not the only guard.
    const isOwner = task.client_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Work already under way (worker on the way / arrived / done) or completed:
    // deletion is refused so the worker is not erased mid-job. The publisher can
    // still cancel, which notifies the worker and settles credits.
    if (task.status === 'COMPLETED') {
      return Response.json({ error: 'completed_not_deletable' }, { status: 409 });
    }
    if (task.status === 'TAKEN' && task.worker_status) {
      return Response.json({ error: 'work_in_progress_not_deletable' }, { status: 409 });
    }

    // ── Release every committed application ────────────────────────────────
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = apps.filter((a) => a.status === 'pending' || a.status === 'approved');

    // The workers are read in ONE query rather than one query each.
    const workerIds = [...new Set(activeApps.filter((a) => (a.credits_charged || 0) > 0).map((a) => a.worker_id))];
    const workerMap = await fetchUserMap(base44.asServiceRole, workerIds);

    // ── Release every application in one call, before any money moves ───────
    // Flipping out of the active status FIRST is the idempotency guard, and
    // batching it keeps that guarantee while removing a round-trip per applicant.
    if (activeApps.length) {
      await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
        activeApps.map((a) => ({ id: a.id, status: 'cancelled' }))
      );
    }

    // The refunds and their ledger rows are written as batches too — a popular
    // task used to cost a chain of reads, updates and inserts per applicant at
    // the moment the publisher was waiting for the delete to finish.
    let refundedTotal = 0;
    const runningBalance = {};
    const userPatches = [];
    const ledgerRows = [];
    for (const app of activeApps) {
      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund <= 0) continue;

      const worker = workerMap[app.worker_id];
      if (!worker) continue;

      const base = runningBalance[worker.id] ?? (worker.worker_credits ?? 0);
      const newBalance = base + creditsToRefund;
      runningBalance[worker.id] = newBalance;
      userPatches.push({ id: worker.id, worker_credits: newBalance });
      ledgerRows.push({
        user_id: worker.id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        brand_id: task.origin_brand_id || null,
        balance_after: newBalance,
        note: `החזר ג'ובות - המשימה "${task.title}" נמחקה על ידי המפרסם`,
      });
      refundedTotal += creditsToRefund;
    }
    // The balance writes stay one call per worker — the User entity rejects a
    // batched update — but the application statuses and the whole ledger are
    // written in single calls now, which is where the round-trips actually were.
    if (userPatches.length) {
      await Promise.all(userPatches.map((p) => base44.asServiceRole.entities.User.update(p.id, { worker_credits: p.worker_credits })));
    }
    if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);

    // ── Remove the task record (last, so a retry cannot double-pay) ────────
    await base44.asServiceRole.entities.Task.delete(taskId);

    console.log(`✅ deleteTask: ${taskId} removed, ${activeApps.length} applications released, ${refundedTotal} jobas refunded`);
    return Response.json({
      success: true,
      released_applications: activeApps.length,
      refunded_total: refundedTotal,
    });
  } catch (error) {
    console.error('❌ deleteTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}