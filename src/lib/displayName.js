/**
 * Display-name helpers.
 *
 * `full_name` is a built-in auth field on the User entity, and the platform
 * refuses to change it: writing to it — through `auth.updateMe`, through
 * `entities.User.update` and even through the service role — resolves without
 * an error but leaves the stored record untouched. A user-chosen name
 * therefore lives in the custom `display_name` field, which does persist.
 *
 * Every place that shows or snapshots a name reads it through here, and
 * AuthContext exposes the merged value as `full_name` (see applyDisplayName)
 * so existing reads across the app stay correct.
 */

export const NAME_MAX_LENGTH = 40;

/** The name to show for a user: their chosen display name, else their account name. */
export function getDisplayName(user) {
  if (!user) return '';
  const custom = typeof user.display_name === 'string' ? user.display_name.trim() : '';
  if (custom) return custom;
  return typeof user.full_name === 'string' ? user.full_name.trim() : '';
}

/** Same, with a fallback for accounts that have no name at all. */
export function getDisplayNameOr(user, fallback = 'משתמש') {
  return getDisplayName(user) || fallback;
}

/** First letters of the first two words — used for avatar placeholders. */
export function getInitials(user) {
  const name = getDisplayName(user);
  if (!name) return '?';
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * Returns a copy of `user` whose `full_name` reflects the chosen display name.
 * Applied once in AuthContext, this keeps every existing `user.full_name` read
 * (and every new record that snapshots the name) consistent with the chosen
 * name, without touching each call site.
 */
export function applyDisplayName(user) {
  if (!user) return user;
  const name = getDisplayName(user);
  if (!name || name === user.full_name) return user;
  return { ...user, full_name: name };
}

/** Validates a name the user typed. Returns { ok, name } or { ok: false, error }. */
export function validateDisplayName(raw) {
  const name = (raw || '').trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'שם לא יכול להיות ריק' };
  if (name.length < 2) return { ok: false, error: 'השם קצר מדי' };
  if (name.length > NAME_MAX_LENGTH) return { ok: false, error: `עד ${NAME_MAX_LENGTH} תווים` };
  return { ok: true, name };
}