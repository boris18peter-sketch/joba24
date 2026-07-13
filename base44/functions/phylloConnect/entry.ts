import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const PHYLLO_BASE_URL = 'https://api.staging.getphyllo.com/v1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('PHYLLO_CLIENT_ID');
    const clientSecret = Deno.env.get('PHYLLO_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Phyllo credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${clientId}:${clientSecret}`);

    // Use existing Phyllo user ID or create a new one
    let phylloUserId = user.phyllo_user_id;

    if (!phylloUserId) {
      const userRes = await fetch(`${PHYLLO_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.full_name || user.email || 'Joba24 User',
          external_id: user.id,
        }),
      });

      if (!userRes.ok) {
        const errText = await userRes.text();
        return Response.json({ error: `Phyllo user creation failed: ${errText}` }, { status: 502 });
      }

      const userData = await userRes.json();
      phylloUserId = userData.id;

      // Persist the Phyllo user ID so we can reuse it next time
      await base44.auth.updateMe({ phyllo_user_id: phylloUserId });
    }

    // Create a fresh SDK token (tokens are short-lived)
    const tokenRes = await fetch(`${PHYLLO_BASE_URL}/sdk-tokens`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: phylloUserId,
        products: [
          'IDENTITY',
          'IDENTITY.AUDIENCE',
          'ENGAGEMENT',
          'ENGAGEMENT.AUDIENCE',
          'INCOME',
          'ACTIVITY',
        ],
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return Response.json({ error: `Phyllo SDK token creation failed: ${errText}` }, { status: 502 });
    }

    const tokenData = await tokenRes.json();

    return Response.json({
      user_id: phylloUserId,
      token: tokenData.sdk_token,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});