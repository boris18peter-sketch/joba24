import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * sendAgentDailyReferralSummary — רץ כל ערב (22:00 שעון ישראל).
 * מחשב לכל סוכן כמה הרשמות חדשות הביא היום (ReferralEvent עם registered=true שנוצרו היום),
 * ושולח לסוכנים עם לפחות הרשמה אחת התראת מוטיבציה עם כמות ההרשמות.
 *
 * רץ כ-scheduled automation (service role) — ללא auth משתמש.
 *
 * השליחה עוברת דרך notificationManager (event_key: agent_daily_referral_summary)
 * כדי שההתראה תופיע בדשבורד המנהל (NotificationConfig + NotificationLog).
 */
Deno.serve(async (_req) => {
  try {
    const base44 = createClientFromRequest(_req);

    const now = new Date();
    const israelOffset = 3 * 60 * 60 * 1000;
    const israelNow = new Date(now.getTime() + israelOffset);
    const startOfDay = new Date(israelNow);
    startOfDay.setHours(0, 0, 0, 0);
    const startUTC = new Date(startOfDay.getTime() - israelOffset).toISOString();

    const registeredToday = await base44.asServiceRole.entities.ReferralEvent.filter({
      registered: true,
      created_date: { $gte: startUTC },
    }, '-created_date', 500);

    if (!registeredToday.length) {
      return Response.json({ sent: 0, reason: 'No registrations today' });
    }

    const byAgent = {};
    for (const evt of registeredToday) {
      if (!evt.agent_code) continue;
      if (!byAgent[evt.agent_code]) byAgent[evt.agent_code] = { count: 0, names: [] };
      byAgent[evt.agent_code].count += 1;
      if (evt.user_name) byAgent[evt.agent_code].names.push(evt.user_name);
    }

    const agentCodes = Object.keys(byAgent);
    let sent = 0;

    for (const code of agentCodes) {
      try {
        const agents = await base44.asServiceRole.entities.User.filter({ agent_code: code }, '-created_date', 1);
        if (agents.length === 0) continue;
        const agent = agents[0];
        const info = byAgent[code];
        const count = info.count;

        // הכנת משתנים לתבנית ההתראה
        const countLabel = count === 1 ? 'הרשמה' : 'הרשמות';
        let encourage;
        if (count === 1) encourage = '🎯';
        else if (count <= 3) encourage = '🔥';
        else encourage = '🚀';

        // שליחה דרך notificationManager — נרשמת ב-NotificationLog ומופיעה בדשבורד
        const result = await base44.asServiceRole.functions.invoke('notificationManager', {
          event_key: 'agent_daily_referral_summary',
          user_ids: [agent.id],
          variables: {
            count,
            count_label: countLabel,
            encourage,
          },
        });

        // ספירת שליחות מוצלחות בלבד (sent > 0)
        if (result?.sent > 0 || result?.eligible > 0) sent += 1;
      } catch (e) {
        console.error(`sendAgentDailyReferralSummary: failed for agent ${code}:`, e);
      }
    }

    return Response.json({ sent, agents: agentCodes.length, totalRegistrations: registeredToday.length });
  } catch (error) {
    console.error('sendAgentDailyReferralSummary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});