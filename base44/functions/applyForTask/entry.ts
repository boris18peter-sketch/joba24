import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId, message } = await req.json();
  if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });

  // Fetch task
  let task;
  try {
    const tasks = await base44.entities.Task.filter({ id: taskId });
    task = tasks[0];
  } catch {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  if (task.status !== 'OPEN') return Response.json({ error: 'Task not open' }, { status: 400 });

  // Prevent duplicate applications
  const existing = await base44.entities.TaskApplication.filter({ task_id: taskId, worker_id: user.id });
  const alreadyActive = existing.find(a => a.status === 'pending' || a.status === 'approved');
  if (alreadyActive) return Response.json({ error: 'already_applied' }, { status: 409 });

  // Calculate credits: Round(price * 0.05), minimum 1
  const creditsRequired = Math.max(1, Math.round(task.price * 0.05));

  // Fetch fresh user data for credits
  const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
  const userData = users[0];
  const currentCredits = userData?.worker_credits ?? 100;

  // Insufficient credits
  if (currentCredits < creditsRequired) {
    return Response.json({
      error: 'insufficient_credits',
      credits_required: creditsRequired,
      credits_available: currentCredits,
    }, { status: 403 });
  }

  const newBalance = currentCredits - creditsRequired;

  // Deduct credits
  await base44.auth.updateMe({ worker_credits: newBalance });

  // Log credit transaction
  await base44.entities.CreditTransaction.create({
    user_id: user.id,
    amount: -creditsRequired,
    type: 'Application_Fee',
    task_id: taskId,
    task_title: task.title,
    balance_after: newBalance,
    note: `הגשת בקשה למשימה: ${task.title}`,
  });

  // Create application
  const newApp = await base44.entities.TaskApplication.create({
    task_id: taskId,
    worker_id: user.id,
    worker_name: user.full_name,
    worker_score: userData?.worker_score || 0,
    worker_rating: userData?.rating || 0,
    worker_tasks_count: userData?.score_tasks || 0,
    message: message || '',
    status: 'pending',
    credits_charged: creditsRequired,
  });

  return Response.json({
    success: true,
    application: newApp,
    credits_charged: creditsRequired,
    credits_remaining: newBalance,
  });
});