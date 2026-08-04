import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * linkReferralDevice — Link a device_id to the authenticated user.
 *
 * Called on user login/registration. Updates all ReferralEvent records
 * for this device_id with the user's details, marking them as registered.
 * This connects "downloads" (pre-registration) to actual user accounts.
 */

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { device_id } = body;

    if (!device_id) return Response.json({ success: true, linked: 0 });

    // Find all ReferralEvents for this device that aren't yet linked
    const events = await base44.asServiceRole.entities.ReferralEvent.filter({
      device_id,
      registered: false,
    }, '-created_date', 50);

    if (events.length === 0) {
      return Response.json({ success: true, linked: 0 });
    }

    // Link all events to this user
    for (const evt of events) {
      await base44.asServiceRole.entities.ReferralEvent.update(evt.id, {
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.full_name || '',
        registered: true,
      });
    }

    // ── Notify each unique agent that a new user registered via their link ──
    const agentCodes = [...new Set(events.map(e => e.agent_code).filter(Boolean))];
    for (const code of agentCodes) {
      try {
        const agents = await base44.asServiceRole.entities.User.filter({ agent_code: code }, '-created_date', 1);
        if (agents.length === 0) continue;
        const agent = agents[0];
        const regName = user.full_name || 'משתמש חדש';
        await base44.asServiceRole.functions.invoke('sendPushNotification', {
          user_ids: [agent.id],
          title: 'הרשמה חדשה דרך הקישור שלך! 🎉',
          body: `${regName} נרשם ל-Joba24 באמצעות הקישור שלך. תן לו יד! 🤝`,
          url: '/agent-dashboard',
          tag: `agent_referral_register_${user.id}`,
        });
        console.log(`linkReferralDevice: notified agent ${agent.id} (code=${code}) about new registration ${user.id}`);
      } catch (e) {
        console.error(`linkReferralDevice: failed to notify agent ${code}:`, e);
      }
    }

    console.log(`linkReferralDevice: linked ${events.length} events to user ${user.id}`);
    return Response.json({ success: true, linked: events.length });
  } catch (error) {
    console.error('linkReferralDevice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}