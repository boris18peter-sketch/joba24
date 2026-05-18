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

    // STEP 1: Update task with worker assignment
    await base44.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
    });
    console.log('✅ TASK UPDATED');

    // STEP 2: Approve the selected application
    await base44.entities.TaskApplication.update(applicationId, { status: 'approved' });
    console.log('✅ APPLICATION APPROVED');

    // STEP 3: Reject all other PENDING applications and refund their credits
    const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const otherPending = allApps.filter(a => a.id !== applicationId && a.status === 'pending');
    console.log(`🔄 Rejecting and refunding ${otherPending.length} other applicants`);

    for (const app of otherPending) {
      // Reject
      await base44.asServiceRole.entities.TaskApplication.update(app.id, { status: 'rejected' });

      // Refund credits
      const creditsToRefund = app.credits_charged || 0;
      if (creditsToRefund <= 0) continue;

      const users = await base44.asServiceRole.entities.User.filter({ id: app.worker_id });
      const worker = users[0];
      if (!worker) continue;

      const newBalance = (worker.worker_credits ?? 0) + creditsToRefund;
      await base44.asServiceRole.entities.User.update(worker.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: app.worker_id,
        amount: creditsToRefund,
        type: 'Refund_Rejection',
        task_id: taskId,
        balance_after: newBalance,
        note: `החזר קרדיטים - בקשה לא נבחרה`,
      });
      console.log(`✅ Refunded ${creditsToRefund} credits to worker ${app.worker_id}`);
    }

    // STEP 4: Verify update
    const freshTaskData = await base44.entities.Task.filter({ id: taskId });
    const updatedTask = freshTaskData[0];

    if (!updatedTask || updatedTask.worker_id !== workerId || updatedTask.status !== 'TAKEN') {
      return Response.json({ error: 'Data consistency error' }, { status: 500 });
    }

    console.log('✅ APPROVAL COMPLETE - DATA VERIFIED');
    return Response.json({ success: true, task: updatedTask });

  } catch (error) {
    console.error('❌ APPROVAL ERROR:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});