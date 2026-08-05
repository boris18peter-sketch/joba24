import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * ── NotificationManager ──────────────────────────────────────────────────
 * מנהל ההתראות המרכזי של Joba24.
 * 
 * כל ההתראות באפליקציה עוברות דרך פונקציה זו. היא:
 * 1. מושכת את הקונפיג מ-NotificationConfig לפי event_key
 * 2. בודקת סגמנטציה (האם המשתמש מתאים לקהל היעד)
 * 3. בודקת cooldown (מניעת הצפה)
 * 4. מחליפה משתנים בתבניות הטקסט
 * 5. שולחת דרך sendPushNotification
 * 6. רושמת ללוג ב-NotificationLog
 *
 * פרמטרים (JSON body):
 *   event_key:  string  — מזהה האירוע מ-NotificationConfig
 *   user_ids:   string[] — נמענים (יכול להיות משתמש יחיד או רשימה)
 *   variables:  object  — משתנים להחלפה בתבניות ({ task_title, worker_name, ... })
 *   task_id:    string  — אופציונלי, לצורך לוג
 *   force:      boolean — אופציונלי, דלג על cooldown וסגמנט (לשליחה ידנית מדשבורד)
 */

// ── קונפיג ברירת מחדל (fallback אם NotificationConfig ריק) ──────────────────
const DEFAULT_CONFIGS = {
  application_created: {
    title_template: 'בקשה חדשה! 🔔',
    body_template: '{worker_name} הגיש בקשה למשימה "{task_title}"',
    deep_link: '/task/{task_id}',
    tag_template: 'application_{task_id}_{worker_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  application_approved: {
    title_template: 'התקבלת למשימה! 🎉',
    body_template: 'הבקשה שלך למשימה "{task_title}" אושרה!',
    deep_link: '/task/{task_id}',
    tag_template: 'app_status_{task_id}_{worker_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  application_revoked: {
    title_template: 'הקבלה בוטלה 😔',
    body_template: 'המפרסם ביטל את הקבלתך למשימה "{task_title}"',
    deep_link: '/',
    tag_template: 'app_revoked_{task_id}_{worker_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  new_chat_message: {
    title_template: 'הודעה חדשה 💬',
    body_template: '{sender_name}: {message_preview}',
    deep_link: '/chat/{task_id}',
    tag_template: 'chat_{task_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  new_matching_task: {
    title_template: 'משימה חדשה מתאימה לך 🎯',
    body_template: '{task_title} — {category_label}',
    deep_link: '/task/{task_id}',
    tag_template: 'new_match_{task_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  no_show_report: {
    title_template: 'דווחו עליך כ-no-show ⚠️',
    body_template: 'דווחו שלא הופעת למשימה "{task_title}" — זה עלול להשפיע על הדירוג שלך',
    deep_link: '/task/{task_id}',
    tag_template: 'no_show_{task_id}_{worker_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'high',
  },
  review_created: {
    title_template: '{who_label} דירג אותך {stars}',
    body_template: '{review_body}',
    deep_link: '/profile',
    tag_template: 'review_{task_id}_{reviewee_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  task_cancelled: {
    title_template: 'המפרסם ביטל את המשימה ❌',
    body_template: 'המשימה "{task_title}" בוטלה על ידי המפרסם',
    deep_link: '/',
    tag_template: 'task_cancelled_{task_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  task_completed: {
    title_template: 'המפרסם אישר את סיום המשימה ✅',
    body_template: 'המפרסם אישר שהשלמת את "{task_title}" — בדוק את הדירוג שקיבלת',
    deep_link: '/task/{task_id}',
    tag_template: 'task_completed_{task_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  worker_left_task: {
    title_template: '{worker_name} עזב את המשימה 😕',
    body_template: '{worker_name} ביטל את הקבלת המשימה "{task_title}" — אתה יכול לבחור עובד חדש',
    deep_link: '/task/{task_id}',
    tag_template: 'worker_left_{task_id}',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  worker_status_on_the_way: {
    title_template: 'העובד יוצא אליך 🏃',
    body_template: 'העובד בדרך למשימה "{task_title}"',
    deep_link: '/task/{task_id}',
    tag_template: 'worker_status_{task_id}_on_the_way',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  worker_status_arrived: {
    title_template: 'העובד הגיע 📍',
    body_template: 'העובד הגיע ליעד של "{task_title}"',
    deep_link: '/task/{task_id}',
    tag_template: 'worker_status_{task_id}_arrived',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  worker_status_done: {
    title_template: 'העובד סיים ✅',
    body_template: 'העובד סיים את "{task_title}" — אפשר לאשר',
    deep_link: '/task/{task_id}',
    tag_template: 'worker_status_{task_id}_done',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'normal',
  },
  // ── התראות חדשות (עידוד / אצ'יבמנט) ──
  verification_approved_green: {
    title_template: 'מזל טוב! הווי הירוק שלך הגיע! 🟢',
    body_template: 'עכשיו כשאתה מאומת, הסיכוי שלך להתקבל למשימות עולה משמעותית. בהצלחה במשימה הבאה!',
    deep_link: '/profile',
    tag_template: 'verification_green',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'high',
  },
  verification_approved_gold: {
    title_template: 'ווי זהב! אתה לגמרי בליגה של המקצוענים 🏆',
    body_template: 'הפרופיל שלך קיבל ווי זהב — זה אומר שמפרסמים סומכים עליך יותר מכולם. כל הכבוד!',
    deep_link: '/profile',
    tag_template: 'verification_gold',
    segments: ['all'],
    cooldown_minutes: 0,
    priority: 'high',
  },
  daily_earnings_summary: {
    title_template: 'יום מוצלח! 💰',
    body_template: 'ביצעת {count} משימות והרווחת {amount} ג\'ובות היום. תמשיך ככה!',
    deep_link: '/earnings',
    tag_template: 'daily_summary',
    segments: ['all'],
    cooldown_minutes: 1440,
    priority: 'low',
  },
  applications_rejected_unverified: {
    title_template: 'הבקשות שלך נשלחו, אבל המפרסמים מחפשים ביטחון 🛡️',
    body_template: 'הוספת ווי ירוק לפרופיל (אימות זהות) יכולה להקפיץ את סיכויי ההתקבלות שלך פי 3. זה לוקח דקה, בוא להתחיל!',
    deep_link: '/profile',
    tag_template: 'encourage_verify',
    segments: ['unverified'],
    cooldown_minutes: 10080,
    priority: 'normal',
  },
  low_balance: {
    title_template: 'היתרה שלך נמוכה 💸',
    body_template: 'זה אומר שאתה מפספס משימות שוות. קנה ג\'ובות עכשיו כדי לא להישאר מאחור.',
    deep_link: '/wallet',
    tag_template: 'low_balance',
    segments: ['low_balance'],
    cooldown_minutes: 4320,
    priority: 'normal',
  },
  retention_3days: {
    title_template: 'מתגעגעים אליך! 👋',
    body_template: 'יש עשרות משימות פתוחות שמחכות לניסיון שלך. בוא לחזור לזירה!',
    deep_link: '/',
    tag_template: 'retention_3d',
    segments: ['experienced_worker'],
    cooldown_minutes: 10080,
    priority: 'low',
  },
};

// ── זיהוי סגמנט למשתמש ──────────────────────────────────────────────────
function resolveUserSegment(user) {
  const segments = [];

  if (!user) return ['unverified'];

  const isVerified = user.is_verified === true;
  const hasSocial = !!(user.instagram_verified || user.facebook_verified || user.tiktok_verified);

  if (isVerified && hasSocial) segments.push('verified_gold');
  else if (isVerified) segments.push('verified_green');
  else segments.push('unverified');

  // ניסיון — לפי מספר משימות שבוצעו
  const tasksCount = user.completed_tasks_count || user.tasks_count || 0;
  if (tasksCount >= 3) segments.push('experienced_worker');

  // משתמש חדש — נרשם ב-7 ימים האחרונים
  if (user.created_date) {
    const daysSince = (Date.now() - new Date(user.created_date).getTime()) / 86400000;
    if (daysSince <= 7) segments.push('new_user');
  }

  // יתרה נמוכה
  const credits = user.worker_credits || 0;
  if (credits <= 3) segments.push('low_balance');

  // פעיל כמפרסם
  if (user.posted_tasks_count && user.posted_tasks_count >= 2) segments.push('active_poster');

  segments.push('all');
  return segments;
}

// ── החלפת משתנים בתבנית ──────────────────────────────────────────────────
function fillTemplate(template, variables) {
  if (!template) return '';
  let result = template;
  for (const [key, value] of Object.entries(variables || {})) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? ''));
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_key, user_ids, variables = {}, task_id, force = false } = await req.json();

    if (!event_key || !user_ids || !user_ids.length) {
      return Response.json({ error: 'Missing event_key or user_ids' }, { status: 400 });
    }

    // 1. שליפת קונפיג מהדאטהבייס
    const configs = await base44.asServiceRole.entities.NotificationConfig.filter({ event_key });
    let config = configs[0];

    // Fallback לקונפיג ברירת מחדל אם אין בדאטהבייס
    if (!config) {
      config = DEFAULT_CONFIGS[event_key];
      if (!config) {
        return Response.json({ sent: 0, reason: `No config for event_key: ${event_key}` });
      }
      config = { event_key, ...config, is_active: true, send_email: false };
    }

    // אם הקונפיג כבוי — לא שולחים
    if (!config.is_active && !force) {
      return Response.json({ sent: 0, reason: 'Config inactive' });
    }

    const cooldownMs = (config.cooldown_minutes || 0) * 60 * 1000;
    const targetSegments = config.segments || ['all'];
    const userIdsArr = Array.isArray(user_ids) ? user_ids : [user_ids];

    // 2. שליפת נתוני משתמשים לבדיקת סגמנט
    const users = await base44.asServiceRole.entities.User.filter({ id: { $in: userIdsArr } });

    const eligibleUserIds = [];
    const skippedUsers = [];

    for (const user of users) {
      // אם force=true (שליחה ידנית מדשבורד) — דלג על כל הבדיקות
      if (force) {
        eligibleUserIds.push(user.id);
        continue;
      }

      // בדיקת סגמנט
      if (!targetSegments.includes('all')) {
        const userSegments = resolveUserSegment(user);
        const matches = targetSegments.some(s => userSegments.includes(s));
        if (!matches) {
          skippedUsers.push({ id: user.id, reason: 'segment_mismatch' });
          continue;
        }
      }

      // בדיקת cooldown
      if (cooldownMs > 0) {
        const since = new Date(Date.now() - cooldownMs).toISOString();
        const recentLogs = await base44.asServiceRole.entities.NotificationLog.filter({
          user_id: user.id,
          event_key,
          status: 'sent',
          created_date: { $gte: since },
        });
        if (recentLogs.length > 0) {
          skippedUsers.push({ id: user.id, reason: 'cooldown' });
          continue;
        }
      }

      eligibleUserIds.push(user.id);
    }

    if (!eligibleUserIds.length) {
      return Response.json({
        sent: 0,
        skipped: skippedUsers.length,
        reason: 'No eligible users after segmentation/cooldown',
      });
    }

    // 3. החלפת משתנים בתבניות
    const title = fillTemplate(config.title_template, variables);
    const body = fillTemplate(config.body_template, variables);
    const deepLink = fillTemplate(config.deep_link, variables);
    const tag = fillTemplate(config.tag_template || 'joba24', variables);

    // 4. שליחה דרך sendPushNotification
    const pushResult = await base44.asServiceRole.functions.invoke('sendPushNotification', {
      user_ids: eligibleUserIds,
      title,
      body,
      url: deepLink,
      tag,
    });

    const sentCount = pushResult?.data?.sent ?? pushResult?.sent ?? 0;

    // 5. רישום ללוג — reflect actual delivery: if FCM sent 0 (no device tokens),
    // log as 'failed' so the admin dashboard shows the real status and isn't misled.
    const deliveryStatus = sentCount > 0 ? 'sent' : 'failed';
    const deliveryReason = sentCount === 0 ? (pushResult?.data?.reason || 'no_device_token') : null;
    for (const userId of eligibleUserIds) {
      try {
        await base44.asServiceRole.entities.NotificationLog.create({
          user_id: userId,
          event_key,
          title,
          body,
          deep_link: deepLink,
          status: deliveryStatus,
          skip_reason: deliveryReason,
          task_id: task_id || null,
        });
      } catch (logErr) {
        console.log('[NotificationManager] Log write failed:', logErr.message);
      }
    }

    // רישום דחיות
    for (const skipped of skippedUsers) {
      try {
        await base44.asServiceRole.entities.NotificationLog.create({
          user_id: skipped.id,
          event_key,
          status: 'skipped',
          skip_reason: skipped.reason,
          task_id: task_id || null,
        });
      } catch {}
    }

    // 6. שליחת אימייל אם מוגדר
    if (config.send_email && config.email_subject_template) {
      const emailSubject = fillTemplate(config.email_subject_template, variables);
      for (const user of users) {
        if (eligibleUserIds.includes(user.id) && user.email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: user.email,
              subject: emailSubject,
              body: `<div dir="rtl" style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f2f5fb;">
                <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,40,107,0.08);">
                  <div style="background:linear-gradient(135deg,#1a6fd4,#0a52b0);padding:24px;text-align:center;">
                    <h1 style="color:#fff;font-size:18px;font-weight:900;margin:0;">${title}</h1>
                  </div>
                  <div style="padding:24px;">
                    <p style="font-size:14px;color:#4b6083;line-height:1.7;margin:0 0 16px;">${body}</p>
                    <a href="https://joba24.com${deepLink}" style="display:block;text-align:center;background:linear-gradient(135deg,#1a6fd4,#0a52b0);color:#fff;font-size:15px;font-weight:800;padding:14px;border-radius:12px;text-decoration:none;">פתח ב-Joba24</a>
                  </div>
                </div>
              </div>`,
            });
          } catch (emailErr) {
            console.log('[NotificationManager] Email failed:', emailErr.message);
          }
        }
      }
    }

    return Response.json({
      sent: sentCount,
      eligible: eligibleUserIds.length,
      skipped: skippedUsers.length,
      event_key,
    });
  } catch (error) {
    console.error('[NotificationManager] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});