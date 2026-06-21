import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'agent' || !user.agent_code) {
      return Response.json({ error: 'Not an agent' }, { status: 403 });
    }

    // Service-role query: agents can't list other users directly (built-in security),
    // so we elevate to service role after verifying the caller is a legitimate agent.
    const referredUsers = await base44.asServiceRole.entities.User.filter({
      referred_by_agent_code: user.agent_code,
    }, '-created_date', 200);

    const userIds = referredUsers.map((u) => u.id);
    let workerTasks = [];
    let clientTasks = [];

    if (userIds.length > 0) {
      const workerResults = await Promise.all(
        userIds.map((wid) =>
          base44.asServiceRole.entities.Task.filter({ worker_id: wid, status: 'COMPLETED' }, '-completed_at', 100)
        ),
      );
      workerTasks = workerResults.flat();

      const clientResults = await Promise.all(
        userIds.map((cid) =>
          base44.asServiceRole.entities.Task.filter({ client_id: cid, status: 'COMPLETED' }, '-completed_at', 100)
        ),
      );
      clientTasks = clientResults.flat();
    }

    return Response.json({
      users: referredUsers,
      workerTasks,
      clientTasks,
      commissionRate: user.commission_rate || 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});