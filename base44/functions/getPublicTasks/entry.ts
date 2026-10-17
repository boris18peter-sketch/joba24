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

/**
 * Overlay each task's two people with their CURRENT name.
 *
 * A task stores the name of the client and the worker at the moment they became
 * involved. That copy is frozen, so it keeps showing the old name after the
 * person renames themselves (the chosen name lives in `display_name` on their
 * User record). The stored task is NEVER modified — the live name is read by
 * stable user id and put on the RESPONSE only, so every marketplace surface
 * (feed, map, daily goal, public profile, task detail) shows the current name
 * from this one place.
 */
const RECORD_ID = /^[0-9a-f]{24}$/i;

async function withCurrentNames(svc: any, rows: any[]) {
  const tasks = rows || [];
  // Only real record ids may enter the lookup. Simulator/demo tasks carry ids
  // like `demo_1791285783985_…`, and the API rejects an ENTIRE $in query when any
  // one of its values is not a valid record id — which took the whole feed down.
  // A demo id has no live user to look up anyway.
  const ids = [...new Set(
    tasks.flatMap((t) => [t?.client_id, t?.worker_id]).filter((id) => id && RECORD_ID.test(id))
  )] as string[];
  if (!ids.length) return tasks;

  try {
    const names: Record<string, string> = {};
    for (let i = 0; i < ids.length; i += 100) {
      const users = await svc.entities.User.filter(
        { id: { $in: ids.slice(i, i + 100) } },
        '-created_date',
        100
      );
      for (const u of users || []) {
        const name = (u.display_name || '').trim() || u.full_name || '';
        if (name) names[u.id] = name;
      }
    }

    return tasks.map((t) => ({
      ...t,
      client_name: names[t?.client_id] || t?.client_name,
      worker_name: names[t?.worker_id] || t?.worker_name,
    }));
  } catch (e) {
    // Showing the CURRENT name is a nicety. It must never cost the marketplace
    // its tasks, so a failed lookup falls back to the stored name.
    console.error('withCurrentNames failed:', e?.message);
    return tasks;
  }
}

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

    // The platform Brand (Joba24) is the marketplace-wide surface: it shows Tasks
    // from EVERY Brand. Any other Brand shows only its own Tasks.
    const scope = brand.isPlatform ? {} : { origin_brand_id: brand.brandId };

    if (mode === 'single') {
      if (!body?.taskId) return Response.json({ tasks: [], brand_resolved: true });
      const rows = await svc.entities.Task.filter({ id: body.taskId, ...scope });
      return Response.json({ tasks: await withCurrentNames(svc, rows), brand_resolved: true });
    }

    if (mode === 'byIds') {
      const ids = Array.isArray(body?.taskIds) ? body.taskIds.filter(Boolean).slice(0, MAX_LIMIT) : [];
      if (!ids.length) return Response.json({ tasks: [], brand_resolved: true });
      const rows = await svc.entities.Task.filter({ id: { $in: ids }, ...scope });
      return Response.json({ tasks: await withCurrentNames(svc, rows), brand_resolved: true });
    }

    if (mode === 'stories') {
      const rows = await svc.entities.Task.filter({ is_story: true, ...scope }, '-created_date', 30);
      return Response.json({ tasks: await withCurrentNames(svc, rows), brand_resolved: true });
    }

    if (mode === 'completedByCategory') {
      if (!body?.category) return Response.json({ tasks: [], brand_resolved: true });
      const rows = await svc.entities.Task.filter(
        { category: body.category, status: 'COMPLETED', ...scope },
        '-completed_at',
        limit
      );
      return Response.json({ tasks: await withCurrentNames(svc, rows), brand_resolved: true });
    }

    if (mode === 'userCompleted') {
      if (!body?.userId) return Response.json({ tasks: [], brand_resolved: true });
      const field = body?.role === 'client' ? 'client_id' : 'worker_id';
      const rows = await svc.entities.Task.filter(
        { [field]: body.userId, status: 'COMPLETED', ...scope },
        '-created_date',
        limit
      );
      return Response.json({ tasks: await withCurrentNames(svc, rows), brand_resolved: true });
    }

    // default: 'open'
    const rows = await svc.entities.Task.filter({ status: 'OPEN', ...scope }, '-created_date', limit);
    return Response.json({ tasks: await withCurrentNames(svc, rows), brand_resolved: true });
  } catch (error) {
    console.error('getPublicTasks error:', error?.message, JSON.stringify(error?.data || {}));
    return Response.json({ error: error.message, tasks: [] }, { status: 500 });
  }
});