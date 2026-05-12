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

    // Fetch worker's profile for rating + verified status
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: workerId });
    const workerUser = workerUsers?.[0];

    // STEP 1: Update task with worker assignment (ATOMIC)
    const updateTaskResult = await base44.entities.Task.update(taskId, {
      status: 'TAKEN',
      worker_id: workerId,
      worker_name: workerName,
      worker_rating: workerUser?.rating || 0,
      worker_verified: workerUser?.is_verified || false,
    });
    console.log('✅ TASK UPDATED:', updateTaskResult);

    // STEP 2: Approve the application
    await base44.entities.TaskApplication.update(applicationId, { 
      status: 'approved' 
    });
    console.log('✅ APPLICATION APPROVED');

    // STEP 3: Fetch FRESH task data from backend (no cache)
    const freshTaskData = await base44.entities.Task.filter({ id: taskId });
    const updatedTask = freshTaskData[0];
    console.log('✅ FRESH TASK FETCH:', updatedTask);

    if (!updatedTask) {
      return Response.json({ error: 'Task not found after update' }, { status: 500 });
    }

    // STEP 4: Verify worker_id is actually set
    if (updatedTask.worker_id !== workerId) {
      console.error('❌ CRITICAL BUG: worker_id mismatch after update!');
      console.error('Expected:', workerId);
      console.error('Got:', updatedTask.worker_id);
      return Response.json({ 
        error: 'Data consistency error - worker_id not saved properly',
        debug: { expected: workerId, actual: updatedTask.worker_id }
      }, { status: 500 });
    }

    if (updatedTask.status !== 'TAKEN') {
      console.error('❌ CRITICAL BUG: status mismatch after update!');
      console.error('Expected: TAKEN');
      console.error('Got:', updatedTask.status);
      return Response.json({ 
        error: 'Data consistency error - status not saved properly',
        debug: { expected: 'TAKEN', actual: updatedTask.status }
      }, { status: 500 });
    }

    console.log('✅ APPROVAL COMPLETE - DATA VERIFIED');
    return Response.json({ 
      success: true, 
      task: updatedTask 
    });

  } catch (error) {
    console.error('❌ APPROVAL ERROR:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});