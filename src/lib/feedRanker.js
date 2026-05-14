/**
 * feedRanker.js — Joba24 Smart Feed Ranking Engine
 * 
 * Scores each task for a specific worker using:
 * 1. Location proximity
 * 2. Budget attractiveness
 * 3. Freshness boost
 * 4. Urgency signals
 * 5. Payment/funding status
 * 6. Low competition boost
 * 7. Worker-task category matching
 * 8. Completion probability
 * 9. Trust & quality signals
 * 10. Anti-spam detection
 */

const WEIGHTS = {
  location:            30,  // Highest weight — proximity is king
  budget:              15,
  freshness:           12,
  urgency:             10,
  funded:               8,
  lowCompetition:       8,
  categoryMatch:       10,  // Worker-task matching
  trust:                7,
};

// ── Helpers ────────────────────────────────────────────────────────────────

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

// Detect urgency keywords in title/description
const URGENCY_KEYWORDS = [
  'עכשיו', 'דחוף', 'מיידי', 'היום', 'asap', 'urgent', 'בדחיפות',
  'מיד', 'דחוף!', 'עכשיו!', 'תיקון מיידי', 'חייב היום', 'בהקדם'
];

function detectUrgency(task) {
  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  return URGENCY_KEYWORDS.some(kw => text.includes(kw));
}

// Detect spam/suspicious tasks
function isSpamLikely(task) {
  const price = task.price || 0;
  const title = task.title || '';
  
  // Unrealistic price for known quick tasks
  if (price > 5000) return true;
  if (price < 10 && price > 0) return true;
  
  // Very short title
  if (title.length < 5) return true;
  
  return false;
}

// ── Scoring functions (each returns 0–1 normalized) ───────────────────────

function scoreLocation(task, userLocation) {
  if (!userLocation || !task.lat || !task.lng) return 0.3; // neutral if no location
  const km = haversineKm(userLocation.lat, userLocation.lng, task.lat, task.lng);
  if (km === null) return 0.3;
  if (km < 1)   return 1.0;
  if (km < 2)   return 0.92;
  if (km < 5)   return 0.75;
  if (km < 10)  return 0.55;
  if (km < 20)  return 0.35;
  if (km < 50)  return 0.15;
  return 0.05;
}

function scoreBudget(task) {
  const price = task.price || 0;
  const time = task.estimated_time;
  
  // Calculate hourly rate to detect suspicious tasks
  const timeToMinutes = { '15m': 15, '30m': 30, '1h': 60, '2h': 120 };
  const mins = timeToMinutes[time] || 60;
  const hourlyRate = (price / mins) * 60;
  
  // Flag suspicious (₪500 for 15min = ₪2000/h)
  if (hourlyRate > 2000 && price > 200) return 0.2;
  
  // Normal scoring
  if (price >= 500) return 1.0;
  if (price >= 300) return 0.85;
  if (price >= 200) return 0.7;
  if (price >= 100) return 0.55;
  if (price >= 50)  return 0.4;
  return 0.25;
}

function scoreFreshness(task) {
  const ageMs = Date.now() - new Date(task.created_date).getTime();
  const ageMins = ageMs / 60000;
  
  if (ageMins < 5)   return 1.0;
  if (ageMins < 15)  return 0.95;
  if (ageMins < 30)  return 0.88;
  if (ageMins < 60)  return 0.75;
  if (ageMins < 180) return 0.55;
  if (ageMins < 360) return 0.4;
  if (ageMins < 720) return 0.25;
  return 0.1;
}

function scoreUrgency(task) {
  if (detectUrgency(task)) return 1.0;
  // Check expiry — tasks expiring soon are implicitly urgent
  if (task.expires_at) {
    const minsLeft = (new Date(task.expires_at) - Date.now()) / 60000;
    if (minsLeft < 60) return 0.8;
    if (minsLeft < 120) return 0.5;
  }
  return 0;
}

function scoreFunded(task) {
  if (task.payment_status === 'funded' && task.payment_held) return 1.0;
  if (task.payment_status === 'funded') return 0.85;
  if (task.client_verified) return 0.6;
  return 0.3;
}

function scoreLowCompetition(task) {
  const applicants = (task.applicants || []).length;
  if (applicants === 0) return 1.0;
  if (applicants === 1) return 0.75;
  if (applicants <= 3)  return 0.45;
  if (applicants <= 6)  return 0.2;
  return 0.05;
}

function scoreCategoryMatch(task, workerProfile) {
  const { preferredCategories = [], categoryHistory = {} } = workerProfile;
  const cat = task.category;
  if (!cat) return 0.3;
  
  // Direct preferred category
  if (preferredCategories.includes(cat)) return 1.0;
  
  // History-based affinity — normalize by max count
  const maxCount = Math.max(...Object.values(categoryHistory), 1);
  const affinity = (categoryHistory[cat] || 0) / maxCount;
  if (affinity > 0) return 0.4 + affinity * 0.5;
  
  return 0.2;
}

function scoreTrust(task) {
  let score = 0.3; // baseline
  if (task.client_verified) score += 0.3;
  if (task.client_rating >= 4.5) score += 0.25;
  else if (task.client_rating >= 3.5) score += 0.1;
  // Penalize repeated cancellations (heuristic: no explicit field, use payment_status)
  if (task.payment_status === 'funded') score += 0.15;
  return Math.min(score, 1.0);
}

// ── Main Ranking Function ─────────────────────────────────────────────────

/**
 * @param {Array} tasks — raw OPEN tasks (already filtered to exclude own tasks)
 * @param {Object} userLocation — { lat, lng } or null
 * @param {Object} workerProfile — { preferredCategories, categoryHistory }
 * @returns {Array} tasks sorted by feed score, each with metadata badges
 */
export function rankFeedTasks(tasks, userLocation, workerProfile = {}) {
  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

  return tasks
    .filter(t => !isSpamLikely(t))
    .map(task => {
      const distKm = userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
        : null;

      // Compute component scores
      const s_location   = scoreLocation(task, userLocation);
      const s_budget     = scoreBudget(task);
      const s_freshness  = scoreFreshness(task);
      const s_urgency    = scoreUrgency(task);
      const s_funded     = scoreFunded(task);
      const s_lowComp    = scoreLowCompetition(task);
      const s_catMatch   = scoreCategoryMatch(task, workerProfile);
      const s_trust      = scoreTrust(task);

      // Weighted sum → 0–100
      const feedScore = (
        s_location   * WEIGHTS.location +
        s_budget     * WEIGHTS.budget +
        s_freshness  * WEIGHTS.freshness +
        s_urgency    * WEIGHTS.urgency +
        s_funded     * WEIGHTS.funded +
        s_lowComp    * WEIGHTS.lowCompetition +
        s_catMatch   * WEIGHTS.categoryMatch +
        s_trust      * WEIGHTS.trust
      ) / totalWeight * 100;

      // Compute badges for UI
      const ageMs = Date.now() - new Date(task.created_date).getTime();
      const ageMins = ageMs / 60000;
      const isUrgent  = s_urgency > 0.5;
      const isNew     = ageMins < 30;
      const isFunded  = task.payment_status === 'funded';
      const isNearby  = distKm !== null && distKm < 5;
      const isHighPay = (task.price || 0) >= 300;
      const isVerifiedClient = !!task.client_verified;
      const isLowComp = (task.applicants || []).length === 0;

      return {
        ...task,
        _distKm:     distKm,
        _feedScore:  feedScore,
        _scores: { location: s_location, budget: s_budget, freshness: s_freshness, urgency: s_urgency },
        _badges: { isUrgent, isNew, isFunded, isNearby, isHighPay, isVerifiedClient, isLowComp },
      };
    })
    .sort((a, b) => b._feedScore - a._feedScore);
}

/**
 * Build smart sections from ranked tasks.
 * Returns { recommended, nearby, highPaying, urgent, newTasks }
 */
export function buildSmartSections(rankedTasks) {
  return {
    recommended:  rankedTasks.slice(0, 5),
    nearby:       rankedTasks.filter(t => t._badges.isNearby).slice(0, 8),
    highPaying:   rankedTasks.filter(t => t._badges.isHighPay).sort((a,b) => b.price - a.price).slice(0, 8),
    urgent:       rankedTasks.filter(t => t._badges.isUrgent).slice(0, 6),
    newTasks:     rankedTasks.filter(t => t._badges.isNew).slice(0, 6),
  };
}