import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Fetch ALL active applications in parallel
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeApps = apps.filter(a => a.status === 'approved' || a.status === 'pending');

    // Batch-fetch all worker records to avoid N+1 queries
    const workerIds = [...new Set(activeApps.filter(a => (a.credits_charged || 0) > 0).map(a => a.worker_id))];
    const workerResults = await Promise.all(workerIds.map(id => base44.asServiceRole.entities.User.filter({ id })));
    const workerMap = {};
    workerResults.forEach(res => { if (res[0]) workerMap[res[0].id] = res[0]; });

    // Refund all active applicants in parallel
    await Promise.all(activeApps.map(async (app) => {
      const note = app.status === 'approved'
        ? 'החזר קרדיטים - בעל המשימה ביטל את בחירתך'
        : 'החזר קרדיטים - בעל המשימה ביטל את המשימה';

      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'rejected' });

      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund <= 0) return;

      const worker = workerMap[app.worker_id];
      if (!worker) return;

      const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
      await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: worker.id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        balance_after: newBalance,
        note,
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to worker ${worker.id} (was ${app.status})`);
    }));

    // Reset task to OPEN
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'OPEN',
      worker_id: null,
      worker_name: null,
      worker_status: null,
      worker_rating: null,
      worker_verified: null,
    });

    console.log(`✅ cancelApprovedWorker: task ${taskId} reset to OPEN, ${activeApps.length} apps refunded`);
    return Response.json({ success: true, cancelledWorkerId });
  } catch (error) {
    console.error('❌ cancelApprovedWorker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});