import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || !data.id || !data.category || data.status !== 'OPEN') {
      return Response.json({ sent: 0, reason: 'Not a new open task' });
    }

    const taskId = data.id;
    const taskCategory = data.category;
    const taskLat = data.lat;
    const taskLng = data.lng;
    const taskTitle = data.title || 'משימה חדשה';

    // Fetch all users with FCM tokens (paginate to get everyone)
    let allUsers = [];
    let skip = 0;
    const pageSize = 200;
    while (true) {
      const page = await base44.asServiceRole.entities.User.list('-created_date', pageSize, skip);
      allUsers = allUsers.concat(page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    const eligibleWorkers = allUsers.filter(u =>
      u.fcm_tokens?.length > 0 &&
      u.id !== data.client_id &&
      u.role !== 'admin'
    );

    if (!eligibleWorkers.length) {
      return Response.json({ sent: 0, reason: 'No eligible workers' });
    }

    // For each worker, check relevance: category match AND/OR proximity
    const matchedUserIds = [];
    for (const worker of eligibleWorkers) {
      const categoryMatch = Array.isArray(worker.preferred_categories) &&
        worker.preferred_categories.includes(taskCategory);

      let nearby = false;
      if (taskLat && taskLng && worker.last_lat && worker.last_lng) {
        const dist = Math.hypot(taskLat - worker.last_lat, taskLng - worker.last_lng);
        nearby = dist < 0.18; // ~20km
      }

      if (categoryMatch || nearby) {
        matchedUserIds.push(worker.id);
      }
    }

    if (!matchedUserIds.length) {
      return Response.json({ sent: 0, reason: 'No matched workers' });
    }

    const matchType = taskCategory ? getCategoryLabel(taskCategory) : 'משימה חדשה';
    let sent = 0;

    // Send in batches of 100 to avoid payload limits
    const BATCH = 100;
    for (let i = 0; i < matchedUserIds.length; i += BATCH) {
      const batch = matchedUserIds.slice(i, i + BATCH);
      const result = await base44.asServiceRole.functions.invoke('sendPushNotification', {
        user_ids: batch,
        title: `משימה חדשה מתאימה לך 🎯`,
        body: `${taskTitle} — ${matchType}`,
        url: `/task/${taskId}`,
        tag: `new_match_${taskId}`,
        click_action: `/task/${taskId}`,
      });
      sent += result?.data?.sent ?? result?.sent ?? 0;
    }

    return Response.json({ sent, total: matchedUserIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getCategoryLabel(cat) {
  const labels = {
    plumbing: 'אינסטלציה', electricity: 'חשמלאות', handyman: 'הנדימן / תיקונים',
    cleaning: 'ניקיון', moving: 'הובלה', heavy_lifting: 'עזרה פיזית',
    painting: 'צביעה', carpentry: 'נגרות', ac: 'מזגנים',
    locksmith: 'מנעולן', gardening: 'גינון', home_maintenance: 'תחזוקת בית',
    transportation: 'הסעות וטרמפים', delivery: 'משלוח', shopping: 'קניות',
    pets: 'בעלי חיים', babysitting: 'בייביסיטר', elderly_care: 'סיוע לקשישים',
    tutoring: 'שיעורים פרטיים', fitness: 'כושר וספורט', photography: 'צילום ותוכן',
    events: 'אירועים', personal_help: 'עזרה אישית', it_support: 'מחשבים', other: 'אחר',
  };
  return labels[cat] || cat;
}