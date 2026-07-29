import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * trackReferralClick — Track referral link clicks AND app downloads/installs.
 *
 * - count_click=true: increments referral_clicks counter (called once per session, client-controlled)
 * - device_id: creates a ReferralEvent record (idempotent per device) to track the download
 *   even before the user registers. This lets us attribute app opens to agents.
 */

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { agent_code, device_id, count_click } = body;

    if (!agent_code) return Response.json({ error: 'Missing agent_code' }, { status: 400 });

    // Increment click counter only when explicitly requested (once per session, client-side)
    // Can't use updateMany on User (restricted) — fetch then update individually
    if (count_click) {
      const agents = await base44.asServiceRole.entities.User.filter({ agent_code }, '-created_date', 1);
      if (agents.length > 0) {
        const agent = agents[0];
        await base44.asServiceRole.entities.User.update(agent.id, {
          referral_clicks: (agent.referral_clicks || 0) + 1,
        });
      }
    }

    // Create a ReferralEvent for this device (idempotent — only if not already exists)
    if (device_id) {
      const existing = await base44.asServiceRole.entities.ReferralEvent.filter({
        agent_code,
        device_id,
      }, '-created_date', 1);

      if (existing.length === 0) {
        await base44.asServiceRole.entities.ReferralEvent.create({
          agent_code,
          device_id,
          event_type: 'download',
          registered: false,
        });
        console.log(`trackReferralClick: created ReferralEvent for agent=${agent_code} device=${device_id}`);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('trackReferralClick error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}