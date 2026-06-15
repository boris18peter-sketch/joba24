import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * qaBot — Simulates a second user (bot worker) performing actions on tasks.
 * The bot uses asServiceRole to act on behalf of a virtual worker.
 * 
 * actions:
 *   apply        — bot applies to a task (deducts 0 credits — bot is free)
 *   approve      — task owner approves the bot's application
 *   take         — bot takes the task (TAKEN)
 *   advance      — advance worker_status: on_the_way → arrived → done
 *   complete     — mark task COMPLETED (both sides)
 *   cancel_app   — bot cancels its own application (refund test)
 *   cancel_task  — owner cancels the task while bot is working
 *   full_flow    — runs the entire happy path automatically on a task
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, taskId } = await req.json();
    if (!action) return Response.json({ error: 'action required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const BOT_ID   = `bot_${user.id}`;
    const BOT_NAME = '🤖 עובד בדיקה (בוט)';
    const log = [];

    const getTask = async (id) => {
      const rows = await sr.entities.Task.filter({ id });
      return rows[0] || null;
    };
    const getApp = async (tId) => {
      const rows = await sr.entities.TaskApplication.filter({ task_id: tId, worker_id: BOT_ID });
      return rows.find(a => a.status === 'pending' || a.status === 'approved') || null;
    };

    // ── apply ─────────────────────────────────────────────────────────────────
    if (action === 'apply') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
      if (task.status !== 'OPEN') return Response.json({ error: 'Task not OPEN' }, { status: 400 });

      const existing = await getApp(taskId);
      if (existing) return Response.json({ success: true, note: 'Already applied', app: existing });

      const app = await sr.entities.TaskApplication.create({
        task_id: taskId,
        task_title: task.title,
        worker_id: BOT_ID,
        worker_name: BOT_NAME,
        worker_score: 99,
        worker_rating: 5.0,
        worker_tasks_count: 42,
        message: '🤖 בקשת בוט — QA אוטומטי',
        status: 'pending',
        credits_charged: 0, // bot costs nothing
      });
      log.push(`✅ Bot applied to task "${task.title}"`);
      return Response.json({ success: true, action, app, log });
    }

    // ── approve ───────────────────────────────────────────────────────────────
    if (action === 'approve') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
      if (task.client_id !== user.id) return Response.json({ error: 'Not your task' }, { status: 403 });

      const app = await getApp(taskId);
      if (!app) return Response.json({ error: 'Bot has no pending application' }, { status: 404 });

      await sr.entities.TaskApplication.update(app.id, { status: 'approved' });
      log.push(`✅ Approved bot application on "${task.title}"`);
      return Response.json({ success: true, action, log });
    }

    // ── take ──────────────────────────────────────────────────────────────────
    if (action === 'take') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

      await sr.entities.Task.update(taskId, {
        status: 'TAKEN',
        worker_id: BOT_ID,
        worker_name: BOT_NAME,
        worker_status: null,
      });
      log.push(`✅ Bot took task "${task.title}"`);
      return Response.json({ success: true, action, log });
    }

    // ── advance ───────────────────────────────────────────────────────────────
    if (action === 'advance') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

      const flow = [null, 'on_the_way', 'arrived', 'done'];
      const curIdx = flow.indexOf(task.worker_status);
      const nextStatus = flow[curIdx + 1] || 'done';

      const update = { worker_status: nextStatus };
      if (nextStatus === 'on_the_way') update.on_the_way_at = new Date().toISOString();
      if (nextStatus === 'arrived')    update.arrived_at    = new Date().toISOString();
      if (nextStatus === 'done')       update.completed_at  = new Date().toISOString();

      await sr.entities.Task.update(taskId, update);
      log.push(`✅ Bot advanced to worker_status="${nextStatus}"`);
      return Response.json({ success: true, action, nextStatus, log });
    }

    // ── complete ──────────────────────────────────────────────────────────────
    if (action === 'complete') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

      await sr.entities.Task.update(taskId, {
        status: 'COMPLETED',
        worker_confirmed: true,
        client_confirmed: true,
        worker_status: 'done',
        completed_at: new Date().toISOString(),
      });
      log.push(`✅ Task "${task.title}" marked COMPLETED`);
      return Response.json({ success: true, action, log });
    }

    // ── cancel_app ────────────────────────────────────────────────────────────
    if (action === 'cancel_app') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const app = await getApp(taskId);
      if (!app) return Response.json({ error: 'No active bot application to cancel' }, { status: 404 });

      await sr.entities.TaskApplication.update(app.id, { status: 'cancelled' });
      log.push(`✅ Bot application cancelled (credits_charged=${app.credits_charged})`);
      return Response.json({ success: true, action, credits_refunded: app.credits_charged, log });
    }

    // ── cancel_task ───────────────────────────────────────────────────────────
    if (action === 'cancel_task') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
      if (task.client_id !== user.id) return Response.json({ error: 'Not your task' }, { status: 403 });

      await sr.entities.Task.update(taskId, { status: 'CANCELLED', worker_id: null, worker_name: null, worker_status: null });
      // Refund all pending applications
      const apps = await sr.entities.TaskApplication.filter({ task_id: taskId });
      for (const a of apps.filter(x => x.status === 'pending' || x.status === 'approved')) {
        await sr.entities.TaskApplication.update(a.id, { status: 'cancelled' });
      }
      log.push(`✅ Task "${task.title}" cancelled, ${apps.length} apps cleaned up`);
      return Response.json({ success: true, action, log });
    }

    // ── full_flow ─────────────────────────────────────────────────────────────
    if (action === 'full_flow') {
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const task = await getTask(taskId);
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
      if (task.status !== 'OPEN') return Response.json({ error: 'Task must be OPEN', task_status: task.status }, { status: 400 });

      // 1. Apply
      let app = await getApp(taskId);
      if (!app) {
        app = await sr.entities.TaskApplication.create({
          task_id: taskId, task_title: task.title,
          worker_id: BOT_ID, worker_name: BOT_NAME,
          worker_score: 99, worker_rating: 5.0, worker_tasks_count: 42,
          message: '🤖 full_flow QA bot', status: 'pending', credits_charged: 0,
        });
        log.push('1. Bot applied');
      } else {
        log.push('1. Bot already had application');
      }

      // 2. Approve (if manual mode)
      if (task.approval_mode === 'manual') {
        await sr.entities.TaskApplication.update(app.id, { status: 'approved' });
        log.push('2. Application approved');
      } else {
        log.push('2. Instant mode — skipping approval');
      }

      // 3. Take
      await sr.entities.Task.update(taskId, {
        status: 'TAKEN', worker_id: BOT_ID, worker_name: BOT_NAME, worker_status: null,
      });
      log.push('3. Bot took the task (TAKEN)');

      // 4. on_the_way → arrived → done
      await sr.entities.Task.update(taskId, { worker_status: 'on_the_way', on_the_way_at: new Date().toISOString() });
      log.push('4. Bot: on_the_way');
      await sr.entities.Task.update(taskId, { worker_status: 'arrived', arrived_at: new Date().toISOString() });
      log.push('5. Bot: arrived');
      await sr.entities.Task.update(taskId, { worker_status: 'done', completed_at: new Date().toISOString() });
      log.push('6. Bot: done');

      // 5. Complete
      await sr.entities.Task.update(taskId, {
        status: 'COMPLETED', worker_confirmed: true, client_confirmed: true,
      });
      log.push('7. Task COMPLETED ✅');

      return Response.json({ success: true, action, log });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('❌ qaBot error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});