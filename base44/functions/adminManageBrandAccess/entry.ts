import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * adminManageBrandAccess — grant, list and revoke a Brand's dashboard access.
 *
 * Access is an EXPLICIT grant, never inferred from activity. A user who happens
 * to create a task or apply on a Brand becomes a `member` — that is what
 * BrandMembership already records — but only a `brand_admin` may open that
 * Brand's dashboard. Both roles live on the SAME record, so a person has exactly
 * one membership per Brand whatever their history.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden', message: 'Platform admin only' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'list');
    const brandId = String(body?.brand_id || '');

    if (action === 'list') {
      if (!brandId) return Response.json({ error: 'brand_id_required' }, { status: 400 });

      const rows = await svc.entities.BrandMembership.filter({ brand_id: brandId }, '-created_date', 200);
      const grants = (rows || []).filter((m: any) => m.role === 'brand_admin');

      const ids = [...new Set(grants.map((m: any) => m.user_id))].filter(Boolean) as string[];
      const userMap: Record<string, any> = {};
      if (ids.length) {
        const users = await svc.entities.User.filter({ id: { $in: ids } });
        for (const u of (users || [])) userMap[u.id] = u;
      }

      return Response.json({
        success: true,
        grants: grants.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          name: userMap[m.user_id]?.full_name || '',
          email: userMap[m.user_id]?.email || '',
          status: m.status || 'active',
          granted_at: m.updated_date || m.created_date,
        })),
      });
    }

    if (action === 'grant') {
      const email = String(body?.email || '').trim().toLowerCase();
      if (!brandId || !email) return Response.json({ error: 'email_required' }, { status: 400 });

      const users = await svc.entities.User.filter({ email });
      const target = users?.[0];
      if (!target) {
        return Response.json(
          { error: 'user_not_found', message: 'לא נמצא משתמש עם כתובת זו' },
          { status: 404 },
        );
      }

      const existing = await svc.entities.BrandMembership.filter({ brand_id: brandId, user_id: target.id });
      const current = existing?.[0];

      if (current) {
        // Already a member (or previously revoked) — promote in place.
        await svc.entities.BrandMembership.update(current.id, { role: 'brand_admin', status: 'active' });
      } else {
        await svc.entities.BrandMembership.create({
          user_id: target.id,
          brand_id: brandId,
          role: 'brand_admin',
          status: 'active',
          joined_at: new Date().toISOString(),
          first_action: 'dashboard_grant',
        });
      }

      return Response.json({
        success: true,
        user_id: target.id,
        name: target.full_name || '',
        email: target.email || '',
      });
    }

    if (action === 'revoke') {
      const membershipId = String(body?.membership_id || '');
      if (!membershipId) return Response.json({ error: 'membership_id_required' }, { status: 400 });

      const rows = await svc.entities.BrandMembership.filter({ id: membershipId });
      const row = rows?.[0];
      if (!row) return Response.json({ error: 'not_found' }, { status: 404 });

      // Demote rather than delete: the person's real history on this Brand is
      // genuine attribution and must survive losing dashboard access.
      await svc.entities.BrandMembership.update(membershipId, { role: 'member' });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('adminManageBrandAccess error:', error?.message);
    return Response.json({ error: 'access_failed', message: error?.message }, { status: 500 });
  }
});