/**
 * Vertical Engine — Configuration Schema (MODEL)
 * ───────────────────────────────────────────────────────────────────────────
 * This is the single source of truth CONTRACT for what a Vertical Configuration
 * contains. Every screen in the application will eventually load its behavior
 * from a config object that follows this schema.
 *
 * A "Vertical" = a task category (plumbing, babysitting, moving, ...).
 * Each Vertical has ONE configuration object with the sections below.
 *
 * This file defines the structure ONLY.
 * Default values that reproduce current behavior live in ./defaults.js
 * The runtime engine that loads configs lives in ./index.js
 */

// ── Section keys ──────────────────────────────────────────────────────────
export const VERTICAL_SECTIONS = [
  'general',
  'ai',
  'task_form',
  'matching',
  'worker_profile',
  'trust',
  'reviews',
  'worker_card',
  'task_card',
  'task_detail',
  'marketplace_metrics',
  'notifications',
  'premium_features',
  'analytics',
];

// ── The Model ─────────────────────────────────────────────────────────────
export const VERTICAL_SCHEMA = {

  general: {
    description: 'Core identity of the vertical',
    fields: {
      id:          { type: 'string',  required: true,  description: 'Category slug (e.g. "plumbing")' },
      name:        { type: 'string',  required: true,  description: 'Display name (localized)' },
      icon:        { type: 'string',  description: 'Emoji or icon identifier' },
      description: { type: 'string',  description: 'Short human-readable summary of the vertical' },
    },
  },

  ai: {
    description: 'AI assistant behavior for publishing tasks in this vertical',
    fields: {
      publishing_prompt:  { type: 'string', description: 'System prompt injected when AI helps publish a task in this vertical' },
      required_questions: { type: 'array',  description: 'Questions the AI must ask before publishing (objects: { key, label, type })' },
      optional_questions: { type: 'array',  description: 'Questions the AI may ask to enrich the task' },
      question_order:     { type: 'array',  description: 'Ordered list of question keys defining the conversation flow' },
      follow_up_rules:    { type: 'array',  description: 'Conditional follow-up rules (objects: { trigger_field, trigger_value, follow_up_question })' },
    },
  },

  task_form: {
    description: 'Dynamic form configuration for creating/editing tasks',
    fields: {
      required_fields:  { type: 'array', description: 'Fields that must be filled to publish (strings)' },
      optional_fields:  { type: 'array', description: 'Extra fields specific to the vertical (objects: { key, type, label, options?, placeholder? })' },
      validation_rules: { type: 'object', description: 'Validation config (e.g. price_range: { min, max })' },
    },
  },

  matching: {
    description: 'How workers are ranked and matched to tasks in this vertical',
    fields: {
      ranking_factors:  { type: 'array',  description: 'List of factor keys used in scoring' },
      weights:          { type: 'object', description: 'Map of factor → numeric weight (0-1), summing to 1' },
      availability_rules: { type: 'object', description: 'Rules for worker availability (e.g. schedule, max concurrent)' },
      distance_rules:   { type: 'object', description: 'Distance scoring thresholds (e.g. max_km, decay_curve)' },
    },
  },

  worker_profile: {
    description: 'What profile data matters for workers in this vertical',
    fields: {
      required_profile_fields: { type: 'array',  description: 'Profile fields a worker must have to apply' },
      optional_profile_fields: { type: 'array',  description: 'Profile fields that improve ranking if present' },
      requirement_groups:      { type: 'array',  description: 'Grouped requirement checkboxes (from requirements.js)' },
    },
  },

  trust: {
    description: 'Trust & safety configuration for this vertical',
    fields: {
      trust_signals:          { type: 'array',  description: 'Signals contributing to trust score (objects: { key, weight })' },
      verification_requirements: { type: 'array', description: 'Verifications required to participate (e.g. id, phone)' },
      minimum_trust_level:    { type: 'number', description: 'Minimum trust score (0-100) to apply for tasks' },
    },
  },

  reviews: {
    description: 'Review configuration specific to this vertical',
    fields: {
      review_questions: { type: 'array', description: 'Questions shown in the review form (objects: { key, label, type })' },
      review_categories: { type: 'array', description: 'Feedback tags/chips (objects: { key, label })' },
    },
  },

  worker_card: {
    description: 'How worker cards render in lists for this vertical',
    fields: {
      fields_to_display: { type: 'array', description: 'Worker fields shown on the card' },
      badges:            { type: 'array', description: 'Badges that can appear (objects: { key, label, condition })' },
      statistics:        { type: 'array', description: 'Stats shown (e.g. completed_count, rating)' },
    },
  },

  task_card: {
    description: 'How task cards render in the feed for this vertical',
    fields: {
      fields_to_display:   { type: 'array', description: 'Task fields shown on the card' },
      badges:              { type: 'array', description: 'Badges (objects: { key, label, condition })' },
      urgency_indicators:  { type: 'array', description: 'Urgency visual cues (e.g. immediate, few_hours)' },
    },
  },

  task_detail: {
    description: 'Layout of the task detail page for this vertical',
    fields: {
      layout:            { type: 'array', description: 'Ordered layout blocks (e.g. ["hero","details","requirements","cta"])' },
      information_blocks: { type: 'array', description: 'Custom info blocks (objects: { key, title, fields })' },
      cta_buttons:       { type: 'array', description: 'Action buttons and their conditions (objects: { key, label, condition })' },
    },
  },

  marketplace_metrics: {
    description: 'Marketplace health metrics displayed for this vertical',
    fields: {
      nearby_workers:          { type: 'boolean', description: 'Whether to show count of nearby available workers' },
      average_response_time:   { type: 'boolean', description: 'Whether to show avg time-to-first-application' },
      average_completion_time: { type: 'boolean', description: 'Whether to show avg task completion duration' },
    },
  },

  notifications: {
    description: 'Notification behavior for this vertical',
    fields: {
      reminders:  { type: 'array', description: 'Reminder configs (objects: { trigger, delay, message })' },
      suggestions: { type: 'array', description: 'Suggestion notifications (objects: { trigger, message })' },
      urgency_logic: { type: 'object', description: 'How urgency maps to notification priority' },
    },
  },

  premium_features: {
    description: 'Which premium/monetization features are active for this vertical',
    fields: {
      story:           { type: 'boolean', description: 'Story-format task promotion enabled' },
      boost:           { type: 'boolean', description: 'Paid boost to top of feed enabled' },
      auto_raise:      { type: 'boolean', description: 'Automatic price raise to attract workers enabled' },
      recommendations: { type: 'boolean', description: 'AI-powered worker recommendations enabled' },
    },
  },

  analytics: {
    description: 'Which success/conversion metrics are tracked for this vertical',
    fields: {
      success_metrics:   { type: 'array', description: 'Metrics defining success (e.g. completion_rate, repeat_hire_rate)' },
      conversion_metrics: { type: 'array', description: 'Funnel metrics (e.g. view_to_apply, apply_to_complete)' },
    },
  },
};

// ── Helper: get the list of field keys for a section ──────────────────────
export const getSectionFields = (section) =>
  Object.keys(VERTICAL_SCHEMA[section]?.fields || {});

// ── Helper: validate that a config object has all required sections ───────
export const validateVerticalConfig = (config) => {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return ['Config must be an object'];
  }
  for (const section of VERTICAL_SECTIONS) {
    if (!(section in config)) {
      errors.push(`Missing section: ${section}`);
    }
  }
  if (!config.general?.id) {
    errors.push('general.id is required');
  }
  if (!config.general?.name) {
    errors.push('general.name is required');
  }
  return errors;
};