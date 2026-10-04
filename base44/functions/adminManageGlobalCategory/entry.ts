import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { KEY_RE, sanitizeFields, sanitizeStatusFlow, PLATFORM_CATEGORY_KEYS } from '../../shared/globalCategories.ts';
import { listAll, treeError } from '../../shared/categoryTree.ts';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
    const svc = base44.asServiceRole, body = await req.json(), rows = await listAll(svc.entities.GlobalCategory);
    const target = rows.find(r => r.id === body.id);
    if (body.action === 'upsert') {
      const key = String(body.category_key || '').trim().toLowerCase();
      if (!KEY_RE.test(key)) return Response.json({ error: 'category_key_invalid' }, { status: 400 });
      if (body.id && !target) return Response.json({ error: 'category_not_found' }, { status: 404 });
      if (target && target.category_key !== key) return Response.json({ error: 'key_immutable' }, { status: 409 });
      if (rows.some(r => r.category_key === key && r.id !== body.id)) return Response.json({ error: 'category_key_taken' }, { status: 409 });
      const nodeType = ['group','parent','root','service'].includes(body.node_type) ? body.node_type : 'service';
      if (target && PLATFORM_CATEGORY_KEYS.includes(key) && nodeType === 'parent') return Response.json({ error: 'legacy_key_is_service' }, { status: 409 });
      const patch = { category_key: key, label: String(body.label || '').trim().slice(0,120), icon: String(body.icon || '').slice(0,32), image_url: String(body.image_url || '').slice(0,1000), description: String(body.description || '').slice(0,240), parent_key: String(body.parent_key || ''), node_type: nodeType, active: body.active !== false, sort_order: Number(body.sort_order) || 0 };
      if (!patch.label) return Response.json({ error: 'label_required' }, { status: 400 });
      if (patch.image_url && !/^https:\/\//.test(patch.image_url)) return Response.json({ error: 'image_url_invalid' }, { status: 400 });
      if (nodeType === 'service' && !patch.parent_key) return Response.json({ error: 'parent_required' }, { status: 400 });
      const candidate = [...rows.filter(r => r.id !== body.id), { ...target, ...patch }], error = treeError(candidate);
      if (error) return Response.json({ error }, { status: 409 });
      if (body.fields !== undefined) {
        const fields = sanitizeFields(body.fields);
        if (!Array.isArray(body.fields) || fields.length !== body.fields.length || new Set(fields.map(f => f.key)).size !== fields.length) return Response.json({ error: 'field_keys_invalid' }, { status: 400 });
        if (nodeType === 'parent' && fields.length) return Response.json({ error: 'forms_belong_to_services' }, { status: 400 });
        patch.fields = fields;
      }
      // Category-aware lifecycle PRESENTATION — global, so a category shared by
      // several Brands is defined once. Only label/icon/CTA copy is accepted;
      // the step keys stay canonical. `null` clears it back to the generic flow.
      if (body.status_flow !== undefined) {
        patch.status_flow = sanitizeStatusFlow(body.status_flow);
      }
      const category = target ? await svc.entities.GlobalCategory.update(target.id, patch) : await svc.entities.GlobalCategory.create({ ...patch, fields: patch.fields || [] });
      return Response.json({ success: true, category });
    }
    if (body.action === 'reorder') {
      const order = Array.isArray(body.order) ? body.order : [];
      if (!order.length || order.some(o => !rows.some(r => r.id === o.id))) return Response.json({ error: 'order_invalid' }, { status: 400 });
      await svc.entities.GlobalCategory.bulkUpdate(order.map((o,i) => ({ id: o.id, sort_order: i })));
      return Response.json({ success: true });
    }
    if (!target) return Response.json({ error: 'category_not_found' }, { status: 404 });
    if (body.action === 'toggle') return Response.json({ success: true, category: await svc.entities.GlobalCategory.update(target.id, { active: target.active === false }) });
    if (body.action === 'remove') return Response.json({ error: 'preserve_category_references', message: 'Deactivate instead: global keys are retained for historical tasks and brand assignments.' }, { status: 409 });
    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}