import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

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

    // ── The database counts and sums, this function only sends ─────────────
    // This used to download EVERY task completed today — every field of every
    // one of them — purely to count them per worker and add up the prices. The
    // database groups and totals that directly, so only one row per worker comes
    // back: a count and a sum, and no task records at all.
    const grouped = await base44.asServiceRole.entities.Task.aggregate({
      query: { status: 'COMPLETED', completed_at: { $gte: startUTC } },
      groupBy: 'worker_id',
      sum: 'price',
    });

    const rows = (grouped?.rows || []).filter((r: any) => r.worker_id);

    if (!rows.length) {
      return Response.json({ sent: 0, reason: 'No completed tasks today' });
    }

    // שליחת התראה לכל עובד שהשלים לפחות משימה אחת.
    // Each worker's message carries their OWN count and amount, so unlike a
    // shared announcement these cannot be collapsed into one call.
    let sent = 0;
    for (const row of rows) {
      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'daily_earnings_summary',
          user_ids: [row.worker_id],
          variables: {
            count: row.count,
            amount: Math.round(row.sum_price || 0),
          },
        });
        sent++;
      } catch (err) {
        console.log(`[DailySummary] Failed for worker ${row.worker_id}:`, err.message);
      }
    }

    return Response.json({ sent, workers: rows.map((r: any) => r.worker_id) });
  } catch (error) {
    console.error('[DailyEarningsSummary] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});