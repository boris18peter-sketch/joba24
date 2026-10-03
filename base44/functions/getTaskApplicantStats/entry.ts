import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveBrandFromRequest } from '../../shared/brandContext.ts';

/**
 * getTaskApplicantStats — public application COUNTS only (Packages 4.1.2–4.4).
 *
 * The public UI needs a number, not permission to read TaskApplication records.
 * This returns counts keyed by task id and never returns a TaskApplication row,
 * an applicant identity, a message or an image.
 *
 * Brand-scoped from the request host: a task belonging to another Brand is
 * simply not reported.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const brand = await resolveBrandFromRequest(base44, req);
    if (!brand.resolved) return Response.json({ counts: {}, brand_resolved: false, reason: brand.reason });

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.taskIds) ? body.taskIds.filter(Boolean).slice(0, 100) : [];
    if (!ids.length) return Response.json({ counts: {}, brand_resolved: true });

    // Only tasks this surface may show may be counted. The platform Brand
    // (Joba24) shows every Brand's Tasks; any other Brand only its own.
    const tasks = await svc.entities.Task.filter(
      brand.isPlatform
        ? { id: { $in: ids } }
        : { id: { $in: ids }, origin_brand_id: brand.brandId }
    );
    const allowed = new Set((tasks || []).map((t: any) => t.id));
    if (!allowed.size) return Response.json({ counts: {}, brand_resolved: true });

    const apps = await svc.entities.TaskApplication.filter({ task_id: { $in: [...allowed] } }, '-created_date', 500);

    const counts: Record<string, { active: number; all: number }> = {};
    for (const id of allowed) counts[id] = { active: 0, all: 0 };
    for (const a of apps || []) {
      const c = counts[a.task_id];
      if (!c) continue;
      c.all += 1;
      if (a.status === 'pending' || a.status === 'approved') c.active += 1;
    }

    return Response.json({ counts, brand_resolved: true });
  } catch (error) {
    console.error('getTaskApplicantStats error:', error?.message);
    return Response.json({ error: error.message, counts: {} }, { status: 500 });
  }
});