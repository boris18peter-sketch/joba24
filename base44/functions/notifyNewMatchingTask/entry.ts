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

    // Find workers: get all users who have tasks completed and fcm_tokens
    // Limit to 30 active workers to avoid spam
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 200);
    const eligibleWorkers = allUsers.filter(u => 
      u.fcm_tokens?.length > 0 &&
      u.id !== data.client_id &&
      u.role !== 'admin'
    );

    if (!eligibleWorkers.length) {
      return Response.json({ sent: 0, reason: 'No eligible workers' });
    }

    // For each worker, check if the task is relevant
    // Relevance: same category OR nearby location
    const notifications = [];
    for (const worker of eligibleWorkers.slice(0, 50)) {
      // Category match is the strongest signal
      const categoryMatch = worker.preferred_categories?.includes?.(taskCategory);
      
      // Location proximity: check if worker's last known location is close
      let nearby = false;
      if (taskLat && taskLng && worker.last_lat && worker.last_lng) {
        const dist = Math.hypot(taskLat - worker.last_lat, taskLng - worker.last_lng);
        nearby = dist < 0.3; // ~30km
      }

      const isRelevant = categoryMatch || nearby;
      if (!isRelevant) continue;

      // Build message
      const matchType = categoryMatch && nearby ? 'קרובה ומתאימה' : categoryMatch ? 'מתאימה לך' : 'קרובה אליך';
      
      notifications.push({
        userId: worker.id,
        title: `משימה ${matchType} 🎯`,
        body: `${taskTitle} — ${getCategoryLabel(taskCategory)}`,
        url: `/task/${taskId}`,
        tag: `new_match_${taskId}`,
      });
    }

    // Send in batches of 10 to avoid overwhelming
    const sent = [];
    for (const n of notifications.slice(0, 30)) {
      const result = await base44.asServiceRole.functions.invoke('sendPushNotification', {
        user_ids: [n.userId],
        title: n.title,
        body: n.body,
        url: n.url,
        tag: n.tag,
        click_action: n.url,
      });
      if (result?.sent) sent.push(n.userId);
    }

    return Response.json({ sent: sent.length, total: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getCategoryLabel(cat) {
  const labels = {
    plumbing: 'אינסטלציה', electricity: 'חשמל', gardening: 'גינון',
    cleaning: 'ניקיון', moving: 'הובלה', painting: 'צביעה',
    carpentry: 'נגרות', ac: 'מיזוג', locksmith: 'מנעולן',
    shopping: 'קניות', delivery: 'שליחויות', babysitting: 'שמרטפות',
    tutoring: 'שיעורים פרטיים', it_support: 'תמיכה טכנית', other: 'כללי',
  };
  return labels[cat] || cat;
}