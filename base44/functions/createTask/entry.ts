import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveBrandFromRequest } from '../../shared/brandContext.ts';
import { taskCatalogue, normalizeTaskCategory, validateGlobalForm } from '../../shared/taskCategories.ts';

/**
 * createTask — the trusted Task writer.
 *
 * The origin Brand and the actionable category are decided SERVER-SIDE:
 *   • origin_brand_id comes from the request HOST, never from the client.
 *   • category/category_id come from the resolved GlobalCategory row, so a child
 *     service is persisted as itself — it is never flattened to 'other'.
 * The client sends the same field set it always did, minus the authority fields.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const brand = await resolveBrandFromRequest(base44, req);
    if (!brand.resolved || !brand.brandId) {
      return Response.json({ error: 'brand_unresolved', reason: brand.reason, host: brand.hostname }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const draft = body?.task;
    if (!draft || typeof draft !== 'object') return Response.json({ error: 'invalid_task' }, { status: 400 });
    if (!String(draft.title || '').trim() || !Number.isFinite(Number(draft.price))) {
      return Response.json({ error: 'invalid_task' }, { status: 400 });
    }

    const catalogue = await taskCatalogue(base44, brand.brandId);
    const serviceKey = draft.category_details?.brand_category_key || draft.category;
    const row = catalogue.map[serviceKey];
    const offered = row && catalogue.services.some((s) => s.category_key === row.category_key);
    if (!row || row.node_type === 'parent' || row.node_type === 'group' || !offered) {
      return Response.json({ error: 'category_not_offered', category: serviceKey || null }, { status: 400 });
    }

    const formError = validateGlobalForm(row, draft.category_details);
    if (formError) return Response.json({ error: 'invalid_form', message: formError }, { status: 400 });

    const { client_id, client_name, client_rating, client_verified, origin_brand_id, ...rest } = draft;
    const record = normalizeTaskCategory(
      { ...rest, category_details: { ...(draft.category_details || {}), brand_category_key: row.category_key } },
      catalogue.map
    );

    const task = await base44.asServiceRole.entities.Task.create({
      ...record,
      client_id: user.id,
      client_name: user.full_name,
      client_rating: user.rating || 0,
      client_verified: user.is_verified || false,
      origin_brand_id: brand.brandId,
    });

    return Response.json({ task });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}