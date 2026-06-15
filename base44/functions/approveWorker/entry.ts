import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * approveWorker — Task owner approves one applicant.
 * 1. Validates caller is the task owner and task is still OPEN
 * 2. Updates task: status=TAKEN, worker fields
 * 3. Marks selected application as approved
 * 4. Rejects + refunds all other pending applicants atomically
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

    // Fetch task + verify caller is owner and task is still OPEN
    const taskRows = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskRows[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (task.status !== 'OPEN') return Response.json({ error: `Task is not OPEN (current: ${task.status})` }, { status: 409 });

    // Fetch worker profile for enriched task fields
    const workerRows = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const workerProfile = workerRows[0];

    // Update task — assign worker and mark as TAKEN
    await base44.asServiceRole.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
      worker_rating: workerProfile?.rating || 0,
      worker_verified: workerProfile?.is_verified || false,
    });

    // Approve selected application
    await base44.asServiceRole.entities.TaskApplication.update(applicationId, { status: 'approved' });

    // Fetch all applications and reject + refund remaining pending ones
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const otherPending = allApps.filter(a => a.id !== applicationId && a.status === 'pending');

    await Promise.all(otherPending.map(async (app) => {
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'rejected' });
      const credits = app.credits_charged || 0;
      if (credits <= 0) return;
      const workers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
      const w = workers[0];
      if (!w) return;
      const newBalance = (w.worker_credits ?? 0) + credits;
      await base44.asServiceRole.entities.User.update(w.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: w.id,
        amount: credits,
        type: 'Refund_Rejection',
        task_id: taskId,
        task_title: task.title,
        balance_after: newBalance,
        note: `החזר קרדיטים - בקשה אחרת אושרה למשימה "${task.title}"`,
      });
    }));

    // Return fresh task data
    const freshRows = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const updatedTask = freshRows[0];

    return Response.json({ success: true, task: updatedTask, refunded_count: otherPending.length });

  } catch (error) {
    console.error('❌ approveWorker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});