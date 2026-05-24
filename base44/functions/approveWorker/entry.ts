import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    console.log('🔄 APPROVAL MUTATION START:', { taskId, workerId });

    // STEP 1: Update task with worker assignment (ATOMIC)
    const updateTaskResult = await base44.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
    });
    console.log('✅ TASK UPDATED:', updateTaskResult);

    // STEP 2: Approve the selected application
    await base44.entities.TaskApplication.update(applicationId, {
      status: 'approved'
    });
    console.log('✅ APPLICATION APPROVED');

    // STEP 3: Refund all OTHER pending applicants
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const otherPending = allApps.filter(a => a.id !== applicationId && a.status === 'pending');

    for (const app of otherPending) {
      const creditsToRefund = app.credits_charged || 0;

      // Mark as rejected
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'rejected' });

      if (creditsToRefund > 0) {
        const workers = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
        const worker = workers[0];
        if (worker) {
          const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
          await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
          await base44.asServiceRole.entities.CreditTransaction.create({
            user_id: app.worker_id,
            amount: creditsToRefund,
            type: 'Refund_Rejection',
            task_id: taskId,
            task_title: app.task_title || '',
            balance_after: newBalance,
            note: 'החזר קרדיטים - עובד אחר נבחר למשימה',
          });
          console.log(`✅ Refunded ${creditsToRefund} credits to rejected worker ${app.worker_id}`);
        }
      }
    }

    // STEP 4: Fetch FRESH task data from backend (no cache)
    const freshTaskData = await base44.entities.Task.filter({ id: taskId });
    const updatedTask = freshTaskData[0];
    console.log('✅ FRESH TASK FETCH:', updatedTask);

    if (!updatedTask) {
      return Response.json({ error: 'Task not found after update' }, { status: 500 });
    }

    if (updatedTask.worker_id !== workerId) {
      console.error('❌ CRITICAL BUG: worker_id mismatch after update!');
      return Response.json({
        error: 'Data consistency error - worker_id not saved properly',
        debug: { expected: workerId, actual: updatedTask.worker_id }
      }, { status: 500 });
    }

    if (updatedTask.status !== 'TAKEN') {
      console.error('❌ CRITICAL BUG: status mismatch after update!');
      return Response.json({
        error: 'Data consistency error - status not saved properly',
        debug: { expected: 'TAKEN', actual: updatedTask.status }
      }, { status: 500 });
    }

    console.log(`✅ APPROVAL COMPLETE - refunded ${otherPending.length} other applicants`);
    return Response.json({
      success: true,
      task: updatedTask
    });

  } catch (error) {
    console.error('❌ APPROVAL ERROR:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});