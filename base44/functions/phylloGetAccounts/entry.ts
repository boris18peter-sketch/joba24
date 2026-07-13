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
    const phylloUserId = user.phyllo_user_id;

    if (!phylloUserId) {
      return Response.json({ accounts: [], workplatforms: [] });
    }

    // Fetch connected accounts
    const accountsRes = await fetch(`${PHYLLO_BASE_URL}/accounts?user_id=${phylloUserId}`, {
      headers: { 'Authorization': authHeader },
    });

    let accounts = [];
    if (accountsRes.ok) {
      const accountsData = await accountsRes.json();
      accounts = accountsData.data || [];
    }

    // Fetch work platforms (for name/icon mapping)
    const wpRes = await fetch(`${PHYLLO_BASE_URL}/work-platforms`, {
      headers: { 'Authorization': authHeader },
    });

    let workplatforms = [];
    if (wpRes.ok) {
      const wpData = await wpRes.json();
      workplatforms = wpData.data || [];
    }

    // Map workplatform ID → { name, icon }
    const wpMap = {};
    for (const wp of workplatforms) {
      wpMap[wp.id] = { name: wp.name, icon: wp.icon || null };
    }

    // Build result: only connected accounts with platform info
    const connectedAccounts = accounts
      .filter(a => a.status === 'connected')
      .map(a => ({
        account_id: a.id,
        workplatform_id: a.workplatform_id,
        account_name: a.account_name || a.handle || '',
        platform_name: wpMap[a.workplatform_id]?.name || 'רשת חברתית',
        platform_icon: wpMap[a.workplatform_id]?.icon || null,
      }));

    return Response.json({
      accounts: connectedAccounts,
      workplatforms: workplatforms.map(wp => ({ id: wp.id, name: wp.name, icon: wp.icon || null })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});