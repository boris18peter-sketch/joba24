import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public endpoint — no auth required, service role fetches open tasks for everyone
    const tasks = await base44.asServiceRole.entities.Task.list('-created_date', 100);
    const openTasks = tasks.filter(t => t.status === 'OPEN');

    return Response.json({ tasks: openTasks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});