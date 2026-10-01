import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * adminBrandLifecycle — Brand Manager → Danger Zone. Platform Admin only.
 *
 * `dependencies` inspects every Brand-attributed record so the Admin can see
 * what a Brand actually owns BEFORE deciding.
 *
 * Safety rules:
 *  • The canonical Joba24 Brand can never be suspended, archived or deleted.
 *  • ARCHIVE is the soft delete: it takes the Brand offline and PRESERVES every
 *    Task, application, payment, chat, review and membership. It is the correct
 *    action for a Brand with real marketplace or financial history.
 *  • HARD DELETE is refused unless the Brand owns no marketplace or financial
 *    history at all — an unused/empty Brand. This is what stops a delete from
 *    orphaning Tasks, credits or conversations.
 *  • Deletion requires the Brand slug as explicit confirmation.
 */

const COUNTED = [
  { entity: 'Task', field: 'origin_brand_id', label: 'משימות' },
  { entity: 'TaskApplication', field: 'surface_brand_id', label: 'בקשות' },
  { entity: 'Review', field: 'surface_brand_id', label: 'דירוגים' },
  { entity: 'CreditTransaction', field: 'brand_id', label: 'תנועות ג׳ובות' },
  { entity: 'ChatMessage', field: 'surface_brand_id', label: 'הודעות צ׳אט' },
  { entity: 'NotificationLog', field: 'surface_brand_id', label: 'התראות' },
  { entity: 'SupportMessage', field: 'surface_brand_id', label: 'פניות תמיכה' },
  { entity: 'ReferralEvent', field: 'brand_id', label: 'אירועי הפניה' },
  { entity: 'BrandMembership', field: 'brand_id', label: 'חברויות' },
];

/** Records that make a Brand unsafe to hard-delete. */
const HISTORY_ENTITIES = new Set([
  'Task', 'TaskApplication', 'Review', 'CreditTransaction',
  'ChatMessage', 'NotificationLog', 'SupportMessage', 'ReferralEvent',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden', message: 'Platform admin only' }, { status: 403 });
    }
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const action = String(body?.action || 'dependencies');
    const brandId = String(body?.brand_id || '');
    if (!brandId) return Response.json({ error: 'brand_id_required' }, { status: 400 });

    const brands = await svc.entities.Brand.filter({ id: brandId });
    const brand = brands?.[0];
    if (!brand) return Response.json({ error: 'brand_not_found' }, { status: 404 });

    // ── Inspect ──────────────────────────────────────────────────────────────
    const counts: any[] = [];
    let historyTotal = 0;
    for (const spec of COUNTED) {
      const rows = await svc.entities[spec.entity].filter({ [spec.field]: brandId }, '-created_date', 200);
      const count = (rows || []).length;
      const hasHistory = HISTORY_ENTITIES.has(spec.entity);
      if (hasHistory) historyTotal += count;
      counts.push({
        entity: spec.entity,
        label: spec.label,
        count,
        capped: count === 200,
        blocking: hasHistory,
      });
    }

    const domains = (await svc.entities.BrandDomain.filter({ brand_id: brandId }, 'created_date', 100)) || [];
    const configs = (await svc.entities.BrandConfig.filter({ brand_id: brandId })) || [];
    const categories = (await svc.entities.BrandCategory.filter({ brand_id: brandId }, 'sort_order', 300)) || [];

    const deps = {
      counts,
      domains: domains.length,
      configs: configs.length,
      categories: categories.length,
      history_total: historyTotal,
      safe_to_delete: historyTotal === 0 && !brand.is_default,
      is_default: brand.is_default === true,
      status: brand.status,
    };

    if (action === 'dependencies') {
      return Response.json({ success: true, dependencies: deps });
    }

    // ── Destructive actions ──────────────────────────────────────────────────
    if (brand.is_default) {
      return Response.json({ error: 'protected_default_brand' }, { status: 400 });
    }

    if (action === 'suspend') {
      const updated = await svc.entities.Brand.update(brandId, { status: 'suspended' });
      return Response.json({ success: true, brand: updated });
    }

    if (action === 'activate') {
      const updated = await svc.entities.Brand.update(brandId, { status: 'active' });
      return Response.json({ success: true, brand: updated });
    }

    if (action === 'archive') {
      const updated = await svc.entities.Brand.update(brandId, { status: 'archived' });
      return Response.json({ success: true, brand: updated });
    }

    if (action === 'delete') {
      if (String(body?.confirm || '') !== brand.slug) {
        return Response.json({ error: 'confirmation_required', expected: brand.slug }, { status: 400 });
      }
      if (historyTotal > 0) {
        return Response.json({
          error: 'brand_has_history',
          history_total: historyTotal,
          message: 'This Brand owns marketplace or financial history. Archive it instead.',
        }, { status: 409 });
      }

      for (const row of categories) await svc.entities.BrandCategory.delete(row.id);
      for (const row of configs) await svc.entities.BrandConfig.delete(row.id);
      for (const row of domains) await svc.entities.BrandDomain.delete(row.id);
      await svc.entities.Brand.delete(brandId);
      return Response.json({ success: true, deleted: true });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('adminBrandLifecycle error:', error?.message);
    return Response.json({ error: 'lifecycle_failed', message: error?.message }, { status: 500 });
  }
});