/**
 * feedRanker.js — Joba24 Personalized Feed Ranking Engine
 *
 * feed_score =
 *   (distance        * 0.30)
 * + (recent_activity * 0.20)
 * + (task_relevance  * 0.20)
 * + (personal_fit    * 0.20)  ← NEW: learned behavior score
 * + (urgency         * 0.05)
 * + (reliability_fit * 0.05)
 */

const WEIGHTS = {
  distance:        0.30,
  recent_activity: 0.20,
  task_relevance:  0.20,
  personal_fit:    0.20,
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

// ── Behavioral Profile Builder ─────────────────────────────────────────────

/**
 * Builds a rich behavioral profile from the user's applications + completed tasks.
 * Returns a profile with learned patterns (category, price range, location, time).
 * Also returns `hasStrongPattern` = true only when there's a clear, repeated signal.
 */
export function buildBehavioralProfile(applications = [], completedTasks = []) {
  const history = [...applications, ...completedTasks];
  if (history.length === 0) return { hasStrongPattern: false };

  // Category frequency
  const catCount = {};
  history.forEach(t => { if (t.category) catCount[t.category] = (catCount[t.category] || 0) + 1; });

  // Price range (average ± 40% tolerance)
  const prices = history.map(t => t.price).filter(Boolean);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  // Estimated time frequency
  const timeCount = {};
  history.forEach(t => { if (t.estimated_time) timeCount[t.estimated_time] = (timeCount[t.estimated_time] || 0) + 1; });

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

  // Preferred time
  const preferredTime = Object.entries(timeCount)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)[0] || null;

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
    preferredTime,
    avgPrice,
    priceMin,
    priceMax,
    timeCount,
  };
}

/**
 * Score a task against the learned behavioral profile (0–1).
 * Higher = better match to what this user actually applies to / completes.
 */
function scorePersonalFit(task, profile) {
  if (!profile || !profile.hasStrongPattern) return 0.3; // neutral

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

  // Time match
  if (profile.preferredTime && task.estimated_time) {
    score += task.estimated_time === profile.preferredTime ? 1.0 : 0.3;
    signals++;
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

// ── The 5 scoring dimensions (each returns 0–1) ────────────────────────────

function scoreDistance(task, userLocation) {
  if (!userLocation || !task.lat || !task.lng) return 0.5;
  const km = haversineKm(userLocation.lat, userLocation.lng, task.lat, task.lng);
  if (km === null) return 0.5;
  if (km < 1)   return 1.0;
  if (km < 2)   return 0.92;
  if (km < 5)   return 0.78;
  if (km < 10)  return 0.58;
  if (km < 20)  return 0.35;
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
  if (preferredCategories.includes(cat)) {
    catScore = 1.0;
  } else {
    const maxCount = Math.max(...Object.values(categoryHistory), 1);
    const affinity = (categoryHistory[cat] || 0) / maxCount;
    catScore = affinity > 0 ? 0.4 + affinity * 0.5 : 0.25;
  }
  const price = task.price || 0;
  const timeToMins = { '15m': 15, '30m': 30, '1h': 60, '2h': 120 };
  const mins = timeToMins[task.estimated_time] || 60;
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
  if (task.urgency_tag === 'immediate') return 1.0;
  if (task.urgency_tag === 'few_hours') return 0.7;
  if (task.urgency_tag === 'evening')   return 0.4;
  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  if (URGENCY_KEYWORDS.some(kw => text.includes(kw))) return 1.0;
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
 * @param {Object} userLocation     — { lat, lng } or null
 * @param {Object} workerProfile    — { preferredCategories, categoryHistory }
 * @param {Object} opts             — { isLoggedIn, behavioralProfile }
 * @returns {Array} sorted by feed_score, each enriched with _feedScore + _badges + _scores
 */
export function rankFeedTasks(tasks, userLocation, workerProfile = {}, opts = {}) {
  const { isLoggedIn = true, behavioralProfile = null } = opts;

  // ─ FALLBACK A: not logged in → nearest tasks first
  if (!isLoggedIn) {
    return tasks
      .map(task => {
        const distKm = userLocation
          ? haversineKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
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

  // ─ FALLBACK B: logged in but no location
  if (!userLocation) {
    return tasks
      .map(task => {
        const price = task.price || 0;
        const timeToMins = { '15m': 15, '30m': 30, '1h': 60, '2h': 120 };
        const mins = timeToMins[task.estimated_time] || 60;
        const hourlyRate = (price / mins) * 60;
        const rewardScore = Math.min(hourlyRate / 200, 1.0);
        const s_relevance   = scoreTaskRelevance(task, workerProfile);
        const s_activity    = scoreRecentActivity(task);
        const s_personalFit = scorePersonalFit(task, behavioralProfile);
        const feedScore = (rewardScore * 0.4 + s_relevance * 0.3 + s_activity * 0.15 + s_personalFit * 0.15) * 100;
        return {
          ...task,
          _distKm: null,
          _feedScore: feedScore,
          _badges: buildBadges(task, null, behavioralProfile),
          _scores: { taskRelevance: s_relevance, recentActivity: s_activity, personalFit: s_personalFit },
        };
      })
      .sort((a, b) => b._feedScore - a._feedScore);
  }

  // ─ MAIN: logged in + location → full personalized feed_score
  return tasks
    .map(task => {
      const distKm = haversineKm(userLocation.lat, userLocation.lng, task.lat, task.lng);

      const s_distance        = scoreDistance(task, userLocation);
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