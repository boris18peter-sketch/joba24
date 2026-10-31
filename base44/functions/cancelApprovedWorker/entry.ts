import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { applyCreditDeltas } from '../../shared/userCredits.ts';
import { fetchUserMap } from '../../shared/userLookup.ts';

/**
 * cancelApprovedWorker — Called by task owner to cancel an approved worker BEFORE they start moving.
 * Refunds credits to the approved worker AND all remaining pending applicants.
 * Resets task to OPEN.
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
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (task.worker_status) {
      return Response.json({ error: 'Worker already on the way — cannot cancel from here' }, { status: 409 });
    }

    const cancelledWorkerId = task.worker_id;

    // Only refund the APPROVED worker — pending applications stay valid so the
    // publisher can approve another worker after the task resets to OPEN.
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const approvedApps = apps.filter(a => a.status === 'approved');

    // The approved workers are read in ONE query rather than one query each.
    const workerIds = [...new Set(approvedApps.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
    const workerMap = await fetchUserMap(base44.asServiceRole, workerIds);

    // Refund only the approved worker — as batches, not one round-trip each.
    if (approvedApps.length) {
      await base44.asServiceRole.entities.TaskApplication.bulkUpdate(
        approvedApps.map(a => ({ id: a.id, status: 'rejected' }))
      );
    }

    const runningBalance = {};
    const userPatches = [];
    const ledgerRows = [];
    for (const app of approvedApps) {
      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund <= 0) continue;

      const worker = workerMap[app.worker_id];
      if (!worker) continue;

      const base = runningBalance[worker.id] ?? (worker.worker_credits ?? 0);
      const newBalance = base + creditsToRefund;
      runningBalance[worker.id] = newBalance;
      userPatches.push({ id: worker.id, delta: creditsToRefund });
      ledgerRows.push({
        user_id: worker.id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        brand_id: task.origin_brand_id || null,
        balance_after: newBalance,
        note: 'החזר ג\'ובות - בעל המשימה ביטל את בחירתך',
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to approved worker ${worker.id}`);
    }
    // The balance writes stay one call per worker — the User entity rejects a
    // batched update — but the application statuses and the whole ledger are
    // written in single calls now, which is where the round-trips actually were.
    if (userPatches.length) {
      // One write per user, applied by applyCreditDeltas — the platform rejects a
      // bulk User update outright, and two absolute writes for the same user in
      // parallel would lose one of them.
      await applyCreditDeltas(base44.asServiceRole, userPatches);
    }
    if (ledgerRows.length) await base44.asServiceRole.entities.CreditTransaction.bulkCreate(ledgerRows);

    // Pending applications are NOT touched — they remain valid for re-approval.

    // ── TELL THE WORKER, AND TELL THEM THE TRUTH ───────────────────────────
    // Two notifications come out of this action, and each has to go to the
    // person it concerns:
    //
    // 1. The removed worker must hear that the PUBLISHER revoked the approval.
    //    The approval rows above were written with bulkUpdate, which skips
    //    per-record triggers, so the "application revoked" workflow never fired
    //    for them — the worker was told nothing at all.
    // 2. The publisher must NOT hear it. Resetting the task to OPEN fires the
    //    Task trigger whose copy is written for the opposite case ("the worker
    //    cancelled"), which is what sent the publisher a notification about
    //    their own action. notifyTaskWorkerLeft now checks the application
    //    status and stays silent for this path, so the notice is only sent here
    //    — once, to the right person.
    for (const app of approvedApps) {
      if (!app.worker_id) continue;
      await base44.asServiceRole.functions.invoke('notificationManager', {
        event_key: 'application_revoked',
        user_ids: [app.worker_id],
        task_id: taskId,
        variables: {
          task_title: task.title || '',
          task_id: taskId,
          worker_id: app.worker_id,
        },
      }).catch((e) => console.error('notify revoked failed', e?.message));

      // …and an in-app record in the conversation they already share, so the
      // worker sees the reason next to the refund rather than only as a push.
      await base44.asServiceRole.entities.ChatMessage.create({
        task_id: taskId,
        sender_id: user.id,
        sender_name: user.full_name,
        content: `המפרסם ביטל את בחירתך למשימה "${task.title}". הג'ובות שהיו נעולות הוחזרו ליתרה שלך, והמשימה מחפשת עובד אחר.`,
        thread_key: [user.id, app.worker_id].sort().join('__'),
        recipient_id: app.worker_id,
        surface_brand_id: task.origin_brand_id || null,
      }).catch((e) => console.error('chat notice failed', e?.message));
    }

    // Rebuild applicants array from actual TaskApplication records (single source of truth)
    // `apps` was fetched above; after rejecting approved apps, only pending remain active
    const activeAppsAfter = apps.filter(a => a.status === 'pending');

    // Reset task to OPEN
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'OPEN',
      worker_id: null,
      worker_name: null,
      worker_status: null,
      worker_rating: null,
      worker_verified: null,
      applicants: activeAppsAfter.map(a => ({
        worker_id: a.worker_id,
        worker_name: a.worker_name,
        applied_at: a.created_date,
      })),
    });

    console.log(`✅ cancelApprovedWorker: task ${taskId} reset to OPEN, ${approvedApps.length} apps refunded`);
    return Response.json({ success: true, cancelledWorkerId });
  } catch (error) {
    console.error('❌ cancelApprovedWorker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});