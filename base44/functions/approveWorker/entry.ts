import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * approveWorker — Called by task owner to approve a specific applicant.
 * 1. Verifies ownership
 * 2. Assigns worker to task (status → TAKEN)
 * 3. Approves the chosen application
 * 4. Rejects all other pending applications + refunds their credits
 * 5. Saves worker_rating + worker_verified on the task for display
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, applicationId, workerId, workerName } = await req.json();
    if (!taskId || !applicationId || !workerId || !workerName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch task and verify ownership
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks?.[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden — only the task owner can approve' }, { status: 403 });
    if (task.status !== 'OPEN') return Response.json({ error: 'Task is not open' }, { status: 409 });

    // Fetch the approved application to get worker profile data
    const apps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const targetApp = apps.find(a => a.id === applicationId);
    if (!targetApp) return Response.json({ error: 'Application not found' }, { status: 404 });

    // Fetch worker profile for rating + verified status
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const workerProfile = workerUsers[0];

    // STEP 1: Update task — assign worker + save worker profile snapshot
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
      worker_rating: workerProfile?.rating ?? 0,
      worker_verified: workerProfile?.is_verified ?? false,
    });

    // STEP 2: Approve the chosen application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'approved' });

    // STEP 3: Reject all OTHER pending applications + refund their credits
    const pendingOthers = apps.filter(a => a.id !== applicationId && a.status === 'pending');
    await Promise.all(pendingOthers.map(async (app) => {
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'rejected' });

      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund <= 0) return;

      const otherWorkers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
      const otherWorker = otherWorkers[0];
      if (!otherWorker) return;

      const newBalance = (otherWorker.worker_credits ?? 0) + creditsToRefund;
      await base44.asServiceRole.entities.User.update(otherWorker.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: otherWorker.id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        balance_after: newBalance,
        note: `החזר קרדיטים - עובד אחר נבחר למשימה "${task.title}"`,
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to rejected worker ${otherWorker.id}`);
    }));

    // STEP 4: Verify the update took effect
    const freshTasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const updatedTask = freshTasks[0];
    if (!updatedTask || updatedTask.worker_id !== workerId || updatedTask.status !== 'TAKEN') {
      console.error('❌ Data consistency error after approval', { updatedTask });
      return Response.json({ error: 'Data consistency error after update' }, { status: 500 });
    }

    console.log(`✅ Worker ${workerId} approved for task ${taskId}. ${pendingOthers.length} others rejected.`);
    return Response.json({ success: true, task: updatedTask });

  } catch (error) {
    console.error('❌ approveWorker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});