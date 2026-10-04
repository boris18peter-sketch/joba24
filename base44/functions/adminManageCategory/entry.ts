import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { listAll, isBranchNode, isGroupNode } from '../../shared/categoryTree.ts';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
    const svc = base44.asServiceRole, body = await req.json();
    const brand = (await svc.entities.Brand.filter({ id: body.brand_id }))?.[0];
    if (!brand) return Response.json({ error: 'brand_not_found' }, { status: 404 });
    if (body.action !== 'set_scope') return Response.json({ error: 'use_parent_assignments', message: 'Use parent assignments and optional service exclusions.' }, { status: 400 });
    const globals = await listAll(svc.entities.GlobalCategory);
    const parents = [...new Set(Array.isArray(body.assigned_parent_keys) ? body.assigned_parent_keys : [])];
    const excluded = [...new Set(Array.isArray(body.excluded_child_keys) ? body.excluded_child_keys : [])];
    if (parents.some(key => !globals.some(g => g.category_key === key && isBranchNode(g)))) return Response.json({ error: 'parent_invalid' }, { status: 400 });
    if (excluded.some(key => !globals.some(g => g.category_key === key && !isGroupNode(g)))) return Response.json({ error: 'child_invalid' }, { status: 400 });
    const updated = await svc.entities.Brand.update(brand.id, { category_model_version: 2, assigned_parent_keys: parents, excluded_child_keys: excluded });
    return Response.json({ success: true, brand: updated });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}