import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { syncTaskApplicants } from '../../shared/taskApplicants.ts';
import { fetchUserMap } from '../../shared/userLookup.ts';

/**
 * cancelTaskPayment — Cancels a task and refunds credits to all applicants.
 * Can be called by:
 *   - Task owner (any status before COMPLETED)
 *   - Assigned worker (voluntary exit)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'Missing taskId' }, { status: 400 });

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    const isClient = task.client_id === user.id;
    const isWorker = task.worker_id === user.id;
    if (!isClient && !isWorker) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Prevent cancelling a completed task
    if (task.status === 'COMPLETED') return Response.json({ error: 'Task already completed' }, { status: 409 });

    // Refund credits to ALL active applicants (pending + approved)
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = apps.filter(a => a.status === 'pending' || a.status === 'approved');

    // Every applicant's worker record is read in ONE query, not one query each.
    const workerIds = [...new Set(activeApps.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
    const workerMap = await fetchUserMap(base44.asServiceRole, workerIds);

    // Cancel every application in one call, then settle the refunds in batches.
    // This was a per-application chain of update → read → update → insert issued
    // in parallel, so cancelling a popular task fired hundreds of simultaneous
    // database calls while the publisher waited on the confirmation.
    if (activeApps.length) {
      await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
        activeApps.map(a => ({ id: a.id, status: 'cancelled' }))
      );
    }

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
        note: isClient
          ? `החזר ג'ובות - המשימה "${task.title}" בוטלה על ידי המפרסם`
                : `החזר ג'ובות - המשימה "${task.title}" בוטלה על ידי העובד`,
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to worker ${worker.id}`);
    }
    // The balance writes stay one call per worker — the User entity rejects a
    // batched update — but the application statuses and the whole ledger are
    // written in single calls now, which is where the round-trips actually were.
    if (userPatches.length) {
      await Promise.all(userPatches.map((p) => base44.asServiceRole.entities.User.update(p.id, { worker_credits: p.worker_credits })));
    }
    if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);

    // Penalize client trust_score if cancelling after worker started moving
    const workerHasStarted = !!task.worker_status;
    if (isClient && workerHasStarted) {
      const clientUsers = await base44.asServiceRole.entities.User.filter({ id: task.client_id });
      const client = clientUsers[0];
      if (client) {
        const newScore = Math.max(0, Math.round(((client.trust_score ?? 1) - 0.05) * 100) / 100);
        await base44.asServiceRole.entities.User.update(client.id, { trust_score: newScore });
        console.log(`⚠️ Client trust_score reduced to ${newScore}`);
      }
    }

    const cancelledWorkerId = task.worker_id;

    // Cancel the task and clear worker assignment
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'CANCELLED',
      worker_id: null,
      worker_name: null,
      worker_status: null,
    });

    // Every application was just cancelled — rebuild the task's applicant
    // projection so a phantom applicant cannot survive the cancellation.
    await syncTaskApplicants(base44.asServiceRole, taskId);

    // ── Notify the assigned worker ─────────────────────────────────────────
    // When the PUBLISHER cancels, the worker must hear about it even if their
    // app is closed or backgrounded — the in-app WebSocket popup alone cannot
    // cover that. The "Push: Task Cancelled" workflow cannot fire here because
    // this very update nulls `worker_id`, so the push is sent explicitly.
    if (isClient && cancelledWorkerId && cancelledWorkerId !== user.id) {
      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'task_cancelled',
          user_ids: [cancelledWorkerId],
          task_id: taskId,
          variables: { task_title: task.title || '', task_id: taskId },
        });
      } catch (err) {
        console.warn('⚠️ Worker cancellation push failed:', err?.message);
      }
    }

    console.log(`✅ Task ${taskId} cancelled by ${isClient ? 'client' : 'worker'}`);
    return Response.json({ success: true, cancelledWorkerId, taskTitle: task.title, taskId });

  } catch (error) {
    console.error('❌ cancelTaskPayment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});