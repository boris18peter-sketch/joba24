import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { syncTaskApplicants } from '../../shared/taskApplicants.ts';
import { fetchUserMap } from '../../shared/userLookup.ts';

/**
 * completeTask — Called by the task owner (client) to confirm task completion.
 * 1. Marks task as COMPLETED
 * 2. Sets client_confirmed = true
 * 3. Increments worker's tasks_completed count
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

    // Only the client (owner) can confirm completion
    if (task.client_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (task.status === 'COMPLETED') {
      return Response.json({ success: true, note: 'Already completed' });
    }

    // Capture client_confirmed BEFORE updating — used as idempotency guard below
    const wasAlreadyClientConfirmed = !!task.client_confirmed;

    // Mark task as COMPLETED
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'COMPLETED',
      client_confirmed: true,
      completed_at: new Date().toISOString(),
    });

    // Increment worker's completed tasks count — only if not already incremented (idempotency guard)
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
      const pendingApps = allApps.filter(a => a.status === 'pending');

      // ── The settlement runs in batches, not one round-trip per applicant ──
      // This used to update, re-read and refund inside a serial loop: a task
      // with thirty applicants cost roughly a hundred and twenty sequential
      // database calls at the exact moment the publisher pressed "confirm
      // completion" — slow enough to time out, and a timeout part-way through
      // leaves some applicants refunded and some not, with no way to tell which.
      if (pendingApps.length) {
        // Every pending application leaves the active state in ONE call. This
        // still happens BEFORE any refund is written, which is what keeps a
        // re-entrant run from paying twice.
        await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
          pendingApps.map(a => ({ id: a.id, status: 'rejected' }))
        );

        const refundApps = pendingApps.filter(a => (a.credits_charged || 0) > 0);
        const workerMap = await fetchUserMap(
          base44.asServiceRole,
          refundApps.map(a => a.worker_id)
        );

        // The running balance is kept per worker, so a worker who somehow holds
        // two applications on this task is still paid the full amount instead of
        // being paid twice from the same starting figure.
        const runningBalance = {};
        const userPatches = [];
        const ledgerRows = [];
        for (const app of refundApps) {
          const w = workerMap[app.worker_id];
          if (!w) continue;
          const base = runningBalance[w.id] ?? (w.worker_credits ?? 0);
          const newBalance = base + app.credits_charged;
          runningBalance[w.id] = newBalance;
          userPatches.push({ id: w.id, worker_credits: newBalance });
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

        // The balance writes stay one call per worker — the User entity rejects a
        // batched update — but the application statuses and the whole ledger are
        // written in single calls now, which is where the round-trips actually were.
        if (userPatches.length) {
          await Promise.all(userPatches.map((p) => base44.asServiceRole.entities.User.update(p.id, { worker_credits: p.worker_credits })));
        }
        if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);
      }
    }

    // Every remaining pending application was just rejected — rebuild the task's
    // applicant projection so the card cannot keep counting them.
    await syncTaskApplicants(base44.asServiceRole, taskId);

    console.log(`✅ Task ${taskId} marked COMPLETED by client ${user.id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ completeTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});