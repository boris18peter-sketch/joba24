/**
 * ratingLink — "this link was a card that was asking for a rating".
 *
 * ── WHY IT IS ITS OWN MODULE ───────────────────────────────────────────────
 * The Live Activity / Live Update card of a FINISHED job stays on the Lock Screen
 * for one last question — the stars — and its link carries `rate=1` so opening
 * the card lands on that question instead of on the task screen somebody would
 * then have to hunt through.
 *
 * Two different handlers receive that link and both must honour it:
 *
 *   • the web path (`?open_task=…&rate=1`, a shared link or a cold start),
 *     handled by DeepLinkHandler;
 *   • the native path (a Universal Link / App Link tap while the app is already
 *     running), handled by NativeTaskLink — which used to read the task id and
 *     silently drop the rest of the query.
 *
 * Keeping the key and the event in one module is what stopped the two paths from
 * disagreeing: a flag parked by one is read by the other, because it is the same
 * string.
 *
 * ── IT IS PARKED, NOT PASSED ───────────────────────────────────────────────
 * The link is usually consumed long after it arrives (auth, onboarding and Brand
 * routing all happen first), so the intent is parked next to the task and taken
 * once, when the task is actually opened. `sessionStorage` is right here: the
 * intent belongs to this visit — a card answered on the Lock Screen must not make
 * tomorrow's launch open a rating.
 */
const KEY = 'joba24_rate_task';

/** Raised once the task is being opened, so the rating sheet can be shown. */
export const RATE_TASK_EVENT = 'joba24_auto_rate';

/** Record that this link asked for a rating. `isAsk` false clears a stale one. */
export function parkRatingLink(taskId, isAsk) {
  if (!taskId) return;
  try {
    if (isAsk) sessionStorage.setItem(KEY, taskId);
    else if (sessionStorage.getItem(KEY) === taskId) sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked — the task still opens, just not on the ask */
  }
}

/** True exactly once per parked link, for the matching task. */
export function takeRatingLink(taskId) {
  if (!taskId) return false;
  try {
    if (sessionStorage.getItem(KEY) !== taskId) return false;
    sessionStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}