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
};

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

/** Is this (status, role) combination allowed to be tracked? */
export function isRoleTracked(config, taskStatus, role) {
  if (taskStatus === 'OPEN') return config?.track_open_publisher !== false && role === 'publisher';
  if (role === 'worker') return config?.track_taken_worker !== false;
  if (role === 'publisher') return config?.track_taken_publisher !== false;
  return false;
}