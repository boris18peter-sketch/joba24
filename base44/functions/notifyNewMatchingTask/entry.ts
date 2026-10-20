import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getJobaSettings } from '../../shared/jobaSettings.ts';

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

    // SECURITY (pre-launch gate): only reach users who can actually USE the app —
    // unapproved users on the waiting page must not receive task notifications.
    //
    // This mirrors the app's own access gate (checkApprovalStatus + Layout):
    // active = approved, admin, or released by the launch settings. Requiring
    // the literal `is_approved === true` flag alone was too narrow — an account
    // whose approval lives in its verification state (kyc_status/is_verified)
    // and which the launch settings had already released was silently skipped,
    // so a fully active verified professional never heard about a matching job.
    const settings = await getJobaSettings(base44);
    const gateActive = settings.pre_launch_gate_active !== false;
    const releaseMode = settings.pre_launch_release_mode;
    const releaseAtMs = settings.pre_launch_release_at
      ? new Date(settings.pre_launch_release_at).getTime()
      : NaN;

    const isActiveUser = (u) => {
      if (u.is_blocked === true || u.disabled === true) return false;
      if (u.is_approved === true || u.role === 'admin') return true;
      if (gateActive) return false;
      if (releaseMode === 'all') return true;
      if (releaseMode === 'new_only' && Number.isFinite(releaseAtMs)) {
        const createdMs = u.created_date ? new Date(u.created_date).getTime() : NaN;
        return Number.isFinite(createdMs) && createdMs >= releaseAtMs;
      }
      return false;
    };

    // ── The task's own branch of the taxonomy is read FIRST ─────────────────
    // (Moved above the user scan, because the ancestry it produces is part of
    // the scan's own filter — see the match clauses below.)
    //
    // The category name in the notification must be the REAL, current label of
    // the task's category — not a raw key and not a legacy hardcoded table that
    // drifted away from the live taxonomy.
    //
    // This used to download the ENTIRE category table on every publish — every
    // service, every root, and every heavy field each row carries (its whole
    // form definition, its status flow, its translations, its examples) — purely
    // to resolve one label and one chain of ancestors. Walking up from the
    // task's own category asks for exactly the handful of rows the notification
    // needs, and the map it builds is the same one the code below already reads.
    const categoryByKey: Record<string, any> = {};
    let nodeKey: string | null = taskCategory;
    for (let depth = 0; nodeKey && depth < 8; depth++) {
      if (categoryByKey[nodeKey]) break;
      const rows = await base44.asServiceRole.entities.GlobalCategory.filter({ category_key: nodeKey }, 'category_key', 1);
      const row = rows?.[0];
      if (!row) break;
      categoryByKey[row.category_key] = row;
      nodeKey = row.parent_key || null;
    }
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

    // ── What the MATCH needs from a worker — pushed into the query ──────────
    // A worker is notified only when the task is a "For You" match, and every
    // branch of that match needs one of exactly three things from the worker:
    //
    //   · a category preference overlapping the task's ancestry → categoryMatch
    //   · a preferred city → the city match, AND the city→coords proximity route
    //   · GPS coordinates  → the other way to be "nearby"
    //
    // A worker with none of the three cannot match under ANY branch, so the
    // database excludes them instead of shipping them here to be thrown away.
    //
    // This is deliberately a SUPERSET: it over-includes (an empty
    // preferred_cities array still passes) and the match below still decides
    // every single recipient. It removes only the provably unreachable.
    //
    // Each clause is added only when the TASK makes that route possible at all:
    // a task with no coordinates can never produce a "nearby", and one with no
    // city can never produce a city match — so those clauses are dropped rather
    // than scanning for a match that cannot happen.
    const taskAncestry = taskCategory ? ancestryOf(taskCategory) : [];
    const matchCategories = [...new Set([taskCategory, ...taskAncestry].filter(Boolean))];
    const taskHasCoords = !!(taskLat && taskLng);

    const matchClauses: any[] = [];
    if (matchCategories.length) matchClauses.push({ preferred_categories: { $in: matchCategories } });
    // A preferred city feeds the city match when the task names a city, and the
    // city→coordinates proximity fallback whenever the task has coordinates.
    if (taskCity || taskHasCoords) matchClauses.push({ preferred_cities: { $exists: true } });
    if (taskHasCoords) matchClauses.push({ last_lat: { $exists: true } });

    if (!matchClauses.length) {
      // Nothing about this task can match anyone: no category, no city, no
      // coordinates. There is no candidate set to read.
      return Response.json({ sent: 0, reason: 'Task carries nothing to match on' });
    }

    // SECURITY (pre-launch gate) — unchanged: only reach users who can actually
    // USE the app. Unapproved users on the waiting page must not receive task
    // notifications. Active = approved, admin, or released by the launch settings.
    const activeCondition = gateActive
      ? { $or: [{ is_approved: true }, { role: 'admin' }] }
      : (releaseMode === 'new_only' && Number.isFinite(releaseAtMs))
        ? { $or: [{ is_approved: true }, { role: 'admin' }, { created_date: { $gte: new Date(releaseAtMs).toISOString() } }] }
        : {};

    // ── Only users who can actually be notified are read ────────────────────
    // This used to page through EVERY user in the app on every single publish,
    // and then throw almost all of them away in JavaScript. Measured on the live
    // app it was scanning 160 users to find 8 eligible ones — 95% of the work,
    // the bandwidth and the latency spent purely to discard records. That ratio
    // only gets worse as the app grows, and because this runs on EVERY new task
    // it is the most repeated cost in the whole system.
    //
    // The questions the database can answer exactly — "has a push token", "is an
    // active account", and "could this worker match at all" — are now asked in
    // the query, so only the survivors travel. The matching logic below is
    // unchanged and still decides every single recipient, and isActiveUser()
    // still re-checks every row that comes back, so nobody who used to be
    // notified can be missed.
    //
    // The clauses are combined with $and rather than spread, because the launch
    // gate and the match clauses are each an $or of their own — spreading them
    // would have let one overwrite the other.
    const scanQuery = {
      $and: [
        { fcm_tokens: { $exists: true } },
        { is_blocked: { $ne: true } },
        { disabled: { $ne: true } },
        ...(Object.keys(activeCondition).length ? [activeCondition] : []),
        { $or: matchClauses },
      ],
    };

    let allUsers = [];
    let skip = 0;
    const pageSize = 200;
    while (true) {
      const page = await base44.asServiceRole.entities.User.filter(scanQuery, '-created_date', pageSize, skip);
      allUsers = allUsers.concat(page);
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    const eligibleWorkers = allUsers.filter(u =>
      u.fcm_tokens?.length > 0 &&
      u.id !== data.client_id &&
      isActiveUser(u)
    );

    if (!eligibleWorkers.length) {
      return Response.json({ sent: 0, reason: 'No eligible workers' });
    }

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