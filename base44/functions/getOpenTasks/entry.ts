import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveBrandFromRequest } from '../../shared/brandContext.ts';

/**
 * getOpenTasks — public, Brand-scoped marketplace reader.
 *
 * The Brand comes from the REQUEST HOST (trusted server context), never from a
 * client-supplied brand_id. An unknown production hostname returns no data.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const brand = await resolveBrandFromRequest(base44, req);
    if (!brand.resolved) {
      return Response.json({ tasks: [], brand_resolved: false, reason: brand.reason });
    }

    // Platform Brand (Joba24) = marketplace-wide: every Brand's Tasks.
    // Any other Brand = only its own Tasks.
    const scope = brand.isPlatform ? {} : { origin_brand_id: brand.brandId };
    const tasks = await base44.asServiceRole.entities.Task.filter(
      { status: 'OPEN', ...scope },
      '-created_date',
      200
    );

    return Response.json({ tasks: tasks || [], brand_resolved: true });
  } catch (error) {
    console.error('getOpenTasks error:', error?.message, JSON.stringify(error?.data || {}));
    return Response.json({ error: error.message, tasks: [] }, { status: 500 });
  }
});