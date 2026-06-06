import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Tracks unique views/clicks per task.
// Dedup is done client-side via localStorage; this function only increments the counter.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { taskId, eventType } = body; // eventType: 'view' | 'click'

    if (!taskId || !['view', 'click'].includes(eventType)) {
      return Response.json({ error: 'missing params' }, { status: 400 });
    }

    const countField = eventType === 'view' ? 'views_count' : 'clicks_count';

    // Fetch current task to increment
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ ok: false, error: 'task not found' });

    const newCount = (task[countField] || 0) + 1;
    await base44.asServiceRole.entities.Task.update(taskId, { [countField]: newCount });

    return Response.json({ ok: true, [countField]: newCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});