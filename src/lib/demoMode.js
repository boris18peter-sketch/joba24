/**
 * demoMode — New User Simulator utility for admins.
 *
 * Temporarily transforms the admin's profile into a "brand new user" state
 * so they can walk through the full onboarding flow (verification, profile
 * completion, welcome tutorial). The real profile is backed up to localStorage
 * and restored on exit.
 *
 * The backup survives page reloads — so even if the admin refreshes mid-demo,
 * the floating "Exit Demo" button remains available.
 *
 * UH-1…UH-4: the demo fields are split by WHO is allowed to write each one.
 *   PLAIN_DEMO_FIELDS      normal profile / UX fields  → still written via updateMe
 *   PROTECTED_DEMO_FIELDS  server-only fields          → adminSetUserFields (service role)
 *   VERDICT_DEMO_FIELDS    the KYC verdict pair        → adminUpdateVerification (service role)
 *
 * We do NOT touch: role, is_approved, email, full_name, worker_credits,
 * agent_code, commission_rate — keeping credits avoids re-triggering the
 * signup bonus grant, and keeping role=admin prevents getting stuck on the
 * pre-launch gate.
 */

const BACKUP_KEY = 'joba24_demo_backup';

const PLAIN_DEMO_FIELDS = [
  'preferred_categories', 'preferred_cities',
  'profession', 'bio', 'profile_photo',
  'instagram_username', 'facebook_username', 'tiktok_username',
  'notifications_enabled',
];

const PROTECTED_DEMO_FIELDS = [
  'id_number', 'id_photo_url',
  'instagram_verified', 'facebook_verified', 'tiktok_verified',
  'rating', 'rating_count', 'tasks_completed', 'score_tasks', 'repeat_hires',
];

const VERDICT_DEMO_FIELDS = ['kyc_status', 'is_verified'];

const DEMO_FIELDS = [...PLAIN_DEMO_FIELDS, ...PROTECTED_DEMO_FIELDS, ...VERDICT_DEMO_FIELDS];

const NEW_USER_VALUES = {
  kyc_status: null,
  preferred_categories: [],
  preferred_cities: [],
  profession: null,
  bio: null,
  profile_photo: null,
  id_number: null,
  id_photo_url: null,
  instagram_verified: false,
  instagram_username: null,
  facebook_verified: false,
  facebook_username: null,
  tiktok_verified: false,
  tiktok_username: null,
  notifications_enabled: false,
  rating: null,
  rating_count: 0,
  tasks_completed: 0,
  score_tasks: 0,
  repeat_hires: 0,
};

// localStorage keys that gate onboarding UI — cleared so the tutorial/banners
// appear as if the user just installed the app.
const ONBOARDING_FLAGS = [
  'joba_welcome_seen',
];

// ── Internal helpers ────────────────────────────────────────────────────────
// Lazy-import base44 to avoid circular deps at module load time.
async function getClient() {
  const { base44 } = await import('@/api/base44Client');
  return base44;
}

/**
 * Apply one set of demo values, routing each group of fields to the writer
 * that is allowed to change it.
 */
async function applyDemoValues(userId, values) {
  const base44 = await getClient();

  // Normal profile / UX fields — still legitimately client-written.
  const plain = {};
  PLAIN_DEMO_FIELDS.forEach((key) => { plain[key] = values[key]; });
  await base44.auth.updateMe(plain);

  // Server-only fields — written through the trusted admin function.
  const prot = {};
  PROTECTED_DEMO_FIELDS.forEach((key) => {
    if (values[key] !== undefined) prot[key] = values[key];
  });
  if (Object.keys(prot).length > 0) {
    await base44.functions.invoke('adminSetUserFields', { userId, values: prot });
  }

  // KYC verdict pair — written through the verification function (silent, so
  // entering/leaving the demo never fires a verification push).
  await base44.functions.invoke('adminUpdateVerification', {
    userId,
    isVerified: !!values.is_verified,
    kycStatus: values.kyc_status ?? null,
    silent: true,
  });
}

/**
 * Enter demo mode: back up the current profile, apply new-user values,
 * clear onboarding flags, then reload.
 */
export async function enterDemoMode(realUser) {
  if (!realUser) throw new Error('No user provided');

  // Back up only the fields we're about to change
  const backup = {};
  DEMO_FIELDS.forEach((key) => {
    backup[key] = realUser[key];
  });
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

  // Apply new-user values
  await applyDemoValues(realUser.id, NEW_USER_VALUES);

  // Clear onboarding flags so tutorials/banners reappear
  ONBOARDING_FLAGS.forEach((key) => localStorage.removeItem(key));

  // Reload to reset all React state + query caches cleanly
  window.location.href = '/';
}

/**
 * Exit demo mode: restore the backed-up profile, clear the backup,
 * then reload.
 */
export async function exitDemoMode() {
  const raw = localStorage.getItem(BACKUP_KEY);
  if (!raw) {
    // No backup — nothing to restore
    window.location.reload();
    return;
  }

  const backup = JSON.parse(raw);
  localStorage.removeItem(BACKUP_KEY);

  const base44 = await getClient();
  const me = await base44.auth.me();

  // Restore the original profile values
  await applyDemoValues(me.id, backup);

  // Clear onboarding flags so normal use isn't affected
  ONBOARDING_FLAGS.forEach((key) => localStorage.removeItem(key));

  window.location.href = '/';
}

/**
 * Check if currently in demo mode (backup exists in localStorage).
 */
export function isInDemoMode() {
  return !!localStorage.getItem(BACKUP_KEY);
}

/**
 * Get the backed-up profile (for display in the exit banner).
 */
export function getDemoBackup() {
  const raw = localStorage.getItem(BACKUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}