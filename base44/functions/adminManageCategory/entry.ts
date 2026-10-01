import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * adminManageCategory — Brand Manager → Categories. Platform Admin only.
 *
 * BrandCategory ONLY records which GLOBAL categories this Brand offers, in what
 * order, and an optional display label/icon override.
 *
 * The category definition and its TASK FORM are global (GlobalCategory) and are
 * deliberately NOT duplicated per Brand: improving the global form improves it
 * for every Brand that offers the category.
 *
 * Actions: enable | disable | toggle | bulk_toggle | reorder | set_label | remove | sync_global
 */

const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

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

    const rowFor = (key: string) => rows.find((r: any) => r.category_key === key);

    /** Materialise a Brand row for a global category the Brand has never seen. */
    const ensureRow = async (key: string) => {
      const existing = rowFor(key);
      if (existing) return existing;
      const globals = await svc.entities.GlobalCategory.filter({ category_key: key });
      if (!globals?.[0]) return null;
      const nextOrder = rows.length
        ? Math.max(...rows.map((r: any) => Number(r.sort_order) || 0)) + 1
        : 0;
      return await svc.entities.BrandCategory.create({
        brand_id: brandId,
        category_key: key,
        label: '',
        icon: '',
        sort_order: nextOrder,
        enabled: true,
      });
    };

    const setEnabled = async (key: string, enabled: boolean) => {
      const row = await ensureRow(key);
      if (!row) return { error: 'category_not_found' };
      const updated = await svc.entities.BrandCategory.update(row.id, { enabled });
      return { category: updated };
    };

    // ── enable / disable / toggle ────────────────────────────────────────────
    if (action === 'enable' || action === 'disable' || action === 'toggle') {
      const key = String(body?.category_key || body?.id || '');
      let enabled;
      if (action === 'toggle') {
        const row = rowFor(key) || rows.find((r: any) => r.id === key);
        if (!row) return Response.json({ error: 'category_not_found' }, { status: 404 });
        enabled = row.enabled === false;
      } else {
        enabled = action === 'enable';
      }
      const key2 = rowFor(key) ? key : (rows.find((r: any) => r.id === key)?.category_key || key);
      const result = await setEnabled(key2, enabled);
      if (result.error) return Response.json({ error: result.error }, { status: 404 });
      return Response.json({ success: true, category: result.category });
    }

    // ── bulk_toggle — enable/disable every global category at once ───────────
    if (action === 'bulk_toggle') {
      const enabled = body?.enabled !== false;
      const globals = (await svc.entities.GlobalCategory.list('sort_order', 500)) || [];
      const targets = globals.filter((g: any) => g.active !== false);
      const updates: any[] = [];
      const creates: any[] = [];

      for (const g of targets) {
        const row = rowFor(g.category_key);
        if (row) {
          if (row.enabled !== enabled) updates.push({ id: row.id, enabled });
        } else if (enabled) {
          creates.push({
            brand_id: brandId,
            category_key: g.category_key,
            label: '',
            icon: '',
            sort_order: Number(g.sort_order) || 0,
            enabled: true,
          });
        }
      }
      if (updates.length) await svc.entities.BrandCategory.bulkUpdate(updates);
      if (creates.length) await svc.entities.BrandCategory.bulkCreate(creates);
      return Response.json({ success: true, updated: updates.length, created: creates.length });
    }

    // ── reorder ──────────────────────────────────────────────────────────────
    if (action === 'reorder') {
      const order = Array.isArray(body?.order) ? body.order : [];
      const updates = order
        .filter((o: any) => o && typeof o.id === 'string')
        .map((o: any, i: number) => ({
          id: o.id,
          sort_order: Number.isFinite(Number(o.sort_order)) ? Number(o.sort_order) : i,
        }));
      if (!updates.length) return Response.json({ error: 'order_required' }, { status: 400 });
      await svc.entities.BrandCategory.bulkUpdate(updates);
      return Response.json({ success: true, updated: updates.length });
    }

    // ── set_label — Brand-facing label / icon override only ──────────────────
    if (action === 'set_label') {
      const key = String(body?.category_key || '');
      const row = await ensureRow(key);
      if (!row) return Response.json({ error: 'category_not_found' }, { status: 404 });
      const patch: Record<string, unknown> = {
        label: str(body?.label, 80) ?? '',
        icon: str(body?.icon, 16) ?? '',
      };
      const updated = await svc.entities.BrandCategory.update(row.id, patch);
      return Response.json({ success: true, category: updated });
    }

    // ── remove — drops this Brand's row; the global category is untouched ────
    if (action === 'remove') {
      const key = String(body?.category_key || body?.id || '');
      const row = rowFor(key) || rows.find((r: any) => r.id === key);
      if (!row) return Response.json({ error: 'category_not_found' }, { status: 404 });

      const inUse = await svc.entities.Task.filter({
        origin_brand_id: brandId,
        category: row.category_key,
      }, '-created_date', 1);
      if (inUse?.length) {
        return Response.json({
          error: 'category_in_use',
          message: 'Tasks already use this category. Disable it instead of removing it.',
        }, { status: 409 });
      }

      await svc.entities.BrandCategory.delete(row.id);
      return Response.json({ success: true });
    }

    // ── sync_global — materialise a row for every active global category ─────
    if (action === 'sync_global') {
      const globals = (await svc.entities.GlobalCategory.list('sort_order', 500)) || [];
      const active = globals.filter((g: any) => g.active !== false);
      const have = new Set(rows.map((r: any) => r.category_key));
      const missing = active.filter((g: any) => !have.has(g.category_key));
      if (!missing.length) return Response.json({ success: true, added: 0 });
      await svc.entities.BrandCategory.bulkCreate(missing.map((g: any, i: number) => ({
        brand_id: brandId,
        category_key: g.category_key,
        label: '',
        icon: '',
        sort_order: rows.length + i,
        enabled: true,
      })));
      return Response.json({ success: true, added: missing.length });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('adminManageCategory error:', error?.message);
    return Response.json({ error: 'category_action_failed', message: error?.message }, { status: 500 });
  }
});