import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getJobaSettings } from '../../shared/jobaSettings.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the CURRENT is_approved value from the database (not the stale JWT)
    const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const freshUser = freshUsers[0];
    if (!freshUser) return Response.json({ error: 'User not found' }, { status: 404 });

    const settings = await getJobaSettings(base44);
    return Response.json({
      is_approved: freshUser.is_approved ?? false,
      is_blocked: freshUser.is_blocked ?? false,
      role: freshUser.role ?? 'user',
      worker_credits: freshUser.worker_credits,
      pre_launch_gate_active: settings.pre_launch_gate_active !== false,
    });
  } catch (error) {
    console.error('❌ checkApprovalStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});