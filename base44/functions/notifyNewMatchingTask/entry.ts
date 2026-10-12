import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── City coordinates fallback (same as feedRanker.js) ──────────────────────
const CITY_COORDS = {
  'תל אביב': { lat: 32.0853, lng: 34.7818 },
  'הרצליה': { lat: 32.1665, lng: 34.8403 },
  'רמת גן': { lat: 32.0809, lng: 34.8100 },
  'גבעתיים': { lat: 32.0717, lng: 34.8108 },
  'רמת השרון': { lat: 32.1456, lng: 34.8364 },
  'חולון': { lat: 32.0158, lng: 34.7746 },
  'ראשון לציון': { lat: 31.9730, lng: 34.7925 },
  'בת ים': { lat: 32.0209, lng: 34.7555 },
  'בני ברק': { lat: 32.0844, lng: 34.8334 },
  'פתח תקווה': { lat: 32.0840, lng: 34.8878 },
  'רעננה': { lat: 32.1854, lng: 34.8714 },
  'נתניה': { lat: 32.3215, lng: 34.8532 },
  'כפר סבא': { lat: 32.1750, lng: 34.9050 },
  'הוד השרון': { lat: 32.1525, lng: 34.8844 },
  'ירושלים': { lat: 31.7683, lng: 35.2137 },
  'בית שמש': { lat: 31.7479, lng: 34.9886 },
  'מודיעין': { lat: 31.9012, lng: 35.0086 },
  'חיפה': { lat: 32.7940, lng: 34.9896 },
  'באר שבע': { lat: 31.2518, lng: 34.7913 },
  'אשדוד': { lat: 31.8040, lng: 34.6553 },
  'אשקלון': { lat: 31.6688, lng: 34.5716 },
  'רחובות': { lat: 31.8928, lng: 34.8110 },
  'נס ציונה': { lat: 31.9320, lng: 34.8000 },
  'אור יהודה': { lat: 32.0308, lng: 34.8520 },
  'קרית אונו': { lat: 32.0626, lng: 34.8570 },
};

// ── Haversine distance (same as feedRanker.js) ──────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolves worker location: GPS (last_lat/last_lng) first, then preferred city coordinates.
 * Mirrors resolveUserLocation() from feedRanker.js.
 */
function resolveWorkerLocation(worker) {
  if (worker.last_lat && worker.last_lng) {
    return { lat: worker.last_lat, lng: worker.last_lng };
  }
  if (Array.isArray(worker.preferred_cities) && worker.preferred_cities.length > 0) {
    for (const city of worker.preferred_cities) {
      const coords = CITY_COORDS[city];
      if (coords) return coords;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    if (!data || !data.id || data.status !== 'OPEN') {
      return Response.json({ sent: 0, reason: 'Not a new open task' });
    }

    const taskId = data.id;
    const taskCategory = data.category || null;
    const taskLat = data.lat;
    const taskLng = data.lng;
    const taskCity = data.city || null;
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

    // SECURITY (pre-launch gate): only notify APPROVED users. Without this filter,
    // unapproved users on the waiting page receive push notifications about new
    // tasks, and tapping the notification opens the TaskDetailSheet on top of
    // the waiting page — bypassing the gate entirely.
    const eligibleWorkers = allUsers.filter(u =>
      u.fcm_tokens?.length > 0 &&
      u.id !== data.client_id &&
      (u.is_approved === true || u.role === 'admin')
    );

    if (!eligibleWorkers.length) {
      return Response.json({ sent: 0, reason: 'No eligible workers' });
    }

    // ── Global category labels + ancestry ───────────────────────────────────
    // The category name in the notification must be the REAL, current label of
    // the task's category — not a raw key and not a legacy hardcoded table that
    // drifted away from the live taxonomy.
    const categoryRows: any[] = [];
    let catSkip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.GlobalCategory.list('category_key', 500, catSkip);
      categoryRows.push(...(page || []));
      if (!page || page.length < 500) break;
      catSkip += page.length;
    }
    const categoryByKey = Object.fromEntries(categoryRows.map(r => [r.category_key, r]));
    const labelForCategory = (key: string | null) =>
      (key && categoryByKey[key]?.label) || key || 'משימה חדשה';

    /** The category itself plus every ancestor, so a worker who picked a broad
     *  ROOT still matches a task categorised by the exact service beneath it. */
    const ancestryOf = (key: string) => {
      const chain: string[] = [];
      const seen = new Set<string>();
      let node = categoryByKey[key];
      while (node && !seen.has(node.category_key)) {
        seen.add(node.category_key);
        chain.push(node.category_key);
        node = node.parent_key ? categoryByKey[node.parent_key] : null;
      }
      return chain;
    };

    // ── "For You" matching logic (mirrors feedRanker.js) ────────────────────
    // A worker receives a notification when the task is a "For You" match:
    //
    // 1. No preferred_categories → still notify for work in the worker's own
    //    cities (see below). Staying silent here was why a local professional
    //    never heard about a job on his own doorstep.
    // 2. "other" only → "other" tasks, a city match, or nearby
    // 3. Specific categories → category match OR city match OR nearby
    //
    // "Nearby" uses the same logic as the feed: GPS (last_lat/last_lng) first,
    // then preferred_cities → CITY_COORDS fallback. < 5km = nearby (same as feed).
    const NEARBY_KM = 5; // matches isNearby badge in feedRanker.js
    const matchedUserIds = [];
    const taskAncestry = taskCategory ? ancestryOf(taskCategory) : [];

    for (const worker of eligibleWorkers) {
      const prefs = Array.isArray(worker.preferred_categories) ? worker.preferred_categories : [];

      // Check if "other" is the ONLY category
      const isOtherOnly = prefs.length === 1 && prefs[0] === 'other';

      // Resolve worker location for proximity check
      const workerLoc = resolveWorkerLocation(worker);
      let distKm = null;
      if (workerLoc && taskLat && taskLng) {
        distKm = haversineKm(workerLoc.lat, workerLoc.lng, taskLat, taskLng);
      }
      const nearby = distKm !== null && distKm < NEARBY_KM;

      // City match (flexible string matching)
      const cityMatch = taskCity &&
        Array.isArray(worker.preferred_cities) &&
        worker.preferred_cities.some(c => c === taskCity || taskCity.includes(c) || c.includes(taskCity));

      // Category match — ancestor-aware: a preference for a ROOT covers every
      // service beneath it, and the exact service always matches itself.
      const categoryMatch = !!taskCategory &&
        prefs.some(p => p === taskCategory || taskAncestry.includes(p));

      let isMatch = false;

      if (prefs.length === 0) {
        // No categories picked — still reachable for work in the cities the
        // worker chose, or right next to where they are.
        isMatch = !!(cityMatch || nearby);
      } else if (isOtherOnly) {
        isMatch = taskCategory === 'other' || cityMatch || nearby;
      } else {
        isMatch = categoryMatch || cityMatch || nearby;
      }

      if (isMatch) {
        matchedUserIds.push(worker.id);
      }
    }

    if (!matchedUserIds.length) {
      return Response.json({ sent: 0, reason: 'No matched workers' });
    }

    const matchType = labelForCategory(taskCategory);

    // ── Route through NotificationManager (handles segmentation, cooldown, batching) ──
    const result = await base44.asServiceRole.functions.invoke('notificationManager', {
      event_key: 'new_matching_task',
      user_ids: matchedUserIds,
      task_id: taskId,
      variables: {
        task_title: taskTitle,
        task_id: taskId,
        category_label: matchType,
      },
    });

    const sent = result?.data?.sent ?? result?.sent ?? 0;
    return Response.json({ sent, total: matchedUserIds.length, managerResult: result?.data ?? result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});