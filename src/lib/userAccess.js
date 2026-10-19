/**
 * The app's REAL access rule, in one place.
 *
 * A user gets in only on an explicit verdict: the account is explicitly
 * approved, it is a platform admin, or the launch settings release it (the
 * pre-launch gate is off — either to everyone, or to accounts created after the
 * chosen cutoff).
 *
 * This mirrors src/components/Layout.jsx exactly. Keeping it in one module is
 * what stops the admin dashboard from showing a verdict that disagrees with the
 * app itself: a user who is already navigating the interface must never read as
 * "ממתין לאישור" in the dashboard.
 *
 * `settings` is the JobaSettings record (useJobaSettings() returns it merged
 * over the defaults), so a missing record is treated as the gate being ON.
 */
export function resolveLaunchRelease(settings, user) {
  // The gate is ON unless it was explicitly switched off — fail closed.
  if (settings?.pre_launch_gate_active !== false) return false;

  const mode = settings?.pre_launch_release_mode;
  if (mode === 'all') return true;

  if (mode === 'new_only') {
    const releaseMs = settings?.pre_launch_release_at ? new Date(settings.pre_launch_release_at).getTime() : NaN;
    const createdMs = user?.created_date ? new Date(user.created_date).getTime() : 0;
    // A missing or invalid cutoff releases nobody — it must never fall through
    // to "everyone".
    return Number.isFinite(releaseMs) && Number.isFinite(createdMs) && createdMs >= releaseMs;
  }

  return false;
}

/**
 * Everything the dashboard needs to describe one user's current access:
 * whether they can actually use the app right now, and WHY.
 */
export function resolveUserAccess(user, settings) {
  const isAdmin = user?.role === 'admin';
  const blocked = user?.is_blocked === true;
  const explicitlyApproved = user?.is_approved === true;
  const releasedByLaunch = resolveLaunchRelease(settings, user);

  return {
    isAdmin,
    blocked,
    explicitlyApproved,
    releasedByLaunch,
    // `is_approved` alone is NOT the verdict: the app also lets in admins and
    // anyone the launch settings release.
    hasAccess: !blocked && (explicitlyApproved || isAdmin || releasedByLaunch),
  };
}