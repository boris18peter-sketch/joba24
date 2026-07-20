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

    const eligibleWorkers = allUsers.filter(u =>
      u.fcm_tokens?.length > 0 &&
      u.id !== data.client_id
    );

    if (!eligibleWorkers.length) {
      return Response.json({ sent: 0, reason: 'No eligible workers' });
    }

    // ── "For You" matching logic (mirrors feedRanker.js) ────────────────────
    // A worker receives a notification if the task is a "For You" match:
    //
    // 1. No preferred_categories → NO notifications (user hasn't set preferences)
    // 2. "other" only → only "other" category tasks OR nearby tasks
    // 3. Specific categories → category match OR city match OR nearby
    //
    // "Nearby" uses the same logic as the feed: GPS (last_lat/last_lng) first,
    // then preferred_cities → CITY_COORDS fallback. < 5km = nearby (same as feed).
    const NEARBY_KM = 5; // matches isNearby badge in feedRanker.js
    const matchedUserIds = [];

    for (const worker of eligibleWorkers) {
      const prefs = Array.isArray(worker.preferred_categories) ? worker.preferred_categories : [];

      // Rule 1: No categories selected → no notifications
      if (prefs.length === 0) continue;

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

      // Category match
      const categoryMatch = taskCategory && prefs.includes(taskCategory);

      let isMatch = false;

      if (isOtherOnly) {
        // Rule 2: "other" only → only "other" tasks OR nearby
        isMatch = taskCategory === 'other' || nearby;
      } else {
        // Rule 3: Specific categories → category match OR city match OR nearby
        isMatch = categoryMatch || cityMatch || nearby;
      }

      if (isMatch) {
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