import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * עידוד אימות למשתמשים לא מאומתים שנדחו.
 * רץ פעם ביום, מאתר משתמשים ש:
 * 1. שלחו בקשות למשימות ב-7 הימים האחרונים
 * 2. נדחו לפחות פעמיים
 * 3. עדיין לא מאומתים (is_verified = false)
 * ושולח להם התראת עידוד דרך notificationManager (עם cooldown שבועי).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // ── The database counts the rejections, not this function ──────────────
    // This used to download EVERY rejected application of the last seven days —
    // with no limit — purely to count them per worker and keep the ones with two
    // or more. The database can group and filter that directly, so only the
    // workers who actually qualify come back: one row each, no applications.
    const grouped = await base44.asServiceRole.entities.TaskApplication.aggregate({
      query: { status: 'rejected', created_date: { $gte: sevenDaysAgo } },
      groupBy: 'worker_id',
      having: { count: { $gt: 1 } },
    });

    const targetWorkerIds = (grouped?.rows || [])
      .map((r: any) => r.worker_id)
      .filter(Boolean);

    if (!targetWorkerIds.length) {
      return Response.json({ sent: 0, reason: 'No users with 2+ rejections' });
    }

    // שליפת פרטי המשתמשים הלא-מאומתים בלבד, בקבוצות של 200
    const users: any[] = [];
    const USER_CHUNK = 200;
    const userChunkCount = Math.ceil(targetWorkerIds.length / USER_CHUNK);
    for (const [c] of Array.from({ length: userChunkCount }).entries()) {
      const chunk = targetWorkerIds.slice(c * USER_CHUNK, c * USER_CHUNK + USER_CHUNK);
      const rows = await base44.asServiceRole.entities.User.filter({
        id: { $in: chunk },
        is_verified: { $ne: true },
        is_blocked: { $ne: true },
      }, '-created_date', USER_CHUNK);
      users.push(...(rows || []));
    }

    if (!users.length) {
      return Response.json({ sent: 0, reason: 'All already verified' });
    }

    // ── ONE call reaches the whole batch, instead of one call per user ──────
    // Every user used to cost its own notificationManager invocation, and each
    // of those re-read the settings and re-selected its recipients on its own.
    // notificationManager takes the recipient list directly, so the group is one
    // call — chunked so a large batch cannot time the function out. It still
    // applies the segment and the weekly cooldown per recipient.
    const SEND_CHUNK = 50;
    let sent = 0;
    const sendChunkCount = Math.ceil(users.length / SEND_CHUNK);
    for (const [c] of Array.from({ length: sendChunkCount }).entries()) {
      const chunk = users.slice(c * SEND_CHUNK, c * SEND_CHUNK + SEND_CHUNK).map((u: any) => u.id);
      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'applications_rejected_unverified',
          user_ids: chunk,
          variables: {},
        });
        sent += chunk.length;
      } catch (err) {
        console.log('[EncourageVerify] batch failed:', err.message);
      }
    }

    return Response.json({
      sent,
      checked: targetWorkerIds.length,
      filtered_out_verified: targetWorkerIds.length - users.length,
    });
  } catch (error) {
    console.error('[EncourageVerify] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});