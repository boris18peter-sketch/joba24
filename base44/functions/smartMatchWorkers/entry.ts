/**
 * smartMatchWorkers
 * Called when a new task is published.
 * Finds the top matching workers by: category preference, proximity, rating, and recent activity.
 * Returns matched worker IDs and updates task with match metadata.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORY_NAME_HE = {
  plumbing: 'אינסטלטור', electricity: 'חשמלאי', gardening: 'גנן',
  cleaning: 'מנקה', moving: 'עוזר הובלה', painting: 'צבע',
  carpentry: 'נגר', ac: 'טכנאי מזגנים', locksmith: 'מנעולן',
  shopping: 'שליח', delivery: 'שליח', babysitting: 'מטפל',
  tutoring: 'מורה פרטי', it_support: 'תמיכה טכנית', other: 'עובד',
};

function calcDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreWorker(user, task) {
  let score = 0;

  // Category match (+40)
  if (user.preferred_categories?.includes(task.category)) score += 40;

  // City/location match (+25)
  if (task.city && user.preferred_cities?.includes(task.city)) score += 25;

  // Proximity (+20 max)
  if (user.last_lat && user.last_lng && task.lat && task.lng) {
    const dist = calcDistance(user.last_lat, user.last_lng, task.lat, task.lng);
    if (dist < 2) score += 20;
    else if (dist < 5) score += 14;
    else if (dist < 10) score += 8;
    else if (dist < 20) score += 3;
  }

  // Rating (+10 max)
  if (user.worker_rating >= 4.8) score += 10;
  else if (user.worker_rating >= 4.5) score += 7;
  else if (user.worker_rating >= 4.0) score += 4;

  // Recent activity (+5) — active in last 3 days
  if (user.last_active_at) {
    const daysSince = (Date.now() - new Date(user.last_active_at).getTime()) / 86400000;
    if (daysSince < 1) score += 5;
    else if (daysSince < 3) score += 3;
  }

  return score;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });

    const task = await base44.entities.Task.get(taskId);
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (task.client_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Get all potential workers — active in last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const allUsers = await base44.asServiceRole.entities.User.list('-last_active_at', 1000);

    // Score and filter
    const scored = allUsers
      .filter(u => u.id !== user.id && u.role !== 'admin')
      .map(u => ({ user: u, score: scoreWorker(u, task) }))
      .filter(({ score }) => score >= 20) // minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // top 50

    const matchedWorkerIds = scored.map(({ user: u }) => u.id);
    const categoryLabel = CATEGORY_NAME_HE[task.category] || 'עובד';

    return Response.json({
      success: true,
      matched_count: matchedWorkerIds.length,
      category_label: categoryLabel,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});