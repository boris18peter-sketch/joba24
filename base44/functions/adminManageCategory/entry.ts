import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * adminManageCategory — Brand Manager → Categories. Platform Admin only.
 *
 * BrandCategory is the AUTHORITATIVE source for the categories a Brand offers.
 *
 * A `category_key` is either one of the platform Task.category values, or a
 * BRAND-SPECIFIC key. The Task.category enum is fixed and must never be extended
 * per Brand, so a brand-specific category is persisted on a Task as
 * `category: 'other'` with the brand key kept in `category_details.brand_category_key`.
 *
 * Actions: upsert | toggle | reorder | remove | sync_platform
 */

const PLATFORM_KEYS = [
  'plumbing', 'electricity', 'handyman', 'cleaning', 'moving', 'heavy_lifting',
  'painting', 'carpentry', 'ac', 'locksmith', 'gardening', 'home_maintenance',
  'car', 'transportation', 'delivery', 'shopping', 'pets', 'babysitting',
  'elderly_care', 'tutoring', 'fitness', 'photography', 'events',
  'personal_help', 'it_support', 'other',
];
const KEY_RE = /^[a-z][a-z0-9_]{1,30}$/;
const FIELD_TYPES = ['text', 'number', 'select', 'multiselect', 'boolean', 'date', 'time', 'textarea'];

/** Keep a form_config to the supported, practical shape. */
function sanitizeFormConfig(raw: unknown) {
  if (!raw || typeof raw !== 'object') return undefined;
  const fields = Array.isArray((raw as any).fields) ? (raw as any).fields : [];
  const clean = fields
    .filter((f: any) => f && typeof f.key === 'string' && KEY_RE.test(f.key))
    .slice(0, 20)
    .map((f: any, i: number) => ({
      key: f.key,
      label: String(f.label || f.key).slice(0, 80),
      type: FIELD_TYPES.includes(f.type) ? f.type : 'text',
      required: f.required === true,
      enabled: f.enabled !== false,
      order: Number.isFinite(Number(f.order)) ? Number(f.order) : i,
      options: Array.isArray(f.options)
        ? f.options.map((o: any) => String(o).slice(0, 60)).filter(Boolean).slice(0, 20)
        : [],
    }))
    .sort((a: any, b: any) => a.order - b.order);
  return { fields: clean };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'forbidden', message: 'Platform admin only' }, { status: 403 });
    }
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const action = String(body?.action || '');
    const brandId = String(body?.brand_id || '');
    if (!brandId) return Response.json({ error: 'brand_id_required' }, { status: 400 });

    const brands = await svc.entities.Brand.filter({ id: brandId });
    if (!brands?.[0]) return Response.json({ error: 'brand_not_found' }, { status: 404 });

    const rows = (await svc.entities.BrandCategory.filter({ brand_id: brandId }, 'sort_order', 300)) || [];

    // ── upsert ───────────────────────────────────────────────────────────────
    if (action === 'upsert') {
      const key = String(body?.category_key || '').trim().toLowerCase();
      if (!KEY_RE.test(key)) return Response.json({ error: 'category_key_invalid' }, { status: 400 });

      const clash = rows.find((r: any) => r.category_key === key && r.id !== body?.id);
      if (clash) return Response.json({ error: 'category_key_taken' }, { status: 409 });

      const formConfig = sanitizeFormConfig(body?.form_config);

      const patch: Record<string, unknown> = {
        category_key: key,
        label: typeof body?.label === 'string' ? body.label.trim().slice(0, 80) : '',
        icon: typeof body?.icon === 'string' ? body.icon.trim().slice(0, 16) : '',
        enabled: body?.enabled !== false,
      };
      if (Number.isFinite(Number(body?.sort_order))) patch.sort_order = Number(body.sort_order);
      if (formConfig !== undefined) patch.form_config = formConfig;

      if (body?.id) {
        const target = rows.find((r: any) => r.id === body.id);
        if (!target) return Response.json({ error: 'category_not_found' }, { status: 404 });
        const updated = await svc.entities.BrandCategory.update(body.id, patch);
        return Response.json({ success: true, category: updated });
      }

      const nextOrder = rows.length
        ? Math.max(...rows.map((r: any) => Number(r.sort_order) || 0)) + 1
        : 0;
      const created = await svc.entities.BrandCategory.create({
        brand_id: brandId,
        sort_order: nextOrder,
        ...patch,
      });
      return Response.json({ success: true, category: created });
    }

    // ── toggle ───────────────────────────────────────────────────────────────
    if (action === 'toggle') {
      const target = rows.find((r: any) => r.id === body?.id);
      if (!target) return Response.json({ error: 'category_not_found' }, { status: 404 });
      const updated = await svc.entities.BrandCategory.update(target.id, { enabled: target.enabled === false });
      return Response.json({ success: true, category: updated });
    }

    // ── reorder ──────────────────────────────────────────────────────────────
    if (action === 'reorder') {
      const order = Array.isArray(body?.order) ? body.order : [];
      const updates = order
        .filter((o: any) => o && typeof o.id === 'string')
        .map((o: any, i: number) => ({ id: o.id, sort_order: Number.isFinite(Number(o.sort_order)) ? Number(o.sort_order) : i }));
      if (!updates.length) return Response.json({ error: 'order_required' }, { status: 400 });
      await svc.entities.BrandCategory.bulkUpdate(updates);
      return Response.json({ success: true, updated: updates.length });
    }

    // ── remove (refuses while the category is in use on a Task) ──────────────
    if (action === 'remove') {
      const target = rows.find((r: any) => r.id === body?.id);
      if (!target) return Response.json({ error: 'category_not_found' }, { status: 404 });

      const inUse = await svc.entities.Task.filter({
        origin_brand_id: brandId,
        category: PLATFORM_KEYS.includes(target.category_key) ? target.category_key : 'other',
      }, '-created_date', 1);
      if (inUse?.length) {
        return Response.json({
          error: 'category_in_use',
          message: 'Tasks already use this category. Disable it instead of deleting it.',
        }, { status: 409 });
      }

      await svc.entities.BrandCategory.delete(target.id);
      return Response.json({ success: true });
    }

    // ── sync_platform — copy any platform category this Brand is missing ─────
    if (action === 'sync_platform') {
      const defaults = await svc.entities.Brand.filter({ is_default: true });
      const parent = defaults?.[0];
      if (!parent) return Response.json({ error: 'platform_brand_missing' }, { status: 500 });

      const parentRows = (await svc.entities.BrandCategory.filter({ brand_id: parent.id }, 'sort_order', 300)) || [];
      const have = new Set(rows.map((r: any) => r.category_key));
      const missing = parentRows.filter((p: any) => !have.has(p.category_key));
      if (!missing.length) return Response.json({ success: true, added: 0 });

      await svc.entities.BrandCategory.bulkCreate(missing.map((p: any, i: number) => ({
        brand_id: brandId,
        category_key: p.category_key,
        label: p.label || '',
        icon: p.icon || '',
        sort_order: rows.length + i,
        enabled: true,
        form_config: {},
      })));
      return Response.json({ success: true, added: missing.length });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('adminManageCategory error:', error?.message);
    return Response.json({ error: 'category_action_failed', message: error?.message }, { status: 500 });
  }
});