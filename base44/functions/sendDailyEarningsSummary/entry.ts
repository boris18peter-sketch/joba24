import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * סיכום יומי הכנסות — רץ כל ערב ב-21:00 שעון ישראל.
 * מחשב לכל עובד כמה משימות השלים היום וכמה הרוויח,
 * ושולח התראה דרך notificationManager.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // תאריך תחילת היום (חצות) בשעון ישראל — UTC+3
    const now = new Date();
    const israelOffset = 3 * 60 * 60 * 1000;
    const israelNow = new Date(now.getTime() + israelOffset);
    const startOfDay = new Date(israelNow);
    startOfDay.setHours(0, 0, 0, 0);
    const startUTC = new Date(startOfDay.getTime() - israelOffset).toISOString();

    // שליפת כל המשימות שהושלמו היום
    const completedToday = await base44.asServiceRole.entities.Task.filter({
      status: 'COMPLETED',
      completed_at: { $gte: startUTC },
    });

    if (!completedToday.length) {
      return Response.json({ sent: 0, reason: 'No completed tasks today' });
    }

    // קיבוץ לפי worker_id וסכימת הכנסות
    const workerStats = {};
    for (const task of completedToday) {
      if (!task.worker_id) continue;
      if (!workerStats[task.worker_id]) {
        workerStats[task.worker_id] = { count: 0, totalAmount: 0, taskIds: [] };
      }
      workerStats[task.worker_id].count++;
      workerStats[task.worker_id].totalAmount += task.price || 0;
      workerStats[task.worker_id].taskIds.push(task.id);
    }

    // שליחת התראה לכל עובד שהשלים לפחות משימה אחת
    const workerIds = Object.keys(workerStats);
    for (const workerId of workerIds) {
      const stats = workerStats[workerId];
      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'daily_earnings_summary',
          user_ids: [workerId],
          variables: {
            count: stats.count,
            amount: Math.round(stats.totalAmount),
          },
        });
      } catch (err) {
        console.log(`[DailySummary] Failed for worker ${workerId}:`, err.message);
      }
    }

    return Response.json({ sent: workerIds.length, workers: workerIds });
  } catch (error) {
    console.error('[DailyEarningsSummary] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});