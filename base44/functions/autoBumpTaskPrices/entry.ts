import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Cron job — runs every 5 minutes.
 * Automatically bumps the price of OPEN tasks that have auto_bump_enabled,
 * from base_price toward max_price in 12 steps (over ~1 hour).
 * Skips tasks that already have active applications (price is frozen on first request).
 * Keeps hourly_rate in sync for hourly-priced tasks.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled cron (no auth) or authenticated admin
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch all OPEN tasks with auto-bump enabled
    const openTasks = await base44.asServiceRole.entities.Task.filter({
      status: 'OPEN',
      auto_bump_enabled: true,
    });

    // Keep only tasks that still have room to bump
    const bumpable = openTasks.filter(t =>
      t.max_price && t.price < t.max_price && t.base_price && t.created_date
    );

    if (bumpable.length === 0) {
      return Response.json({ success: true, bumped: 0 });
    }

    // Batch-fetch active applications for all bumpable tasks (avoids N+1)
    const taskIds = bumpable.map(t => t.id);
    const activeApps = await base44.asServiceRole.entities.TaskApplication.filter({
      task_id: { $in: taskIds },
      status: { $in: ['pending', 'approved'] },
    });
    const tasksWithActiveApps = new Set(activeApps.map(a => a.task_id));

    let bumpedCount = 0;
    const now = Date.now();

    for (const task of bumpable) {
      // Freeze price once an active application exists
      if (tasksWithActiveApps.has(task.id)) continue;

      // Only bump tasks older than 10 minutes
      const ageMinutes = (now - new Date(task.created_date).getTime()) / 1000 / 60;
      if (ageMinutes < 10) continue;

      const base = task.base_price || task.price;
      if (base >= task.max_price) continue;

      const totalSteps = 12; // spread price increase over 12 intervals (~1 hour)
      const step = (task.max_price - base) / totalSteps;
      const nextPrice = Math.min(Math.round(task.price + step), task.max_price);

      if (nextPrice <= task.price) continue;

      const updates = { price: nextPrice };
      // Keep hourly_rate in sync for hourly-priced tasks
      if (task.category_details?.pricing_type === 'hourly' && task.category_details?.hours) {
        updates.category_details = {
          ...task.category_details,
          hourly_rate: Math.round(nextPrice / task.category_details.hours),
        };
      }

      try {
        await base44.asServiceRole.entities.Task.update(task.id, updates);
        bumpedCount++;
      } catch (err) {
        // Swallow per-task errors so one failure doesn't block other bumps
      }
    }

    console.log(`✅ autoBumpTaskPrices: bumped ${bumpedCount} tasks`);
    return Response.json({ success: true, bumped: bumpedCount });
  } catch (error) {
    console.error('❌ autoBumpTaskPrices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});