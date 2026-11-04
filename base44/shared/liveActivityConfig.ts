/**
 * liveActivityConfig — the feature flag that keeps the whole Live Activity
 * pipeline switched off.
 *
 * ── DISABLED BY DEFAULT, IN TWO PLACES ─────────────────────────────────────
 * `DEFAULT_CONFIG` is false, and the entity ships with `enabled: false` too. A
 * missing row, an unreadable row, or a half-written row therefore ALL resolve to
 * "off" — there is no state in which an absent configuration can enable
 * dispatch. Only an explicit `enabled: true` row, written by an admin, arms it.
 *
 * `dry_run` is the second lock: even with the master flag on, the pipeline
 * computes and records what it would send and never contacts APNs unless
 * `dry_run` is explicitly false.
 */

export const DEFAULT_CONFIG = {
  enabled: false,
  dry_run: true,
  track_open_publisher: true,
  track_taken_publisher: true,
  track_taken_worker: true,
  environment: 'development',
  max_tokens_per_dispatch: 20,
  // Stage 2. A SEPARATE switch from `enabled`: it governs whether real task
  // events are recorded as diagnostics. Turning observation on never arms a
  // send, and arming a send later never starts recording observations.
  diagnostic_events: false,
  diagnostic_retention_days: 7,
  // ── RESTRICTED REAL-TASK TEST MODE ────────────────────────────────────────
  // An empty allowlist is the shipped state and makes the real-task path inert
  // for EVERYONE, whatever `enabled` says. Membership is the only way in.
  test_user_ids: [],
  // Real APNs for the allowlisted testers only. Never a global unlock.
  test_apns: false,
  // ── PUSH-TO-START ─────────────────────────────────────────────────────────
  // Off by default. When on, an allowlisted recipient with a start token can
  // have a card APPEAR while the app is closed. It never widens the allowlist:
  // `mayContactApnsFor` still decides, per recipient, whether anything may be
  // sent at all.
  push_to_start: false,
};

/** More ids than this and the allowlist stops being a test list. */
export const MAX_TEST_USERS = 20;

/** Coerce a stored row into a complete, safe config. Anything odd means "off". */
export function normalizeConfig(row) {
  const out = { ...DEFAULT_CONFIG };
  if (!row || typeof row !== 'object') return out;

  // Only a literal `true` arms the pipeline. A string "false" or a 1 is not
  // enough: a mistake here would start pushing to real devices.
  out.enabled = row.enabled === true;
  out.dry_run = row.dry_run !== false;
  out.track_open_publisher = row.track_open_publisher !== false;
  out.track_taken_publisher = row.track_taken_publisher !== false;
  out.track_taken_worker = row.track_taken_worker !== false;
  out.environment = row.environment === 'production' ? 'production' : 'development';

  const max = Number(row.max_tokens_per_dispatch);
  out.max_tokens_per_dispatch = Number.isFinite(max) && max > 0 ? Math.min(Math.floor(max), 100) : DEFAULT_CONFIG.max_tokens_per_dispatch;

  // Diagnostics are opt-in with a literal `true`, and retention is capped so a
  // mistyped value can never turn the diagnostic table into an archive.
  // ── The real-task allowlist ───────────────────────────────────────────────
  // Trimmed, de-duplicated, non-empty strings only, and bounded. Junk in the
  // array can therefore never widen the test surface, and an absent field is an
  // empty list — never "everybody".
  const ids = Array.isArray(row.test_user_ids) ? row.test_user_ids : [];
  out.test_user_ids = Array.from(new Set(
    ids
      .filter((id) => typeof id === 'string' && id.trim())
      .map((id) => id.trim()),
  )).slice(0, MAX_TEST_USERS);
  // Only a literal `true` arms real delivery, and only ever for those ids.
  out.test_apns = row.test_apns === true;
  // Push-to-Start is a separate, literal opt-in. A missing field, a string or a
  // 1 leaves it off, exactly like the two global locks above.
  out.push_to_start = row.push_to_start === true;

  out.diagnostic_events = row.diagnostic_events === true;
  const days = Number(row.diagnostic_retention_days);
  out.diagnostic_retention_days = Number.isFinite(days) && days > 0
    ? Math.min(Math.floor(days), 30)
    : DEFAULT_CONFIG.diagnostic_retention_days;

  return out;
}

/** May the pipeline run at all (build, plan and record)? */
export function isPipelineEnabled(config) {
  return config?.enabled === true;
}

/** May a real network request be made to APNs? Requires BOTH locks to be lifted. */
export function willContactApns(config) {
  return config?.enabled === true && config?.dry_run === false;
}

/* ══════════════════════════════════════════════════════════════════════════
   THE REAL-TASK TEST GATE
   ══════════════════════════════════════════════════════════════════════════
   The global flags above answer "may the pipeline run for everybody". These
   answer "may it run for THIS recipient", which is the question the real-task
   path asks. The two are independent on purpose:

   • A recipient NOT on the allowlist is governed by the global flags alone —
     exactly the Stage 3 behaviour, unchanged, so turning the allowlist on can
     never accidentally arm production.
   • A recipient ON the allowlist is governed by `test_apns` alone. They can
     therefore be given real pushes while `enabled` stays false and every other
     user's Lock Screen is untouched. */

/** Is this user explicitly allowlisted for the real-task test? */
export function isTestUser(config, userId) {
  if (!userId || !Array.isArray(config?.test_user_ids)) return false;
  return config.test_user_ids.includes(userId);
}

/** Is the real-task test mode configured at all? */
export function testModeActive(config) {
  return Array.isArray(config?.test_user_ids) && config.test_user_ids.length > 0;
}

/**
 * May the pipeline build/plan/write for this recipient?
 * Only an allowlisted user is reachable while the global flag is off.
 */
export function isTrackedRecipient(config, userId) {
  return isTestUser(config, userId) || isPipelineEnabled(config);
}

/**
 * May a REAL network request be made to APNs for this recipient?
 * An allowlisted user needs only `test_apns`; everybody else still needs BOTH
 * global locks lifted.
 */
export function mayContactApnsFor(config, userId) {
  if (isTestUser(config, userId)) return config?.test_apns === true;
  return willContactApns(config);
}

/** What the configuration permits for this recipient: disabled | dry_run | armed. */
export function sendGateFor(config, userId) {
  if (!isTrackedRecipient(config, userId)) return 'disabled';
  return mayContactApnsFor(config, userId) ? 'armed' : 'dry_run';
}

/** Is this (status, role) combination allowed to be tracked? */
export function isRoleTracked(config, taskStatus, role) {
  if (taskStatus === 'OPEN') return config?.track_open_publisher !== false && role === 'publisher';
  if (role === 'worker') return config?.track_taken_worker !== false;
  if (role === 'publisher') return config?.track_taken_publisher !== false;
  return false;
}