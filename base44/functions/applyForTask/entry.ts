import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * applyForTask — Worker applies for an open task.
 * 1. Validates task is OPEN and no duplicate active application
 * 2. Deducts application credits (5% of price, min 1)
 * 3. Freezes price on task if auto_bump enabled and this is the first applicant
 * 4. Creates the TaskApplication record
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, message, images } = await req.json();
    if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });

    // Fetch task
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.status !== 'OPEN') return Response.json({ error: 'Task not open' }, { status: 400 });

    // Prevent worker from applying to their own task
    if (task.client_id === user.id) return Response.json({ error: 'Cannot apply to your own task' }, { status: 403 });

    // Prevent duplicate applications
    const existing = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId, worker_id: user.id });
    const alreadyActive = existing.find(a => a.status === 'pending' || a.status === 'approved');
    if (alreadyActive) return Response.json({ error: 'already_applied' }, { status: 409 });

    // Calculate credits: Round(price * 0.05), minimum 1
    const creditsRequired = Math.max(1, Math.round(task.price * 0.05));

    // Fetch fresh worker data for credits check
    const workerUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const userData = workerUsers[0];

    // Verification gate: if task requires verified workers, block unverified users
    if (task.verification_required) {
      if (!userData?.is_verified || userData?.kyc_status !== 'approved') {
        return Response.json({ error: 'verification_required', message: 'המשימה דורשת אימות' }, { status: 403 });
      }
    }

    const currentCredits = userData?.worker_credits ?? 100;

    if (currentCredits < creditsRequired) {
      return Response.json({
        error: 'insufficient_credits',
        credits_required: creditsRequired,
        credits_available: currentCredits,
      }, { status: 403 });
    }

    const newBalance = currentCredits - creditsRequired;

    // If auto_bump enabled and this is the FIRST active applicant → freeze price (before deduct, no side effects)
    if (task.auto_bump_enabled && task.base_price && task.max_price) {
      const allApps = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
      const activeApps = allApps.filter(a => a.status === 'pending' || a.status === 'approved');
      if (activeApps.length === 0) {
        const elapsedHours = (Date.now() - new Date(task.created_date).getTime()) / (1000 * 60 * 60);
        const progress = Math.min(elapsedHours / 24, 1);
        const frozenPrice = Math.round(task.base_price + (task.max_price - task.base_price) * progress);
        await base44.asServiceRole.entities.Task.update(taskId, { price: frozenPrice });
        console.log(`🔒 Auto-bump price frozen at ₪${frozenPrice} for task ${taskId}`);
      }
    }

    // Create application FIRST — if this fails, no credits are deducted
    const newApp = await base44.asServiceRole.entities.TaskApplication.create({
      task_id: taskId,
      task_title: task.title,
      worker_id: user.id,
      worker_name: user.full_name,
      worker_score: userData?.worker_score || 0,
      worker_rating: userData?.rating || 0,
      worker_tasks_count: userData?.score_tasks || 0,
      worker_verified: !!(userData?.is_verified && userData?.id_number),
      message: message || '',
      images: images || [],
      status: 'pending',
      credits_charged: creditsRequired,
    });

    // Rebuild applicants array from actual TaskApplication records (single source of truth)
    const allAppsAfter = await base44.asServiceRole.entities.TaskApplication.filter({ task_id: taskId });
    const activeAppsAfter = allAppsAfter.filter(a => a.status === 'pending' || a.status === 'approved');
    await base44.asServiceRole.entities.Task.update(taskId, {
      applicants: activeAppsAfter.map(a => ({
        worker_id: a.worker_id,
        worker_name: a.worker_name,
        applied_at: a.created_date,
      })),
    });

    // Deduct credits only after application is successfully created
    await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: -creditsRequired,
      type: 'Application_Fee',
      task_id: taskId,
      task_title: task.title,
      balance_after: newBalance,
      note: `הגשת בקשה למשימה: ${task.title}`,
    });

    console.log(`✅ Application created: worker ${user.id} → task ${taskId} (${creditsRequired} credits charged)`);
    return Response.json({
      success: true,
      application: newApp,
      credits_charged: creditsRequired,
      credits_remaining: newBalance,
    });

  } catch (error) {
    console.error('❌ applyForTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});