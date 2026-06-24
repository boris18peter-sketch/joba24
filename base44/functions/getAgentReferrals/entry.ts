import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'agent' || !user.agent_code) {
      return Response.json({ error: 'Not an agent' }, { status: 403 });
    }

    // Fetch the agent's own record (for referral_clicks)
    const agentRecords = await base44.asServiceRole.entities.User.filter({
      agent_code: user.agent_code,
    }, '-created_date', 1);
    const referral_clicks = agentRecords[0]?.referral_clicks || 0;

    // Service-role query: agents can't list other users directly (built-in security),
    // so we elevate to service role after verifying the caller is a legitimate agent.
    const referredUsers = await base44.asServiceRole.entities.User.filter({
      referred_by_agent_code: user.agent_code,
    }, '-created_date', 200);

    const userIds = referredUsers.map((u) => u.id);
    let workerTasks = [];
    let clientTasks = [];
    let totalCreditsUsed = 0;

    if (userIds.length > 0) {
      // Use $in to fetch all tasks in a single query per role (avoids N+1)
      workerTasks = await base44.asServiceRole.entities.Task.filter({
        worker_id: { $in: userIds },
        status: 'COMPLETED',
      }, '-completed_at', 200);

      clientTasks = await base44.asServiceRole.entities.Task.filter({
        client_id: { $in: userIds },
        status: 'COMPLETED',
      }, '-completed_at', 200);

      // Fetch credit transactions for referred users (credits used = negative amounts)
      const creditTxs = await base44.asServiceRole.entities.CreditTransaction.filter({
        user_id: { $in: userIds },
      }, '-created_date', 500);

      totalCreditsUsed = creditTxs
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    }

    return Response.json({
      users: referredUsers,
      workerTasks,
      clientTasks,
      commissionRate: user.commission_rate || 0,
      referral_clicks,
      totalCreditsUsed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});