import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role to fetch tasks publicly (no auth required from caller)
    const tasks = await base44.asServiceRole.entities.Task.filter(
      { status: 'OPEN' },
      '-created_date',
      200
    );

    return Response.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('getOpenTasks error:', error?.message, JSON.stringify(error?.data || {}));
    return Response.json({ error: error.message, tasks: [] }, { status: 500 });
  }
});