/**
 * Dormant = the account has shown no activity for N days.
 *
 * The app cannot be told when someone uninstalls it: neither iOS nor Android
 * notifies a web app about a removal, so "deleted the app" is not a fact any
 * dashboard can read. What CAN be read is the last time the account was used
 * (`last_active_at`, written on every launch), and an account that has not
 * opened the app in a month is the honest, measurable proxy for it.
 *
 * The clock starts at the account's own creation date when it has never been
 * active, so a signup that was never opened counts too.
 */
export const DORMANT_DAYS = 30;

export function daysSinceActive(user) {
  const stamp = user?.last_active_at || user?.created_date;
  if (!stamp) return null;
  const ms = new Date(stamp).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor((Date.now() - ms) / 86400000);
}

export function isDormant(user, days = DORMANT_DAYS) {
  const since = daysSinceActive(user);
  return since != null && since >= days;
}