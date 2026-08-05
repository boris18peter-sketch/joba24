import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * פונקציית admin לניהול NotificationConfig:
 * - יצירה / עדכון / מחיקה של הגדרות התראות
 * - שליחה ידנית של התראה למשתמש ספציפי (force=true)
 * - טעינת כל ההגדרות לדשבורד
 */

const DEFAULT_SEED_CONFIGS = [
  // ── Transactional (קיימות — מועתקות למנהל) ──
  { event_key: 'application_created', event_label: 'בקשה חדשה למשימה (למפרסם)', category: 'transactional',
    title_template: 'בקשה חדשה! 🔔', body_template: '{worker_name} הגיש בקשה למשימה "{task_title}"',
    deep_link: '/task/{task_id}', tag_template: 'application_{task_id}_{worker_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 1 },
  { event_key: 'application_approved', event_label: 'בקשה אושרה (לעובד)', category: 'transactional',
    title_template: 'התקבלת למשימה! 🎉', body_template: 'הבקשה שלך למשימה "{task_title}" אושרה!',
    deep_link: '/task/{task_id}', tag_template: 'app_status_{task_id}_{worker_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 2 },
  { event_key: 'application_revoked', event_label: 'קבלה בוטלה (לעובד)', category: 'transactional',
    title_template: 'הקבלה בוטלה 😔', body_template: 'המפרסם ביטל את הקבלתך למשימה "{task_title}"',
    deep_link: '/', tag_template: 'app_revoked_{task_id}_{worker_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 3 },
  { event_key: 'new_chat_message', event_label: 'הודעה חדשה בצ\'אט', category: 'transactional',
    title_template: 'הודעה חדשה 💬', body_template: '{sender_name}: {message_preview}',
    deep_link: '/chat/{task_id}', tag_template: 'chat_{task_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 4 },
  { event_key: 'new_matching_task', event_label: 'משימה חדשה מתאימה (לעובדים)', category: 'transactional',
    title_template: 'משימה חדשה מתאימה לך 🎯', body_template: '{task_title} — {category_label}',
    deep_link: '/task/{task_id}', tag_template: 'new_match_{task_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 5 },
  { event_key: 'no_show_report', event_label: 'דיווח No-Show (לעובד)', category: 'transactional',
    title_template: 'דווחו עליך כ-no-show ⚠️', body_template: 'דווחו שלא הופעת למשימה "{task_title}" — זה עלול להשפיע על הדירוג שלך',
    deep_link: '/task/{task_id}', tag_template: 'no_show_{task_id}_{worker_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'high', sort_order: 6 },
  { event_key: 'review_created', event_label: 'ביקורת חדשה', category: 'transactional',
    title_template: '{who_label} דירג אותך {stars}', body_template: '{review_body}',
    deep_link: '/profile', tag_template: 'review_{task_id}_{reviewee_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 7 },
  { event_key: 'task_cancelled', event_label: 'משימה בוטלה (לעובד)', category: 'transactional',
    title_template: 'המפרסם ביטל את המשימה ❌', body_template: 'המשימה "{task_title}" בוטלה על ידי המפרסם',
    deep_link: '/', tag_template: 'task_cancelled_{task_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 8 },
  { event_key: 'task_completed', event_label: 'משימה הושלמה (לעובד)', category: 'transactional',
    title_template: 'המפרסם אישר את סיום המשימה ✅', body_template: 'המפרסם אישר שהשלמת את "{task_title}" — בדוק את הדירוג שקיבלת',
    deep_link: '/task/{task_id}', tag_template: 'task_completed_{task_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', send_email: true,
    email_subject_template: 'המשימה "{task_title}" הושלמה! כל הכבוד 🎉', sort_order: 9 },
  { event_key: 'worker_left_task', event_label: 'עובד עזב משימה (למפרסם)', category: 'transactional',
    title_template: '{worker_name} עזב את המשימה 😕', body_template: '{worker_name} ביטל את הקבלת המשימה "{task_title}" — אתה יכול לבחור עובד חדש',
    deep_link: '/task/{task_id}', tag_template: 'worker_left_{task_id}',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 10 },
  { event_key: 'worker_status_on_the_way', event_label: 'עובד בדרך (למפרסם)', category: 'transactional',
    title_template: 'העובד יוצא אליך 🏃', body_template: 'העובד בדרך למשימה "{task_title}"',
    deep_link: '/task/{task_id}', tag_template: 'worker_status_{task_id}_on_the_way',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 11 },
  { event_key: 'worker_status_arrived', event_label: 'עובד הגיע (למפרסם)', category: 'transactional',
    title_template: 'העובד הגיע 📍', body_template: 'העובד הגיע ליעד של "{task_title}"',
    deep_link: '/task/{task_id}', tag_template: 'worker_status_{task_id}_arrived',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 12 },
  { event_key: 'worker_status_done', event_label: 'עובד סיים (למפרסם)', category: 'transactional',
    title_template: 'העובד סיים ✅', body_template: 'העובד סיים את "{task_title}" — אפשר לאשר',
    deep_link: '/task/{task_id}', tag_template: 'worker_status_{task_id}_done',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 13 },

  // ── Achievement / Trust (חדשות — עידוד אימות) ──
  { event_key: 'verification_approved_green', event_label: 'ווי ירוק אושר 🟢', category: 'achievement',
    title_template: 'מזל טוב! הווי הירוק שלך הגיע! 🟢', body_template: 'עכשיו כשאתה מאומת, הסיכוי שלך להתקבל למשימות עולה משמעותית. בהצלחה במשימה הבאה!',
    deep_link: '/profile', tag_template: 'verification_green',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'high', sort_order: 20 },
  { event_key: 'verification_approved_gold', event_label: 'ווי זהב אושר 🏆', category: 'achievement',
    title_template: 'ווי זהב! אתה בליגת המקצוענים 🏆', body_template: 'הפרופיל שלך קיבל ווי זהב — מפרסמים סומכים עליך יותר מכולם. כל הכבוד! לחץ לצפייה בפרופיל שלך',
    deep_link: '/profile', tag_template: 'verification_gold',
    segments: ['all'], is_active: true, cooldown_minutes: 0, priority: 'high', sort_order: 21 },

  // ── Engagement / Retention ──
  { event_key: 'daily_earnings_summary', event_label: 'סיכום יומי הכנסות 💰', category: 'engagement',
    title_template: 'יום מוצלח! 💰', body_template: 'ביצעת {count} משימות והרווחת {amount} ג\'ובות היום. תמשיך ככה! לחץ לצפייה בדשבורד הרווחים',
    deep_link: '/earnings', tag_template: 'daily_summary',
    segments: ['all'], is_active: true, cooldown_minutes: 1440, priority: 'low', sort_order: 30 },
  { event_key: 'applications_rejected_unverified', event_label: 'עידוד אימות אחרי דחייה', category: 'trust',
    title_template: 'הבקשות שלך נשלחות, אבל מפרסמים רוצים ביטחון 🛡️', body_template: 'הוספת ווי ירוק (אימות זהות) יכולה להקפיץ את סיכויי ההתקבלות שלך פי 3. זה לוקח דקה, בוא להתחיל!',
    deep_link: '/profile', tag_template: 'encourage_verify',
    segments: ['unverified'], is_active: true, cooldown_minutes: 10080, priority: 'normal', sort_order: 40 },
  { event_key: 'low_balance', event_label: 'יתרה נמוכה — עידוד רכישה', category: 'monetization',
    title_template: 'היתרה שלך נמוכה 💸', body_template: 'זה אומר שאתה מפספס משימות שוות. קנה ג\'ובות עכשיו כדי לא להישאר מאחור.',
    deep_link: '/wallet', tag_template: 'low_balance',
    segments: ['low_balance'], is_active: true, cooldown_minutes: 4320, priority: 'normal', sort_order: 50 },
  { event_key: 'retention_3days', event_label: 'חזרה אחרי 3 ימים', category: 'retention',
    title_template: 'מתגעגעים אליך! 👋', body_template: 'יש עשרות משימות פתוחות שמחכות לניסיון שלך. בוא לחזור לזירה!',
    deep_link: '/', tag_template: 'retention_3d',
    segments: ['experienced_worker'], is_active: true, cooldown_minutes: 10080, priority: 'low', sort_order: 60 },

  // ── סוכנים — התראות דרבון אוטומטיות ──
  { event_key: 'agent_daily_referral_summary', event_label: 'סיכום יומי הפניות לסוכן 🌟', category: 'engagement',
    title_template: 'סיכום יומי: {count} {count_label} היום 🌟', body_template: 'הבאת {count} {count_label} חדשות היום! {encourage} המשך לשתף את הקישור ולבנות את הרשת שלך.',
    deep_link: '/agent-dashboard', tag_template: 'agent_daily_referral_summary',
    segments: ['agent'], is_active: true, cooldown_minutes: 0, priority: 'normal', sort_order: 70 },
  { event_key: 'agent_encourage_no_referrals', event_label: 'עידוד סוכן ללא הפניות 🚀', category: 'engagement',
    title_template: 'הרשת שלך מחכה לך! 🚀', body_template: 'עדיין לא הבאת הרשמות השבוע. שתף את קישור ההפניה שלך עכשיו — כל הרשמה שווה כסף ובונה את המוניטין שלך כסוכן.',
    deep_link: '/agent-dashboard', tag_template: 'agent_encourage_no_referrals',
    segments: ['agent_inactive'], is_active: true, cooldown_minutes: 10080, priority: 'normal', sort_order: 71 },
  { event_key: 'agent_encourage_active', event_label: 'עידוד סוכן פעיל 🔥', category: 'engagement',
    title_template: 'אתה על הדרך הנכון! 🔥', body_template: 'הקישורים שלך מייצרים הרשמות. המשך לדחוף — הסוכנים המצטיינים מרוויחים הכי הרבה. בוא נראה את הדשבורד שלך.',
    deep_link: '/agent-dashboard', tag_template: 'agent_encourage_active',
    segments: ['agent_active'], is_active: true, cooldown_minutes: 4320, priority: 'normal', sort_order: 72 },
  { event_key: 'agent_welcome', event_label: 'ברוכים הבאים סוכן חדש 🤝', category: 'engagement',
    title_template: 'ברוך הבא לצוות הסוכנים של Joba24! 🤝', body_template: 'שלך להתחיל להפיץ את הקישור שלך ולבנות רשת. כל הרשמה דרכך מזכה אותך בהטבות. בוא נצפה בדשבורד.',
    deep_link: '/agent-dashboard', tag_template: 'agent_welcome',
    segments: ['agent'], is_active: true, cooldown_minutes: 0, priority: 'high', sort_order: 73 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { action, config_id, config_data, event_key, user_id, variables } = await req.json();

    // ── action: list — שליפת כל ההגדרות ──
    if (action === 'list') {
      const configs = await base44.asServiceRole.entities.NotificationConfig.list('sort_order', 100);
      const recentLogs = await base44.asServiceRole.entities.NotificationLog.list('-created_date', 50);
      const totalSent = await base44.asServiceRole.entities.NotificationLog.filter({ status: 'sent' });
      const totalSkipped = await base44.asServiceRole.entities.NotificationLog.filter({ status: 'skipped' });
      return Response.json({
        configs,
        recent_logs: recentLogs,
        stats: { total_sent: totalSent.length, total_skipped: totalSkipped.length },
      });
    }

    // ── action: seed — טעינת הגדרות ברירת מחדל ──
    if (action === 'seed') {
      const existing = await base44.asServiceRole.entities.NotificationConfig.list('sort_order', 100);
      const existingKeys = new Set(existing.map(c => c.event_key));
      let created = 0;
      for (const cfg of DEFAULT_SEED_CONFIGS) {
        if (!existingKeys.has(cfg.event_key)) {
          await base44.asServiceRole.entities.NotificationConfig.create(cfg);
          created++;
        }
      }
      return Response.json({ success: true, created, message: `נוצרו ${created} הגדרות חדשות` });
    }

    // ── action: create — יצירת הגדרה חדשה ──
    if (action === 'create') {
      if (!config_data?.event_key || !config_data?.title_template || !config_data?.body_template) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      const created = await base44.asServiceRole.entities.NotificationConfig.create(config_data);
      return Response.json({ success: true, config: created });
    }

    // ── action: update — עדכון הגדרה ──
    if (action === 'update') {
      if (!config_id) return Response.json({ error: 'Missing config_id' }, { status: 400 });
      const updated = await base44.asServiceRole.entities.NotificationConfig.update(config_id, config_data);
      return Response.json({ success: true, config: updated });
    }

    // ── action: toggle — הפעלה/כיבוי ──
    if (action === 'toggle') {
      if (!config_id) return Response.json({ error: 'Missing config_id' }, { status: 400 });
      const configs = await base44.asServiceRole.entities.NotificationConfig.filter({ id: config_id });
      const cfg = configs[0];
      if (!cfg) return Response.json({ error: 'Config not found' }, { status: 404 });
      const updated = await base44.asServiceRole.entities.NotificationConfig.update(config_id, { is_active: !cfg.is_active });
      return Response.json({ success: true, is_active: !cfg.is_active });
    }

    // ── action: send_test — שליחה ידנית (force) ──
    if (action === 'send_test') {
      if (!event_key || !user_id) return Response.json({ error: 'Missing event_key or user_id' }, { status: 400 });
      const result = await base44.asServiceRole.functions.invoke('notificationManager', {
        event_key,
        user_ids: [user_id],
        variables: variables || {},
        force: true,
      });
      return Response.json({ success: true, result: result?.data ?? result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[adminUpdateNotificationConfig] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});