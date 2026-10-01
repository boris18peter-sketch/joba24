import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveBrandFromRequest } from '../../shared/brandContext.ts';

/**
 * getPublicTasks — the trusted public reader for every marketplace surface that
 * shows Tasks the caller is NOT a party to (Packages 4.1.2–4.4).
 *
 * Every mode is Brand-scoped from the REQUEST HOST. A task belonging to another
 * Brand is never returned, and an unknown production hostname returns nothing.
 *
 * Modes:
 *   open          → OPEN tasks for this Brand (feed, map, daily goal, insights)
 *   stories       → is_story tasks for this Brand
 *   byIds         → specific task ids, filtered to this Brand
 *   userCompleted → a user's COMPLETED tasks (public profile), filtered to this Brand
 *   single        → one task by id (public Task Detail), filtered to this Brand
 *
 * Returned tasks are the raw Task records: these are all fields the marketplace
 * already showed publicly. Nothing private is added.
 */
const MAX_LIMIT = 200;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const brand = await resolveBrandFromRequest(base44, req);
    if (!brand.resolved) {
      return Response.json({ tasks: [], brand_resolved: false, reason: brand.reason });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || 'open';
    const limit = Math.min(Number(body?.limit) || 100, MAX_LIMIT);

    const scope = { origin_brand_id: brand.brandId };

    if (mode === 'single') {
      if (!body?.taskId) return Response.json({ tasks: [], brand_resolved: true });
      const rows = await svc.entities.Task.filter({ id: body.taskId, ...scope });
      return Response.json({ tasks: rows || [], brand_resolved: true });
    }

    if (mode === 'byIds') {
      const ids = Array.isArray(body?.taskIds) ? body.taskIds.filter(Boolean).slice(0, MAX_LIMIT) : [];
      if (!ids.length) return Response.json({ tasks: [], brand_resolved: true });
      const rows = await svc.entities.Task.filter({ id: { $in: ids }, ...scope });
      return Response.json({ tasks: rows || [], brand_resolved: true });
    }

    if (mode === 'stories') {
      const rows = await svc.entities.Task.filter({ is_story: true, ...scope }, '-created_date', 30);
      return Response.json({ tasks: rows || [], brand_resolved: true });
    }

    if (mode === 'completedByCategory') {
      if (!body?.category) return Response.json({ tasks: [], brand_resolved: true });
      const rows = await svc.entities.Task.filter(
        { category: body.category, status: 'COMPLETED', ...scope },
        '-completed_at',
        limit
      );
      return Response.json({ tasks: rows || [], brand_resolved: true });
    }

    if (mode === 'userCompleted') {
      if (!body?.userId) return Response.json({ tasks: [], brand_resolved: true });
      const field = body?.role === 'client' ? 'client_id' : 'worker_id';
      const rows = await svc.entities.Task.filter(
        { [field]: body.userId, status: 'COMPLETED', ...scope },
        '-created_date',
        limit
      );
      return Response.json({ tasks: rows || [], brand_resolved: true });
    }

    // default: 'open'
    const rows = await svc.entities.Task.filter({ status: 'OPEN', ...scope }, '-created_date', limit);
    return Response.json({ tasks: rows || [], brand_resolved: true });
  } catch (error) {
    console.error('getPublicTasks error:', error?.message, JSON.stringify(error?.data || {}));
    return Response.json({ error: error.message, tasks: [] }, { status: 500 });
  }
});