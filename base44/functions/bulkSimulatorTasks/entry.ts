import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { JOBA24_BRAND_ID } from '../../shared/jobaBrand.ts';
import { requireInternalOperator } from '../../shared/internalAuth.ts';
import { buildDemoTasks } from '../../shared/demoTasks.ts';

/**
 * The manual demo task generator (QA simulator).
 *
 * Generation itself lives in `shared/demoTasks.ts` so the Market Maker automaton
 * publishes through EXACTLY the same code path — same demo profiles, same
 * content, same categories. This function only owns the two operator actions:
 * generate now, and clean everything up.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const denied = await requireInternalOperator(base44, req, user);
    if (denied) return denied;

    const body = await req.json();
    const { action, city, count, minPrice, maxPrice, categories, brandIds } = body;

    // ── CLEANUP ──
    if (action === 'cleanup') {
      const adminTasks = await base44.entities.Task.filter({ client_id: user.id }, '-created_date', 500);
      const oldDemo = adminTasks.filter((t: any) => t.title?.startsWith('🧪🏙️'));
      for (const t of oldDemo) {
        await base44.entities.Task.delete(t.id);
      }

      const allTasks = await base44.entities.Task.list('-created_date', 500);
      const newDemo = allTasks.filter((t: any) => t.client_id?.startsWith('demo_'));
      for (const t of newDemo) {
        await base44.entities.Task.delete(t.id);
      }

      const demoUsers = await base44.asServiceRole.entities.DemoUser.list('-created_date', 200);
      for (const u of demoUsers) {
        await base44.asServiceRole.entities.DemoUser.delete(u.id);
      }

      return Response.json({ success: true, deleted: oldDemo.length + newDemo.length });
    }

    // ── GENERATE ──
    if (action === 'generate') {
      if (!city || !count) return Response.json({ error: 'city and count required' }, { status: 400 });

      const tasks = await buildDemoTasks({
        base44,
        city,
        count,
        minPrice,
        maxPrice,
        categories,
        brandIds: Array.isArray(brandIds) && brandIds.length ? brandIds : [JOBA24_BRAND_ID],
      });

      return Response.json({
        success: true,
        count: tasks.length,
        brands: Array.isArray(brandIds) && brandIds.length ? brandIds.length : 1,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}