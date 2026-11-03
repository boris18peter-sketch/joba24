/**
 * taskCompletion — the publisher's completion workflow, as ONE implementation.
 *
 * ── WHY IT WAS EXTRACTED ───────────────────────────────────────────────────
 * Completion is the most consequential action in the app: it counts the job for
 * the worker, rejects every remaining application, refunds their credits through
 * the ledger, rebuilds the applicant projection and carries an idempotency guard
 * so none of it can happen twice.
 *
 * It used to live only inside `completeTask`. A Lock Screen approval must run
 * EXACTLY that workflow — not a copy, and not a second endpoint that reimplements
 * the refunds. So the body moved here, unchanged, and `completeTask` (the HTTP
 * entry the in-app banner calls) delegates to it. The two callers now cannot
 * diverge: there is one function, and a future fix lands in both at once.
 *
 * Signature and behaviour are the ones `completeTask` had: same order of writes,
 * same idempotency guard (`client_confirmed` read BEFORE the update), same
 * messages. Nothing about the task, credit or payment rules was changed.
 */

import { applyCreditDeltas } from './userCredits.ts';
import { syncTaskApplicants } from './taskApplicants.ts';
import { fetchUserMap } from './userLookup.ts';

export type CompletionResult = { status: number; body: Record<string, any> };

/**
 * Confirm completion of `taskId` as `user`.
 *
 * `user` must be the authenticated caller: ownership is checked here, exactly as
 * `completeTask` checked it, so a caller can never complete somebody else's task.
 */
export async function completeTaskCore(
  base44: any,
  user: { id: string },
  taskId: string,
): Promise<CompletionResult> {
  if (!taskId) return { status: 400, body: { error: 'Missing taskId' } };

  const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
  const task = tasks?.[0];
  if (!task) return { status: 404, body: { error: 'Task not found' } };

  if (task.client_id !== user.id) return { status: 403, body: { error: 'Forbidden' } };

  if (task.status === 'COMPLETED') {
    return { status: 200, body: { success: true, note: 'Already completed', already_completed: true } };
  }

  // The worker must have reported the work finished — the same gate the banner's
  // button uses. A publisher cannot approve work nobody has claimed is done.
  if (task.worker_status !== 'done') {
    return {
      status: 409,
      body: { error: 'worker_not_done', worker_status: task.worker_status || null },
    };
  }

  // Capture client_confirmed BEFORE updating — used as idempotency guard below
  const wasAlreadyClientConfirmed = !!task.client_confirmed;

  await base44.asServiceRole.entities.Task.update(taskId, {
    status: 'COMPLETED',
    client_confirmed: true,
    completed_at: new Date().toISOString(),
  });

  if (task.worker_id && !wasAlreadyClientConfirmed) {
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: task.worker_id });
    const worker = workerUsers[0];
    if (worker) {
      const newCount = (worker.tasks_completed ?? 0) + 1;
      await base44.asServiceRole.entities.User.update(worker.id, { tasks_completed: newCount });
      console.log(`✅ Worker ${worker.id} tasks_completed → ${newCount}`);
    }
  }

  // Refund all remaining pending applications — only the approved worker keeps credits deducted
  if (!wasAlreadyClientConfirmed) {
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const pendingApps = allApps.filter((a) => a.status === 'pending');

    // ── The settlement runs in batches, not one round-trip per applicant ──
    if (pendingApps.length) {
      await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
        pendingApps.map((a) => ({ id: a.id, status: 'rejected' })),
      );

      const refundApps = pendingApps.filter((a) => (a.credits_charged || 0) > 0);
      const workerMap = await fetchUserMap(
        base44.asServiceRole,
        refundApps.map((a) => a.worker_id),
      );

      const runningBalance: Record<string, number> = {};
      const userPatches: any[] = [];
      const ledgerRows: any[] = [];
      for (const app of refundApps) {
        const w = workerMap[app.worker_id];
        if (!w) continue;
        const base = runningBalance[w.id] ?? (w.worker_credits ?? 0);
        const newBalance = base + app.credits_charged;
        runningBalance[w.id] = newBalance;
        userPatches.push({ id: w.id, delta: app.credits_charged });
        ledgerRows.push({
          user_id: app.worker_id,
          amount: app.credits_charged,
          type: 'Refund_Rejection',
          task_id: taskId,
          task_title: task.title,
          brand_id: task.origin_brand_id || null,
          balance_after: newBalance,
          note: `המשימה "${task.title}" הושלמה — הבקשה לא נבחרה, ${app.credits_charged} ג'ובות הוחזרו`,
        });
        console.log(`✅ Refunded ${app.credits_charged} credits to worker ${app.worker_id} (task completed, not selected)`);
      }

      if (userPatches.length) await applyCreditDeltas(base44.asServiceRole, userPatches);
      if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);
    }
  }

  await syncTaskApplicants(base44.asServiceRole, taskId);

  console.log(`✅ Task ${taskId} marked COMPLETED by client ${user.id}`);
  return { status: 200, body: { success: true } };
}