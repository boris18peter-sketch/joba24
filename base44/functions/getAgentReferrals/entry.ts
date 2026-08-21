import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * getAgentReferrals — Fetch agent dashboard data including referral events (downloads).
 *
 * Returns:
 *   - users: registered users referred by this agent
 *   - referralEvents: all ReferralEvent records (downloads + registrations)
 *   - workerTasks, clientTasks: completed tasks by referred users
 *   - referral_clicks: total link clicks
 *   - totalCreditsUsed: credits spent by referred users
 */

export default async function(req) {
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

    // Service-role query: agents can't list other users directly (built-in security)
    const referredUsers = await base44.asServiceRole.entities.User.filter({
      referred_by_agent_code: user.agent_code,
    }, '-created_date', 200);

    // Fetch all ReferralEvents for this agent (downloads + registrations)
    const referralEvents = await base44.asServiceRole.entities.ReferralEvent.filter({
      agent_code: user.agent_code,
    }, '-created_date', 500);

    const userIds = referredUsers.map((u) => u.id);
    let workerTasks = [];
    let clientTasks = [];
    let totalCreditsUsed = 0;
    const creditsUsedByUser = {};

    if (userIds.length > 0) {
      workerTasks = await base44.asServiceRole.entities.Task.filter({
        worker_id: { $in: userIds },
        status: 'COMPLETED',
      }, '-completed_at', 200);

      clientTasks = await base44.asServiceRole.entities.Task.filter({
        client_id: { $in: userIds },
        status: 'COMPLETED',
      }, '-completed_at', 200);

      const creditTxs = await base44.asServiceRole.entities.CreditTransaction.filter({
        user_id: { $in: userIds },
      }, '-created_date', 500);

      // Build per-user credits spent from the same transactions (no extra query)
      creditTxs.forEach((tx) => {
        if (tx.amount < 0) {
          creditsUsedByUser[tx.user_id] = (creditsUsedByUser[tx.user_id] || 0) + Math.abs(tx.amount);
        }
      });
      totalCreditsUsed = creditTxs
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    }

    return Response.json({
      users: referredUsers,
      referralEvents,
      workerTasks,
      clientTasks,
      commissionRate: user.commission_rate || 0,
      referral_clicks,
      totalCreditsUsed,
      creditsUsedByUser,
    });
  } catch (error) {
    console.error('getAgentReferrals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}