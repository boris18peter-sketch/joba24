import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // בקשות שנדחו ב-7 הימים האחרונים
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const rejectedApps = await base44.asServiceRole.entities.TaskApplication.filter({
      status: 'rejected',
      created_date: { $gte: sevenDaysAgo },
    });

    if (!rejectedApps.length) {
      return Response.json({ sent: 0, reason: 'No rejected applications recently' });
    }

    // ספירת דחיות לכל עובד
    const rejectionCounts = {};
    for (const app of rejectedApps) {
      if (!app.worker_id) continue;
      rejectionCounts[app.worker_id] = (rejectionCounts[app.worker_id] || 0) + 1;
    }

    // סינון עובדים עם 2+ דחיות
    const targetWorkerIds = Object.entries(rejectionCounts)
      .filter(([_, count]) => count >= 2)
      .map(([id]) => id);

    if (!targetWorkerIds.length) {
      return Response.json({ sent: 0, reason: 'No users with 2+ rejections' });
    }

    // שליפת פרטי משתמשים וסינון לא מאומתים בלבד
    const users = await base44.asServiceRole.entities.User.filter({
      id: { $in: targetWorkerIds },
      is_verified: { $ne: true },
      is_blocked: { $ne: true },
    });

    if (!users.length) {
      return Response.json({ sent: 0, reason: 'All already verified' });
    }

    // שליחת התראה לכל אחד (notificationManager מטפל ב-segment + cooldown)
    for (const user of users) {
      try {
        await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'applications_rejected_unverified',
          user_ids: [user.id],
          variables: {},
        });
      } catch (err) {
        console.log('[EncourageVerify] Failed for user:', user.id, err.message);
      }
    }

    return Response.json({
      sent: users.length,
      checked: targetWorkerIds.length,
      filtered_out_verified: targetWorkerIds.length - users.length,
    });
  } catch (error) {
    console.error('[EncourageVerify] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});