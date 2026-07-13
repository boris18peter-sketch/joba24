import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * deductStoryCredits — Deducts 10 credits for a Story task publication.
 * Called after task creation succeeds. Idempotent: only charges once per task.
 */
const STORY_COST = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, taskTitle } = await req.json();
    if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });

    // Idempotency: check if we already charged for this task
    const existing = await base44.asServiceRole.entities.CreditTransaction.filter({
      user_id: user.id,
      task_id: taskId,
      type: 'Story_Publication',
    });
    if (existing.some(tx => tx.note?.includes('סטורי'))) {
      return Response.json({ success: true, note: 'Already charged' });
    }

    // Fetch fresh credits
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const freshUser = users[0];
    const currentCredits = freshUser?.worker_credits ?? 0;

    if (currentCredits < STORY_COST) {
      return Response.json({ error: 'insufficient_credits', credits_available: currentCredits }, { status: 403 });
    }

    const newBalance = currentCredits - STORY_COST;
    await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: user.id,
      amount: -STORY_COST,
      type: 'Story_Publication',
      task_id: taskId,
      task_title: taskTitle || '',
      balance_after: newBalance,
      note: `עלות פרסום סטורי: ${taskTitle || 'משימה'}`,
    });

    console.log(`✅ Story credits deducted for user ${user.id}, task ${taskId}`);
    return Response.json({ success: true, credits_remaining: newBalance });

  } catch (error) {
    console.error('❌ deductStoryCredits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});