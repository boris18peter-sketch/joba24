import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * linkReferralDevice — Link a device_id to the authenticated user.
 *
 * FIRST-TOUCH ATTRIBUTION (critical for agent commissions):
 * A user is permanently attributed to the FIRST agent whose link they clicked.
 * This can NEVER be changed — even if the user later clicks another agent's link.
 *
 * Logic:
 * 1. Find ALL ReferralEvents for this device (sorted oldest first)
 * 2. Determine the attributed agent:
 *    a. If user already has referred_by_agent_code → use that (immutable)
 *    b. Otherwise → use the OLDEST event's agent_code (first-touch)
 *       and set it permanently on the user
 * 3. Only link events from the ATTRIBUTED agent (not all agents)
 * 4. Only notify the ATTRIBUTED agent (not all agents who had events)
 *
 * This prevents the bug where multiple agents get "new registration" notifications
 * for the same user, inflating counts vs actual attribution.
 */

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { device_id } = body;

    if (!device_id) return Response.json({ success: true, linked: 0 });

    // Fetch ALL events for this device (sorted OLDEST first — first-touch wins)
    const allDeviceEvents = await base44.asServiceRole.entities.ReferralEvent.filter({
      device_id,
    }, 'created_date', 50);

    if (allDeviceEvents.length === 0) {
      return Response.json({ success: true, linked: 0 });
    }

    // Re-fetch the user via service role to get the CURRENT referred_by_agent_code
    // (the AuthContext may have just set it, but we need the freshest value)
    const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const freshUser = freshUsers[0] || user;

    // ── Determine the ATTRIBUTED agent (first-touch, immutable) ──
    let attributedAgentCode = freshUser.referred_by_agent_code;

    if (!attributedAgentCode) {
      // No attribution yet — use the OLDEST event's agent_code (first-touch)
      // allDeviceEvents is sorted by created_date ascending (oldest first)
      attributedAgentCode = allDeviceEvents[0]?.agent_code;
      if (attributedAgentCode) {
        // Set it permanently on the user (immutable — this is the ONLY time it's set)
        await base44.asServiceRole.entities.User.update(user.id, {
          referred_by_agent_code: attributedAgentCode,
        });
        console.log(`linkReferralDevice: set first-touch attribution user=${user.id} agent=${attributedAgentCode}`);
      }
    }

    // ── Only link events from the ATTRIBUTED agent (not all agents) ──
    const eventsToLink = allDeviceEvents.filter(e =>
      e.agent_code === attributedAgentCode && !e.registered
    );

    for (const evt of eventsToLink) {
      await base44.asServiceRole.entities.ReferralEvent.update(evt.id, {
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.full_name || '',
        registered: true,
      });
    }

    // ── Only notify the ATTRIBUTED agent (not all agents who had events) ──
    if (attributedAgentCode && eventsToLink.length > 0) {
      try {
        const agents = await base44.asServiceRole.entities.User.filter({
          agent_code: attributedAgentCode,
        }, '-created_date', 1);
        if (agents.length > 0) {
          const agent = agents[0];
          const regName = user.full_name || 'משתמש חדש';
          await base44.asServiceRole.functions.invoke('sendPushNotification', {
            user_ids: [agent.id],
            title: 'הרשמה חדשה דרך הקישור שלך! 🎉',
            body: `${regName} נרשם ל-Joba24 באמצעות הקישור שלך. תן לו יד! 🤝`,
            url: '/agent-dashboard',
            tag: `agent_referral_register_${user.id}`,
          });
          console.log(`linkReferralDevice: notified agent ${agent.id} (code=${attributedAgentCode}) about new registration ${user.id}`);
        }
      } catch (e) {
        console.error(`linkReferralDevice: failed to notify agent ${attributedAgentCode}:`, e);
      }
    }

    // ── Notify all admins about the new registration ──
    try {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 10);
      const adminIds = admins.filter(a => a.fcm_tokens?.length > 0).map(a => a.id);
      if (adminIds.length > 0) {
        const regName = user.full_name || 'משתמש חדש';
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          user_ids: adminIds,
          title: 'הרשמה חדשה ל-Joba24! 🎉',
          body: `${regName} נרשם${attributedAgentCode ? ` דרך סוכן ${attributedAgentCode}` : ''}.`,
          url: '/admin',
          tag: `admin_new_register_${user.id}`,
        });
      }
    } catch (e) {
      console.error('linkReferralDevice: failed to notify admins:', e);
    }

    console.log(`linkReferralDevice: linked ${eventsToLink.length} events to user ${user.id} (agent=${attributedAgentCode})`);
    return Response.json({ success: true, linked: eventsToLink.length, attributed_agent: attributedAgentCode });
  } catch (error) {
    console.error('linkReferralDevice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}