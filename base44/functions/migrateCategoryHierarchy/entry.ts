import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { PARENTS, EVENT_SERVICES, listAll, treeError } from '../../shared/categoryTree.ts';
const MIGRATION = 'category_hierarchy_v2_20261002';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });
    const svc = base44.asServiceRole, body = await req.json();
    const [globals, brands, links] = await Promise.all([listAll(svc.entities.GlobalCategory), listAll(svc.entities.Brand), listAll(svc.entities.BrandCategory)]);
    if (!['preview','apply'].includes(body.action)) return Response.json({ error: 'unknown_action' }, { status: 400 });
    const missingParents = PARENTS.filter(p => !globals.some(g => g.category_key === p.key));
    const missingServices = EVENT_SERVICES.filter(([key]) => !globals.some(g => g.category_key === key));
    const plan = { existing_categories: globals.length, parents_to_add: missingParents.map(p => p.key), services_to_add: missingServices.map(s => s[0]), brands_to_migrate: brands.filter(b => b.category_model_version !== 2).map(b => b.id), tasks_rewritten: 0, brands_created: 0 };
    if (body.action === 'preview') return Response.json({ success: true, plan });
    const backups = await listAll(svc.entities.CategoryMigrationBackup, { migration_key: MIGRATION });
    const have = new Set(backups.map(b => `${b.entity_name}:${b.source_id}`)), snapshot = [];
    for (const [entityName, records] of [['GlobalCategory',globals],['Brand',brands],['BrandCategory',links]]) {
      for (const record of records) if (!have.has(`${entityName}:${record.id}`)) snapshot.push({ migration_key: MIGRATION, entity_name: entityName, source_id: record.id, original: record });
    }
    if (snapshot.length) await svc.entities.CategoryMigrationBackup.bulkCreate(snapshot);
    if (missingParents.length) await svc.entities.GlobalCategory.bulkCreate(missingParents.map((p,i) => ({ category_key: p.key, label: p.label, icon: p.icon, node_type: 'parent', parent_key: '', sort_order: PARENTS.indexOf(p), active: true, fields: [] })));
    if (missingServices.length) await svc.entities.GlobalCategory.bulkCreate(missingServices.map(([key,label,icon],i) => ({ category_key: key, label, icon, node_type: 'service', parent_key: 'parent_events', sort_order: i, active: true, fields: [] })));
    const updates = globals.filter(g => !g.parent_key && g.node_type !== 'parent').map(g => ({ id: g.id, node_type: 'service', parent_key: (PARENTS.find(p => p.children.includes(g.category_key)) || PARENTS.find(p => p.key === 'parent_personal')).key, ...(g.category_key === 'events' ? { label: 'עזרה באירועים / שירות נוסף' } : {}) }));
    if (updates.length) await svc.entities.GlobalCategory.bulkUpdate(updates);
    const tree = await listAll(svc.entities.GlobalCategory), error = treeError(tree);
    if (error) return Response.json({ error, switched: false }, { status: 409 });
    const oldKeys = new Set(globals.filter(g => g.node_type !== 'parent').map(g => g.category_key));
    const brandUpdates = brands.filter(b => b.category_model_version !== 2).map(b => {
      const oldRows = links.filter(r => r.brand_id === b.id);
      const enabled = new Set(oldRows.length ? oldRows.filter(r => r.enabled !== false).map(r => r.category_key) : [...oldKeys]);
      const parents = [...new Set(tree.filter(g => oldKeys.has(g.category_key) && enabled.has(g.category_key)).map(g => g.parent_key).filter(Boolean))];
      const excluded = tree.filter(g => oldKeys.has(g.category_key) && parents.includes(g.parent_key) && !enabled.has(g.category_key)).map(g => g.category_key);
      return { id: b.id, category_model_version: 2, assigned_parent_keys: parents, excluded_child_keys: excluded };
    });
    if (brandUpdates.length) await svc.entities.Brand.bulkUpdate(brandUpdates);
    return Response.json({ success: true, migration_key: MIGRATION, plan, migrated: brandUpdates.length, backup_records_added: snapshot.length, structurally_valid: true });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}