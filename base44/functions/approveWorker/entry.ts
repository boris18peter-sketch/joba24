import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, applicationId, workerId, workerName } = await req.json();

    if (!taskId || !applicationId || !workerId || !workerName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify caller is the task owner
    const taskData = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const existingTask = taskData[0];
    if (!existingTask) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (existingTask.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (existingTask.status !== 'OPEN') return Response.json({ error: 'Task is not open' }, { status: 409 });

    // Fetch worker profile for rating/verified fields
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const workerProfile = workerUsers[0];

    // STEP 1: Update task with worker assignment
    const updateTaskResult = await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
      worker_rating: workerProfile?.rating || 0,
      worker_verified: workerProfile?.is_verified || false,
    });

    // STEP 2: Approve the selected application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, {
      status: 'approved'
    });

    // STEP 3: Reject all other pending applications and refund their credits
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const otherPending = allApps.filter(a => a.id !== applicationId && a.status === 'pending');

    await Promise.all(otherPending.map(async (app) => {
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'rejected' });
      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund > 0) {
        const workers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
        const w = workers[0];
        if (w) {
          const newBalance = (w.worker_credits ?? 0) + creditsToRefund;
          await base44.asServiceRole.entities.User.update(w.id, { worker_credits: newBalance });
          await base44.asServiceRole.entities.CreditTransaction.create({
            user_id: w.id,
            amount: creditsToRefund,
            type: 'Refund_Rejection',
            task_id: taskId,
            task_title: existingTask.title,
            balance_after: newBalance,
            note: `החזר קרדיטים - בקשה אחרת אושרה למשימה "${existingTask.title}"`,
          });
        }
      }
    }));

    // STEP 4: Fetch fresh task data for response
    const freshTaskData = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const updatedTask = freshTaskData[0];

    if (!updatedTask || updatedTask.worker_id !== workerId || updatedTask.status !== 'TAKEN') {
      return Response.json({
        error: 'Data consistency error after update',
        debug: { expected_worker: workerId, actual_worker: updatedTask?.worker_id, status: updatedTask?.status }
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      task: updatedTask,
      refunded_count: otherPending.length,
    });

  } catch (error) {
    console.error('❌ approveWorker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});