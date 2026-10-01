import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  PLATFORM_CATEGORY_KEYS, PLATFORM_CATEGORY_SEED, KEY_RE, sanitizeFields, getGlobalCategories,
} from '../../shared/globalCategories.ts';

/**
 * adminManageGlobalCategory — Platform Admin → Categories. Platform Admin only.
 *
 * Manages the GLOBAL category catalogue and the GLOBAL task form of each
 * category. One definition, consumed by every Brand that offers the category —
 * improving a form here improves it everywhere.
 *
 * A Brand never owns a form copy: BrandCategory only says whether a Brand
 * offers a category (see adminManageCategory).
 *
 * Actions: seed | upsert | toggle | reorder | remove
 */

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

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

    const rows = await getGlobalCategories(base44);

    // ── seed — create a row for every platform key that has none ─────────────
    if (action === 'seed') {
      const have = new Set(rows.map((r: any) => r.category_key));
      const missing = PLATFORM_CATEGORY_KEYS.filter((k) => !have.has(k));
      if (!missing.length) return Response.json({ success: true, added: 0 });
      const created = await svc.entities.GlobalCategory.bulkCreate(
        missing.map((k, i) => {
          const seed = PLATFORM_CATEGORY_SEED.find((s) => s.key === k);
          return {
            category_key: k,
            label: seed?.label || '',
            icon: seed?.icon || '',
            description: '',
            sort_order: PLATFORM_CATEGORY_KEYS.indexOf(k) >= 0 ? PLATFORM_CATEGORY_KEYS.indexOf(k) : rows.length + i,
            active: true,
            fields: [],
          };
        }),
      );
      return Response.json({ success: true, added: (created || []).length });
    }

    // ── upsert ───────────────────────────────────────────────────────────────
    if (action === 'upsert') {
      const key = String(body?.category_key || '').trim().toLowerCase();
      if (!KEY_RE.test(key)) return Response.json({ error: 'category_key_invalid' }, { status: 400 });

      const clash = rows.find((r: any) => r.category_key === key && r.id !== body?.id);
      if (clash) return Response.json({ error: 'category_key_taken' }, { status: 409 });

      const patch: Record<string, unknown> = {
        category_key: key,
        label: str(body?.label, 80) ?? '',
        icon: str(body?.icon, 16) ?? '',
        description: str(body?.description, 240) ?? '',
        active: body?.active !== false,
      };
      if (Number.isFinite(Number(body?.sort_order))) patch.sort_order = Number(body.sort_order);
      if (body?.fields !== undefined) patch.fields = sanitizeFields(body.fields);

      if (body?.id) {
        const target = rows.find((r: any) => r.id === body.id);
        if (!target) return Response.json({ error: 'category_not_found' }, { status: 404 });
        const updated = await svc.entities.GlobalCategory.update(body.id, patch);
        return Response.json({ success: true, category: updated });
      }

      const nextOrder = rows.length
        ? Math.max(...rows.map((r: any) => Number(r.sort_order) || 0)) + 1
        : 0;
      const created = await svc.entities.GlobalCategory.create({
        sort_order: nextOrder,
        ...patch,
      });
      return Response.json({ success: true, category: created });
    }

    const id = String(body?.id || '');
    const target = rows.find((r: any) => r.id === id);
    if (!target) return Response.json({ error: 'category_not_found' }, { status: 404 });

    // ── toggle ───────────────────────────────────────────────────────────────
    if (action === 'toggle') {
      const updated = await svc.entities.GlobalCategory.update(target.id, { active: target.active === false });
      return Response.json({ success: true, category: updated });
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
      await svc.entities.GlobalCategory.bulkUpdate(updates);
      return Response.json({ success: true, updated: updates.length });
    }

    // ── remove — refuses while any Brand still offers the category ───────────
    if (action === 'remove') {
      const refs = await svc.entities.BrandCategory.filter({ category_key: target.category_key }, 'created_date', 200);
      if (refs?.length) {
        return Response.json({
          error: 'category_in_use',
          brands: refs.length,
          message: 'Brands still offer this category. Disable it instead, or remove it from those Brands first.',
        }, { status: 409 });
      }
      await svc.entities.GlobalCategory.delete(target.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('adminManageGlobalCategory error:', error?.message);
    return Response.json({ error: 'category_action_failed', message: error?.message }, { status: 500 });
  }
});