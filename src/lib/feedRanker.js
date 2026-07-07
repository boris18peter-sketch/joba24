/**
 * feedRanker.js — Joba24 Personalized Feed Ranking Engine
 *
 * feed_score =
 *   (distance        * 0.25)
 * + (recent_activity * 0.15)
 * + (task_relevance  * 0.35)
 * + (personal_fit    * 0.15)
 * + (urgency         * 0.05)
 * + (reliability_fit * 0.05)
 *
 * Duration is derived from category_details (hours or schedule slots),
 * NOT from the deprecated estimated_time field.
 */

const WEIGHTS = {
  distance:        0.25,
  recent_activity: 0.15,
  task_relevance:  0.35,
  personal_fit:    0.15,
  urgency:         0.05,
  reliability_fit: 0.05,
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function haversineKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const URGENCY_KEYWORDS = [
  'עכשיו', 'דחוף', 'היום', 'asap', 'urgent', 'בדחיפות',
  'דחוף!', 'עכשיו!', 'תיקון דחוף', 'חייב היום', 'בהקדם',
];

/**
 * Computes task duration in minutes from category_details.
 * Uses schedule slots if available, otherwise hours field.
 * Falls back to null when no duration data exists.
 */
export function getTaskDurationMinutes(task) {
  const cd = task?.category_details;
  if (!cd) return null;

  // Schedule-based: sum all slot durations
  if (Array.isArray(cd.schedule) && cd.schedule.length > 0) {
    let total = 0;
    for (const slot of cd.schedule) {
      const [sh, sm] = (slot.start || '').split(':').map(Number);
      const [eh, em] = (slot.end || '').split(':').map(Number);
      if (isNaN(sh) || isNaN(eh)) continue;
      total += (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
    }
    return total > 0 ? total : null;
  }

  // Hours-based
  if (cd.hours != null) {
    const hours = parseFloat(cd.hours);
    if (!isNaN(hours) && hours > 0) return Math.round(hours * 60);
  }

  return null;
}

// ── City coordinates fallback (major Israeli cities) ───────────────────────
// Used when GPS is unavailable but user has preferred_cities set.
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

/**
 * Resolves user location: GPS first, then preferred city coordinates.
 * Returns { lat, lng, source: 'gps' | 'city' | null }.
 */
export function resolveUserLocation(gpsLocation, preferredCities = []) {
  if (gpsLocation?.lat && gpsLocation?.lng) {
    return { ...gpsLocation, source: 'gps' };
  }
  if (preferredCities?.length > 0) {
    for (const city of preferredCities) {
      const coords = CITY_COORDS[city];
      if (coords) return { ...coords, source: 'city' };
    }
  }
  return null;
}

// ── Behavioral Profile Builder ─────────────────────────────────────────────

/**
 * Builds a rich behavioral profile from the user's applications + completed tasks.
 * Returns a profile with learned patterns (category, price range, location, duration).
 * Also returns `hasStrongPattern` = true only when there's a clear, repeated signal.
 */
export function buildBehavioralProfile(applications = [], completedTasks = []) {
  const history = [...applications, ...completedTasks];
  if (history.length === 0) return { hasStrongPattern: false };

  // Category frequency
  const catCount = {};
  history.forEach(t => { if (t.category) catCount[t.category] = (catCount[t.category] || 0) + 1; });

  // Price range (average ± 40% tolerance)
  const prices = history.map(t => t.price).filter(p => p != null && p > 0);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  // Duration frequency (buckets: short <30m, medium 30m-2h, long >2h)
  const durationCount = {};
  history.forEach(t => {
    const mins = getTaskDurationMinutes(t);
    if (mins == null) return;
    const bucket = mins < 30 ? 'short' : mins < 120 ? 'medium' : 'long';
    durationCount[bucket] = (durationCount[bucket] || 0) + 1;
  });

  // Location (city) frequency
  const cityCount = {};
  history.forEach(t => {
    const city = t.city || '';
    if (city) cityCount[city] = (cityCount[city] || 0) + 1;
  });

  // Preferred categories (appeared 2+ times)
  const preferredCategories = Object.entries(catCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  // Preferred cities (appeared 2+ times)
  const preferredCities = Object.entries(cityCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city);

  // Preferred duration bucket
  const preferredDuration = Object.entries(durationCount)
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d)[0] || null;

  // Price range (learned)
  const priceMin = avgPrice ? avgPrice * 0.5 : null;
  const priceMax = avgPrice ? avgPrice * 1.6 : null;

  // STRONG PATTERN: at least 2 signals confirmed with repetition
  const strongCat = preferredCategories.length >= 1;
  const strongCity = preferredCities.length >= 1;
  const strongPrice = prices.length >= 2;
  const patternCount = [strongCat, strongCity, strongPrice].filter(Boolean).length;
  const hasStrongPattern = history.length >= 3 && patternCount >= 2;

  return {
    hasStrongPattern,
    history,
    catCount,
    preferredCategories,
    preferredCities,
    preferredDuration,
    avgPrice,
    priceMin,
    priceMax,
    durationCount,
  };
}

/**
 * Score a task against the learned behavioral profile (0–1).
 * Higher = better match to what this user actually applies to / completes.
 */
function scorePersonalFit(task, profile) {
  if (!profile || !profile.hasStrongPattern) return 0.3; // neutral

  // If user has explicit preferred categories and task doesn't match — strong penalty
  if (profile.preferredCategories?.length > 0 && task.category && !profile.preferredCategories.includes(task.category)) {
    return 0.05;
  }

  let score = 0;
  let signals = 0;

  // Category match
  if (profile.catCount && task.category) {
    const maxCat = Math.max(...Object.values(profile.catCount));
    const taskCatCount = profile.catCount[task.category] || 0;
    score += taskCatCount / maxCat;
    signals++;
  }

  // Price range match
  if (profile.priceMin != null && profile.priceMax != null && task.price) {
    if (task.price >= profile.priceMin && task.price <= profile.priceMax) {
      score += 1.0;
    } else {
      const dist = Math.min(
        Math.abs(task.price - profile.priceMin),
        Math.abs(task.price - profile.priceMax)
      );
      score += Math.max(0, 1 - dist / (profile.avgPrice || 300));
    }
    signals++;
  }

  // City match
  if (profile.preferredCities?.length > 0 && task.city) {
    score += profile.preferredCities.includes(task.city) ? 1.0 : 0.1;
    signals++;
  }

  // Duration match (using category_details, not estimated_time)
  if (profile.preferredDuration && task) {
    const mins = getTaskDurationMinutes(task);
    if (mins != null) {
      const bucket = mins < 30 ? 'short' : mins < 120 ? 'medium' : 'long';
      score += bucket === profile.preferredDuration ? 1.0 : 0.3;
      signals++;
    }
  }

  return signals > 0 ? Math.min(score / signals, 1.0) : 0.3;
}

/**
 * Determine if a task is a "For You" pick — strong personal fit.
 * Only fires when the profile has a confirmed pattern.
 */
export function isForYouTask(task, profile) {
  if (!profile?.hasStrongPattern) return false;
  const fit = scorePersonalFit(task, profile);
  return fit >= 0.65;
}

// ── The 6 scoring dimensions (each returns 0–1) ────────────────────────────

function scoreDistance(task, resolvedLocation) {
  if (!resolvedLocation || !task.lat || !task.lng) return 0.5;
  const km = haversineKm(resolvedLocation.lat, resolvedLocation.lng, task.lat, task.lng);
  if (km === null) return 0.5;
  // City-based location is less precise — apply a small penalty so GPS always wins
  const sourcePenalty = resolvedLocation.source === 'city' ? 0.04 : 0;
  if (km < 1)   return 1.0 - sourcePenalty;
  if (km < 2)   return 0.92 - sourcePenalty;
  if (km < 5)   return 0.78 - sourcePenalty;
  if (km < 10)  return 0.58 - sourcePenalty;
  if (km < 20)  return 0.35 - sourcePenalty;
  if (km < 50)  return 0.14;
  return 0.04;
}

function scoreRecentActivity(task) {
  const ageMins = (Date.now() - new Date(task.created_date).getTime()) / 60000;
  let freshness;
  if (ageMins < 5)        freshness = 1.0;
  else if (ageMins < 15)  freshness = 0.93;
  else if (ageMins < 30)  freshness = 0.84;
  else if (ageMins < 60)  freshness = 0.70;
  else if (ageMins < 180) freshness = 0.50;
  else if (ageMins < 360) freshness = 0.32;
  else if (ageMins < 720) freshness = 0.18;
  else freshness = 0.06;
  const updatedMins = (Date.now() - new Date(task.updated_date || task.created_date).getTime()) / 60000;
  const activityBoost = updatedMins < 30 ? 0.12 : updatedMins < 120 ? 0.06 : 0;
  return Math.min(1.0, freshness + activityBoost);
}

function scoreTaskRelevance(task, workerProfile) {
  const { preferredCategories = [], categoryHistory = {} } = workerProfile;
  const cat = task.category || '';
  let catScore;
  if (preferredCategories.length > 0) {
    // User has explicit preferred categories — strongly penalize non-matching tasks
    if (preferredCategories.includes(cat)) {
      catScore = 1.0;
    } else {
      catScore = 0.05;
    }
  } else {
    // No explicit preferences — use behavioral history affinity
    const maxCount = Math.max(...Object.values(categoryHistory), 1);
    const affinity = (categoryHistory[cat] || 0) / maxCount;
    catScore = affinity > 0 ? 0.4 + affinity * 0.5 : 0.25;
  }

  // Budget score based on effective hourly rate (using category_details duration)
  const price = task.price || 0;
  const mins = getTaskDurationMinutes(task) || 60;
  const hourlyRate = (price / mins) * 60;
  let budgetScore;
  if (hourlyRate >= 150)     budgetScore = 1.0;
  else if (hourlyRate >= 80) budgetScore = 0.8;
  else if (hourlyRate >= 50) budgetScore = 0.6;
  else if (hourlyRate >= 30) budgetScore = 0.4;
  else budgetScore = 0.2;
  return catScore * 0.55 + budgetScore * 0.45;
}

function scoreUrgency(task) {
  // Urgency tag takes priority
  if (task.urgency_tag === 'immediate') return 1.0;
  if (task.urgency_tag === 'few_hours') return 0.7;
  if (task.urgency_tag === 'evening')   return 0.4;

  // Scheduled time — tasks happening soon get a boost
  if (task.scheduled_time) {
    const raw = String(task.scheduled_time);
    const sDate = new Date(raw.includes('T') && !raw.endsWith('Z') && !raw.includes('+') ? raw + 'Z' : raw);
    if (!isNaN(sDate.getTime())) {
      const hoursUntil = (sDate.getTime() - Date.now()) / 3600000;
      if (hoursUntil >= 0 && hoursUntil < 6)  return 0.92;
      if (hoursUntil >= 6 && hoursUntil < 24) return 0.65;
      if (hoursUntil >= 24 && hoursUntil < 48) return 0.40;
    }
  }

  // Schedule slots — earliest slot determines urgency
  const slots = task.category_details?.schedule;
  if (Array.isArray(slots) && slots.length > 0) {
    const first = [...slots].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
    const dt = new Date(`${first.date}T${first.start}:00`);
    if (!isNaN(dt.getTime())) {
      const hoursUntil = (dt.getTime() - Date.now()) / 3600000;
      if (hoursUntil >= 0 && hoursUntil < 6)  return 0.92;
      if (hoursUntil >= 6 && hoursUntil < 24) return 0.65;
      if (hoursUntil >= 24 && hoursUntil < 48) return 0.40;
    }
  }

  // Keyword-based urgency
  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  if (URGENCY_KEYWORDS.some(kw => text.includes(kw))) return 1.0;

  // Expiry-based urgency
  if (task.expires_at) {
    const minsLeft = (new Date(task.expires_at) - Date.now()) / 60000;
    if (minsLeft < 60)  return 0.85;
    if (minsLeft < 180) return 0.55;
    if (minsLeft < 360) return 0.30;
  }
  return 0.1;
}

function scoreReliabilityFit(task) {
  let score = 0.25;
  if (task.client_verified)             score += 0.25;
  if (task.client_rating >= 4.5)        score += 0.20;
  else if (task.client_rating >= 3.5)   score += 0.10;
  if (task.payment_status === 'funded') score += 0.15;
  const applicants = (task.applicants || []).length;
  if (applicants === 0)      score += 0.15;
  else if (applicants <= 2)  score += 0.08;
  return Math.min(score, 1.0);
}

// ── Badge helper ─────────────────────────────────────────────────────────────

function buildBadges(task, distKm, profile) {
  const ageMins = (Date.now() - new Date(task.created_date).getTime()) / 60000;
  return {
    isUrgent:         task.urgency_tag === 'immediate' || scoreUrgency(task) > 0.5,
    isNew:            ageMins < 30,
    isFunded:         task.payment_status === 'funded',
    isNearby:         distKm !== null && distKm < 5,
    isHighPay:        (task.price || 0) >= 300,
    isVerifiedClient: !!task.client_verified,
    isLowComp:        (task.applicants || []).length === 0,
    isForYou:         isForYouTask(task, profile),
  };
}

// ── Main Ranking Function ──────────────────────────────────────────────────

/**
 * @param {Array}  tasks            — raw OPEN tasks
 * @param {Object} userLocation     — { lat, lng } from GPS, or null
 * @param {Object} workerProfile    — { preferredCategories, categoryHistory, preferredCities }
 * @param {Object} opts             — { isLoggedIn, behavioralProfile, userPreferredCities }
 * @returns {Array} sorted by feed_score, each enriched with _feedScore + _badges + _scores
 */
export function rankFeedTasks(tasks, userLocation, workerProfile = {}, opts = {}) {
  const { isLoggedIn = true, behavioralProfile = null, userPreferredCities = [] } = opts;

  // Resolve location: GPS first, then user's preferred cities → city coordinates
  const resolvedLocation = resolveUserLocation(userLocation, [
    ...(userPreferredCities || []),
    ...(workerProfile?.preferredCities || []),
  ]);

  // ─ FALLBACK A: not logged in → nearest tasks first
  if (!isLoggedIn) {
    return tasks
      .map(task => {
        const distKm = resolvedLocation
          ? haversineKm(resolvedLocation.lat, resolvedLocation.lng, task.lat, task.lng)
          : null;
        const feedScore = distKm !== null ? Math.max(0, 100 - distKm * 5) : 50;
        return { ...task, _distKm: distKm, _feedScore: feedScore, _badges: buildBadges(task, distKm, null), _scores: {} };
      })
      .sort((a, b) =>
        a._distKm !== null && b._distKm !== null
          ? a._distKm - b._distKm
          : b._feedScore - a._feedScore
      );
  }

  // ─ MAIN: logged in (with or without location) → full personalized feed_score
  // When no location at all, distance dimension is neutral (0.5) but other
  // dimensions still rank meaningfully.
  return tasks
    .map(task => {
      const distKm = resolvedLocation
        ? haversineKm(resolvedLocation.lat, resolvedLocation.lng, task.lat, task.lng)
        : null;

      const s_distance        = scoreDistance(task, resolvedLocation);
      const s_recent_activity = scoreRecentActivity(task);
      const s_task_relevance  = scoreTaskRelevance(task, workerProfile);
      const s_personal_fit    = scorePersonalFit(task, behavioralProfile);
      const s_urgency         = scoreUrgency(task);
      const s_reliability_fit = scoreReliabilityFit(task);

      const feedScore = (
        s_distance        * WEIGHTS.distance +
        s_recent_activity * WEIGHTS.recent_activity +
        s_task_relevance  * WEIGHTS.task_relevance +
        s_personal_fit    * WEIGHTS.personal_fit +
        s_urgency         * WEIGHTS.urgency +
        s_reliability_fit * WEIGHTS.reliability_fit
      ) * 100;

      return {
        ...task,
        _distKm:    distKm,
        _feedScore: feedScore,
        _scores: {
          distance:       s_distance,
          recentActivity: s_recent_activity,
          taskRelevance:  s_task_relevance,
          personalFit:    s_personal_fit,
          urgency:        s_urgency,
          reliabilityFit: s_reliability_fit,
        },
        _badges: buildBadges(task, distKm, behavioralProfile),
      };
    })
    .sort((a, b) => b._feedScore - a._feedScore);
}

/**
 * Build smart sections from ranked tasks.
 */
export function buildSmartSections(rankedTasks) {
  return {
    recommended: rankedTasks.slice(0, 5),
    nearby:      rankedTasks.filter(t => t._badges.isNearby).slice(0, 8),
    highPaying:  rankedTasks.filter(t => t._badges.isHighPay).sort((a, b) => b.price - a.price).slice(0, 8),
    urgent:      rankedTasks.filter(t => t._badges.isUrgent).slice(0, 6),
    newTasks:    rankedTasks.filter(t => t._badges.isNew).slice(0, 6),
  };
}