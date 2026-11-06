/**
 * popupGate — one tiny lock so two full-screen celebrations never land on top
 * of each other.
 *
 * A 5-star loyalty bonus is granted by the CLIENT's review, which is the exact
 * moment the worker is being asked to rate the client back. Both are full-screen
 * sheets, so the bonus covered the rating sheet and the rating was never given.
 *
 * The rating sheet is the one that must come first — it is a required action and
 * a real rating is what the platform runs on — so it takes the gate while it is
 * open, and the bonus is held until the gate clears.
 *
 * Deliberately a plain module store rather than context: the two popups live in
 * different trees (the rating sheet in Layout, the bonus in GlobalPopups above
 * the router), and a module-level set is the smallest thing that reaches both.
 */
const blockers = new Set();
const listeners = new Set();

export function setPopupBlock(key, active) {
  if (active) blockers.add(key);
  else blockers.delete(key);
  listeners.forEach((fn) => fn());
}

/**
 * Is the screen taken? `exceptKey` asks the same question on behalf of a holder
 * that should not count itself — the rating ask claims the gate the moment it is
 * scheduled, and then has to see whether anything ELSE is still on screen before
 * it opens.
 */
export function isPopupBlocked(exceptKey) {
  if (!exceptKey) return blockers.size > 0;
  for (const key of blockers) if (key !== exceptKey) return true;
  return false;
}

export function subscribePopupGate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}