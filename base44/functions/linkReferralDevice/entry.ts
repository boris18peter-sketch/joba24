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

    console.log(`linkReferralDevice: linked ${events.length} events to user ${user.id}`);
    return Response.json({ success: true, linked: events.length });
  } catch (error) {
    console.error('linkReferralDevice error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}