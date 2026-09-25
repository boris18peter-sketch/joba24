/**
 * Canonical Joba24 event taxonomy — the single definition of every business
 * event and how it reaches each advertising provider.
 *
 * Business logic fires ONE Joba24 event name. This table decides what each
 * provider receives, so adding a provider or renaming an event never requires
 * touching the user flows that fire it.
 *
 * Columns
 *   meta     — Meta App Events name. A REAL Meta standard event where one
 *              genuinely exists; a custom name otherwise. Never an invented
 *              "standard" name.
 *   firebase — Firebase Analytics / GA4 name. Google's standard event where one
 *              exists (sign_up, purchase), a valid custom name otherwise.
 *   tiktok   — TikTok App Events name. A REAL TikTok standard event where one
 *              exists; a custom name otherwise.
 *   auto     — true when the provider's own SDK logs this on app activation, so
 *              Joba24 must NOT dispatch it manually (that would double-count).
 *   dedup    — idempotency strategy, applied per provider-agnostic event:
 *              'once'    → once per user id
 *              'session' → once per app session (guards rerenders/navigation)
 *              'id'      → once per entity id (task / application / transaction)
 *
 * Canonical names are used verbatim for Firebase and TikTok custom events, so
 * the same name is greppable across all three platforms.
 */

export const EVENTS = {
  /* ── Acquisition / onboarding ── */
  app_open: {
    // Logged automatically by all three SDKs on activation
    // (Meta activateApp, Firebase session_start/first_open, TikTok LaunchAPP).
    // Manual dispatch would double-count, so this entry is auto-only.
    meta: null,
    firebase: null,
    tiktok: null,
    auto: true,
  },
  sign_up: {
    meta: 'CompleteRegistration',
    firebase: 'sign_up',
    tiktok: 'Registration',
    dedup: 'once',
  },
  worker_profile_completed: {
    meta: 'WorkerProfileCompleted',
    firebase: 'worker_profile_completed',
    tiktok: 'CompleteTutorial',
    dedup: 'once',
  },
  location_enabled: {
    meta: 'LocationEnabled',
    firebase: 'location_enabled',
    tiktok: 'location_enabled',
    dedup: 'once',
  },
  notifications_enabled: {
    meta: 'NotificationsEnabled',
    firebase: 'notifications_enabled',
    tiktok: 'notifications_enabled',
    dedup: 'once',
  },
  kyc_completed: {
    meta: 'KYCCompleted',
    firebase: 'kyc_completed',
    tiktok: 'kyc_completed',
    dedup: 'once',
  },

  /* ── Publisher funnel ── */
  task_creation_started: {
    meta: 'TaskCreationStarted',
    firebase: 'task_creation_started',
    tiktok: 'task_creation_started',
    dedup: 'session',
  },
  task_published: {
    meta: 'TaskPublished',
    firebase: 'task_published',
    tiktok: 'task_published',
    dedup: 'id',
  },

  /* ── Worker funnel ── */
  task_viewed: {
    // Meta and TikTok both have a real ViewContent standard event — the
    // closest honest match for opening a task listing.
    meta: 'ViewContent',
    firebase: 'task_viewed',
    tiktok: 'ViewContent',
    dedup: 'session',
  },
  application_submitted: {
    // Meta's SubmitApplication is a real standard event and matches exactly.
    meta: 'SubmitApplication',
    firebase: 'application_submitted',
    tiktok: 'application_submitted',
    dedup: 'id',
  },

  /* ── Marketplace ── */
  worker_selected: {
    meta: 'WorkerSelected',
    firebase: 'worker_selected',
    tiktok: 'worker_selected',
    dedup: 'id',
  },
  task_completed: {
    meta: 'TaskCompleted',
    firebase: 'task_completed',
    tiktok: 'task_completed',
    dedup: 'id',
  },

  /* ── Monetization ── */
  purchase: {
    meta: 'Purchase',
    firebase: 'purchase',
    tiktok: 'Purchase',
    dedup: 'id',
  },
};

export const CANONICAL_EVENT_NAMES = Object.keys(EVENTS);