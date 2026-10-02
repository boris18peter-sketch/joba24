import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getGlobalCategories } from '../../shared/globalCategories.ts';
import { categoryKeyForTask } from '../../shared/taskCategories.ts';

/**
 * repairTaskCategories — admin-only, idempotent.
 *
 * A Task whose actionable category is a global CHILD service must persist that
 * child as its own category, never as 'other'. Historical rows written before
 * this rule are normalised here, and every original is captured in
 * MarketplaceRepairBackup first. Legacy Joba24 Tasks (whose category is a
 * platform service that is not a global child) are left untouched.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const rows = await getGlobalCategories(base44);
    const map = Object.fromEntries(rows.map((r) => [r.category_key, r]));
    // Only 'other' rows can hold a lost child category — every other row already
    // carries its own service key, so this keeps the repair cheap and precise.
    const tasks = await base44.asServiceRole.entities.Task.filter({ category: 'other' }, '-created_date', 500);

    const repairs = [];
    for (const task of tasks) {
      const key = categoryKeyForTask(task);
      const row = map[key];
      if (!row || row.node_type === 'parent') continue;
      const next = { category: key, category_id: row.id, parent_category_key: row.parent_key || '' };
      const changed = task.category !== next.category ||
        task.category_id !== next.category_id ||
        (task.parent_category_key || '') !== next.parent_category_key;
      if (changed) repairs.push({ task, next });
    }

    if (repairs.length) {
      const repair_key = 'repair_' + new Date().toISOString();
      await base44.asServiceRole.entities.MarketplaceRepairBackup.bulkCreate(
        repairs.map((r) => ({
          repair_key,
          entity_name: 'Task',
          source_id: r.task.id,
          original: {
            category: r.task.category || null,
            category_id: r.task.category_id || null,
            parent_category_key: r.task.parent_category_key || null,
          },
        }))
      );
      for (const r of repairs) {
        await base44.asServiceRole.entities.Task.update(r.task.id, r.next);
      }
    }

    return Response.json({
      scanned: tasks.length,
      repaired_count: repairs.length,
      repaired: repairs.map((r) => ({ id: r.task.id, from: r.task.category, to: r.next.category })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}