import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BOOST_COST = 5;

/**
 * boostTask — Deducts 5 credits from the task owner and updates the task's boost metadata.
 * All credit operations go through service-role for atomicity and security.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'Missing taskId' }, { status: 400 });

    // Fetch task and verify ownership
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Only OPEN tasks can be boosted
    if (task.status !== 'OPEN') {
      return Response.json({ error: 'task_not_open', note: 'ניתן לבצע איתות רק למשימות פתוחות' }, { status: 409 });
    }

    // Enforce 1-hour cooldown — server-side hard limit, applies in ALL cases
    const HOUR_MS = 60 * 60 * 1000;
    if (task.last_boost_at) {
      const s = String(task.last_boost_at);
      const lastMs = (s.endsWith('Z') || s.includes('+')) ? new Date(s).getTime() : new Date(s + 'Z').getTime();
      if (lastMs && !isNaN(lastMs)) {
        const elapsed = Date.now() - lastMs;
        if (elapsed < HOUR_MS) {
          const minutesLeft = Math.ceil((HOUR_MS - elapsed) / 60000);
          return Response.json({
            error: 'boost_cooldown',
            minutes_left: minutesLeft,
            message: `יש להמתין ${minutesLeft} דקות לפני איתות נוסף`,
          }, { status: 429 });
        }
      }
    }

    // Fetch fresh user data for credits check
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const userData = users[0];
    const currentCredits = userData?.worker_credits ?? 0;

    if (currentCredits < BOOST_COST) {
      return Response.json({
        error: 'insufficient_credits',
        credits_required: BOOST_COST,
        credits_available: currentCredits,
      }, { status: 403 });
    }

    const newBalance = currentCredits - BOOST_COST;

    // Deduct credits + update task boost metadata in parallel
    await Promise.all([
      base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance }),
      base44.asServiceRole.entities.Task.update(taskId, {
        last_boost_at: new Date().toISOString(),
        boost_count: (task.boost_count || 0) + 1,
      }),
      base44.asServiceRole.entities.CreditTransaction.create({
        user_id: user.id,
        amount: -BOOST_COST,
        type: 'Application_Fee',
        task_id: taskId,
        task_title: task.title,
        balance_after: newBalance,
        note: `Boost — איתות נוסף למשימה "${task.title}"`,
      }),
    ]);

    console.log(`✅ Boost applied to task ${taskId} by user ${user.id} (${BOOST_COST} credits)`);
    return Response.json({ success: true, credits_remaining: newBalance });

  } catch (error) {
    console.error('❌ boostTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});