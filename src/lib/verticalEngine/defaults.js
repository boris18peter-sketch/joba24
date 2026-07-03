/**
 * Vertical Engine — Default Configurations
 * ───────────────────────────────────────────────────────────────────────────
 * Generates the default Vertical configuration for every existing category.
 *
 * IMPORTANT: These defaults REPRODUCE THE CURRENT BEHAVIOR exactly.
 * They are built from the existing hardcoded logic in:
 *   - categories.js          (names, icons)
 *   - taskFlowConfig.js      (AI questions, task form fields, price ranges)
 *   - requirements.js        (worker profile requirements)
 *   - trustScore.js          (trust signals & weights)
 *   - feedRanker.js          (matching weights & distance rules)
 *
 * Nothing changes visually or behaviorally — these configs mirror today's code.
 * When the engine is seeded, these become editable per-vertical in the database.
 */

import { CATEGORIES } from '@/lib/categories';
import { CATEGORY_REQUIREMENTS, DEFAULT_REQUIREMENT_CATEGORIES } from '@/lib/requirements';
import { TASK_FLOW_CONFIG, getCategoryConfig } from '@/lib/taskFlowConfig';

// ── Shared defaults (mirror current global behavior) ──────────────────────

// From feedRanker.js — current global ranking weights
const DEFAULT_MATCHING_WEIGHTS = {
  distance: 0.30,
  recent_activity: 0.20,
  task_relevance: 0.20,
  personal_fit: 0.20,
  urgency: 0.05,
  reliability_fit: 0.05,
};

const DEFAULT_RANKING_FACTORS = [
  'distance',
  'recent_activity',
  'task_relevance',
  'personal_fit',
  'urgency',
  'reliability_fit',
];

// Distance scoring thresholds (from feedRanker.scoreDistance)
const DEFAULT_DISTANCE_RULES = {
  max_km: 50,
  tiers: [
    { km: 1,  score: 1.0 },
    { km: 2,  score: 0.92 },
    { km: 5,  score: 0.78 },
    { km: 10, score: 0.58 },
    { km: 20, score: 0.35 },
    { km: 50, score: 0.14 },
  ],
  fallback_score: 0.04,
};

const DEFAULT_AVAILABILITY_RULES = {
  require_online: false,
  max_concurrent_tasks: 1,
};

// From trustScore.js — current global trust calculation
const DEFAULT_TRUST_SIGNALS = [
  { key: 'identity_verification', weight: 30, description: 'is_verified' },
  { key: 'phone_verification',    weight: 10, description: 'is_phone_verified' },
  { key: 'rating_quality',        weight: 30, description: 'rating / 5 * 30 (requires >=1 review)' },
  { key: 'task_experience',       weight: 30, description: '1.5 pts per completed task, max 30' },
];

const DEFAULT_TRUST = {
  trust_signals: DEFAULT_TRUST_SIGNALS,
  verification_requirements: ['id'],
  minimum_trust_level: 0, // currently no minimum
};

// From Review entity — current review structure
const DEFAULT_REVIEWS = {
  review_questions: [
    { key: 'rating',         label: 'דירוג כללי',      type: 'number',  required: true },
    { key: 'comment',        label: 'תגובה חופשית',     type: 'text' },
    { key: 'arrived_on_time', label: 'הגיע / תיאם בזמן', type: 'boolean' },
    { key: 'professional',    label: 'ביצע בצורה מקצועית', type: 'boolean' },
    { key: 'good_communication', label: 'תקשורת טובה',  type: 'boolean' },
    { key: 'fair_pricing',    label: 'מחיר הוגן',        type: 'boolean' },
    { key: 'would_hire_again', label: 'ממליץ / אשכור שוב', type: 'boolean' },
  ],
  review_categories: [
    { key: 'arrived_on_time',     label: '⏱️ הגיע בזמן' },
    { key: 'professional',        label: '💼 מקצועי' },
    { key: 'good_communication',  label: '💬 תקשורת' },
    { key: 'would_hire_again',    label: '🔁 ממליץ' },
  ],
};

// Default worker card (mirrors current UserBadge / TaskApplicants rendering)
const DEFAULT_WORKER_CARD = {
  fields_to_display: ['full_name', 'profile_photo', 'rating', 'tasks_completed', 'is_verified'],
  badges: [
    { key: 'verified',   label: 'מאומת',   condition: 'is_verified === true' },
    { key: 'top_rated',  label: 'מוביל',   condition: 'rating >= 4.5 && rating_count >= 5' },
    { key: 'experienced', label: 'מנוסה',  condition: 'tasks_completed >= 10' },
  ],
  statistics: ['tasks_completed', 'rating', 'rating_count'],
};

// Default task card (mirrors current TaskCard rendering)
const DEFAULT_TASK_CARD = {
  fields_to_display: ['title', 'price', 'city', 'category', 'estimated_time', 'urgency_tag', 'images', 'client_name', 'client_verified'],
  badges: [
    { key: 'urgent',        label: 'דחוף',      condition: "urgency_tag === 'immediate'" },
    { key: 'new',           label: 'חדש',       condition: 'age_minutes < 30' },
    { key: 'funded',        label: 'ממומן',     condition: "payment_status === 'funded'" },
    { key: 'nearby',        label: 'קרוב אלי',  condition: 'distance_km < 5' },
    { key: 'high_pay',      label: 'תשלום גבוה', condition: 'price >= 300' },
    { key: 'verified_client', label: 'מפרסם מאומת', condition: 'client_verified === true' },
    { key: 'low_competition', label: 'פנוי',    condition: 'applicants_count === 0' },
    { key: 'for_you',       label: 'בשבילך',    condition: 'personal_fit >= 0.65' },
  ],
  urgency_indicators: ['immediate', 'few_hours', 'evening', 'flexible'],
};

// Default task detail layout (mirrors current TaskDetail page)
const DEFAULT_TASK_DETAIL = {
  layout: ['hero', 'price_meta', 'description', 'location', 'requirements', 'client_info', 'applicants', 'cta'],
  information_blocks: [
    { key: 'hero',        title: null,   fields: ['images', 'video_url', 'title'] },
    { key: 'price_meta',  title: null,   fields: ['price', 'estimated_time', 'urgency_tag', 'payment_method'] },
    { key: 'description', title: 'תיאור', fields: ['description', 'category_details'] },
    { key: 'location',    title: 'מיקום', fields: ['location_name', 'city', 'address_building', 'address_floor', 'address_apartment', 'address_notes', 'lat', 'lng'] },
    { key: 'requirements', title: 'דרישות', fields: ['requirements'] },
    { key: 'client_info', title: 'פרטי המפרסם', fields: ['client_name', 'client_rating', 'client_verified'] },
    { key: 'applicants',  title: 'מועמדים', fields: ['applicants'] },
  ],
  cta_buttons: [
    { key: 'apply',      label: 'הגשת מועמדות', condition: "status === 'OPEN' && !is_applicant && !is_owner" },
    { key: 'cancel_app', label: 'ביטול מועמדות', condition: "status === 'OPEN' && is_applicant && !is_owner" },
    { key: 'manage',     label: 'ניהול מועמדים', condition: 'is_owner && status === OPEN' },
    { key: 'chat',       label: 'צאט',           condition: 'is_worker || is_owner' },
    { key: 'complete',   label: 'סיום',           condition: "worker_status === 'arrived' && is_worker" },
  ],
};

const DEFAULT_MARKETPLACE_METRICS = {
  nearby_workers: true,
  average_response_time: true,
  average_completion_time: true,
};

const DEFAULT_NOTIFICATIONS = {
  reminders: [
    { trigger: 'no_applicants', delay_minutes: 30, message: 'עדיין אין מועמדים — אולי כדאי להעלות את המחיר?' },
    { trigger: 'task_expiring', delay_minutes: 60, message: 'המשימה עומדת לפוג — להאריך זמן?' },
  ],
  suggestions: [
    { trigger: 'price_below_avg', message: 'המחיר נמוך מהממוצע — להגדיל סיכויי התאמה' },
  ],
  urgency_logic: {
    immediate: { priority: 'high',   push: true },
    few_hours: { priority: 'normal', push: true },
    evening:   { priority: 'normal', push: false },
    flexible:  { priority: 'low',    push: false },
  },
};

const DEFAULT_PREMIUM_FEATURES = {
  story: true,
  boost: true,
  auto_raise: true,
  recommendations: true,
};

const DEFAULT_ANALYTICS = {
  success_metrics: ['completion_rate', 'repeat_hire_rate', 'avg_rating'],
  conversion_metrics: ['view_to_apply', 'apply_to_approve', 'approve_to_complete'],
};

// ── Default config builder ────────────────────────────────────────────────

/**
 * Builds the default Vertical configuration for a given category.
 * Reproduces the current hardcoded behavior exactly.
 */
export function buildDefaultVerticalConfig(categoryId) {
  const catMeta = CATEGORIES.find(c => c.value === categoryId);
  const flowConfig = getCategoryConfig(categoryId);
  const requirementGroups = CATEGORY_REQUIREMENTS[categoryId] || DEFAULT_REQUIREMENT_CATEGORIES;

  // Extract icon (emoji) and clean name from the label like "🔧 אינסטלציה"
  const rawLabel = catMeta?.label || '📋 אחר';
  const iconMatch = rawLabel.match(/^(\S+)\s+(.+)$/);
  const icon = iconMatch ? iconMatch[1] : '📋';
  const name = iconMatch ? iconMatch[2] : rawLabel;

  // Build AI section from taskFlowConfig
  const aiQuestions = (flowConfig.extraFields || []).map(f => ({
    key: f.key,
    label: f.label,
    type: f.type,
    options: f.options,
    placeholder: f.placeholder,
  }));

  return {
    general: {
      id: categoryId,
      name,
      icon,
      description: `Vertical configuration for ${name}`,
    },

    ai: {
      publishing_prompt: `You are helping a user publish a ${name} task. Ask the relevant questions to gather all needed details. Category: ${categoryId}.`,
      required_questions: (flowConfig.chatQuestionOrder || []).map(key =>
        aiQuestions.find(q => q.key === key)).filter(Boolean),
      optional_questions: aiQuestions.filter(q =>
        !(flowConfig.chatQuestionOrder || []).includes(q.key)),
      question_order: flowConfig.chatQuestionOrder || [],
      follow_up_rules: [],
    },

    task_form: {
      required_fields: ['title', 'price', 'category', 'location_name', 'city', 'lat', 'lng', 'payment_method'],
      optional_fields: flowConfig.extraFields || [],
      validation_rules: {
        price_range: flowConfig.priceRange || { min: 100, max: 500 },
      },
    },

    matching: {
      ranking_factors: DEFAULT_RANKING_FACTORS,
      weights: { ...DEFAULT_MATCHING_WEIGHTS },
      availability_rules: { ...DEFAULT_AVAILABILITY_RULES },
      distance_rules: DEFAULT_DISTANCE_RULES,
    },

    worker_profile: {
      required_profile_fields: ['full_name', 'phone'],
      optional_profile_fields: ['bio', 'profile_photo', 'preferred_cities', 'certificates', 'certificate_files', 'intro_video_url', 'profile_media'],
      requirement_groups: requirementGroups,
    },

    trust: {
      trust_signals: DEFAULT_TRUST_SIGNALS.map(s => ({ ...s })),
      verification_requirements: ['id'],
      minimum_trust_level: 0,
    },

    reviews: {
      review_questions: DEFAULT_REVIEWS.review_questions.map(q => ({ ...q })),
      review_categories: DEFAULT_REVIEWS.review_categories.map(c => ({ ...c })),
    },

    worker_card: {
      fields_to_display: [...DEFAULT_WORKER_CARD.fields_to_display],
      badges: DEFAULT_WORKER_CARD.badges.map(b => ({ ...b })),
      statistics: [...DEFAULT_WORKER_CARD.statistics],
    },

    task_card: {
      fields_to_display: [...DEFAULT_TASK_CARD.fields_to_display],
      badges: DEFAULT_TASK_CARD.badges.map(b => ({ ...b })),
      urgency_indicators: [...DEFAULT_TASK_CARD.urgency_indicators],
    },

    task_detail: {
      layout: [...DEFAULT_TASK_DETAIL.layout],
      information_blocks: DEFAULT_TASK_DETAIL.information_blocks.map(b => ({ ...b, fields: [...b.fields] })),
      cta_buttons: DEFAULT_TASK_DETAIL.cta_buttons.map(b => ({ ...b })),
    },

    marketplace_metrics: { ...DEFAULT_MARKETPLACE_METRICS },

    notifications: {
      reminders: DEFAULT_NOTIFICATIONS.reminders.map(r => ({ ...r })),
      suggestions: DEFAULT_NOTIFICATIONS.suggestions.map(s => ({ ...s })),
      urgency_logic: JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS.urgency_logic)),
    },

    premium_features: { ...DEFAULT_PREMIUM_FEATURES },

    analytics: {
      success_metrics: [...DEFAULT_ANALYTICS.success_metrics],
      conversion_metrics: [...DEFAULT_ANALYTICS.conversion_metrics],
    },
  };
}

// ── All default vertical IDs (every existing category) ────────────────────
export const DEFAULT_VERTICAL_IDS = CATEGORIES.map(c => c.value);

// ── Build all defaults at once ─────────────────────────────────────────────
export function buildAllDefaultVerticalConfigs() {
  return DEFAULT_VERTICAL_IDS.map(id => ({
    vertical_id: id,
    name: CATEGORIES.find(c => c.value === id)?.label || id,
    config: buildDefaultVerticalConfig(id),
    is_active: true,
    version: 1,
  }));
}