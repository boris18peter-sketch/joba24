import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getGlobalCategories } from '../../shared/globalCategories.ts';
import { supportedServices } from '../../shared/taskCategories.ts';

/**
 * repairMarketplaceBrands — admin-only, idempotent.
 *
 * A Brand's category scope is expressed as GLOBAL PARENT keys. If a Brand was
 * ever given a service key instead, the parent gate is broken: the Brand either
 * offers nothing or offers the wrong branch. This derives the correct parent set
 * from the services the Brand should expose, keeps only real service exclusions,
 * and backs every original up in MarketplaceRepairBackup first.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const rows = await getGlobalCategories(base44);
    const map = Object.fromEntries(rows.map((r) => [r.category_key, r]));
    const rootOf = (row) => {
      const seen = new Set();
      let node = row;
      while (node?.parent_key && map[node.parent_key] && !seen.has(node.category_key)) {
        seen.add(node.category_key);
        node = map[node.parent_key];
      }
      return node?.category_key || '';
    };

    const brands = await base44.asServiceRole.entities.Brand.list('created_date', 200);
    const plans = [];
    for (const brand of brands) {
      const assigned = brand.assigned_parent_keys || [];
      const excluded = brand.excluded_child_keys || [];
      const offered = supportedServices(rows, brand, []);
      const roots = [...new Set(offered.map(rootOf).filter(Boolean))];
      const additions = roots.filter((r) => !assigned.includes(r));
      const keptExcluded = excluded.filter((k) => map[k] && map[k].node_type !== 'parent');
      if (!additions.length && keptExcluded.length === excluded.length) continue;
      plans.push({
        brand,
        next: { assigned_parent_keys: [...assigned, ...additions], excluded_child_keys: keptExcluded },
      });
    }

    if (plans.length) {
      const repair_key = 'repair_' + new Date().toISOString();
      await base44.asServiceRole.entities.MarketplaceRepairBackup.bulkCreate(
        plans.map((p) => ({
          repair_key,
          entity_name: 'Brand',
          source_id: p.brand.id,
          original: {
            assigned_parent_keys: p.brand.assigned_parent_keys || [],
            excluded_child_keys: p.brand.excluded_child_keys || [],
          },
        }))
      );
      for (const p of plans) await base44.asServiceRole.entities.Brand.update(p.brand.id, p.next);
    }

    return Response.json({
      brands: brands.length,
      repaired_count: plans.length,
      repaired: plans.map((p) => ({
        id: p.brand.id,
        slug: p.brand.slug,
        assigned_parent_keys: p.next.assigned_parent_keys,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}