/**
 * completionPrompt — "have we already shown this user this completion popup?"
 *
 * ── THE BUG THIS EXISTS TO KILL ─────────────────────────────────────────────
 * The rating ask and the closing note were deduplicated by component refs plus a
 * localStorage key that was written only when the sheet was CLOSED. Both halves
 * of that are fragile:
 *
 *   • A ref lives for one mount. Every Layout remount (a chat thread, the support
 *     screen, a fresh launch) cleared it and the popup was raised again.
 *   • The localStorage key was never written for a user who dismissed by closing
 *     the app, reloading, or navigating away — the most common way to say "not
 *     now". Nothing was recorded, so the very next trigger asked again. And it
 *     WAS asked again: opening a finished task, any realtime update on it, and
 *     the newest-completed-task fallback all dispatch the same ask.
 *
 * So a task the user had already been asked about came back on every launch, and
 * the closing note came back with it. That is the "it pops up every moment"
 * report.
 *
 * ── THE RULE NOW ────────────────────────────────────────────────────────────
 * A prompt is marked as ASKED the instant it is about to be shown, and the mark
 * is written to BOTH a module set (survives a remount) and localStorage
 * (survives a relaunch). One task, one user, one ask — for the rating and for the
 * note separately, because a rated task still owes its thank-you.
 *
 * Keys from earlier builds (`rated_<task>_<user>` / `congrats_<task>_<user>`) are
 * still honoured as "asked", so nobody who already went through the flow is
 * asked a second time after this change.
 */
const asked = new Set();

const storageKey = (userId, taskId, kind) => `joba24_${kind}_asked_${taskId}_${userId}`;
const legacyKey = (userId, taskId, kind) =>
  kind === 'rating' ? `rated_${taskId}_${userId}` : `congrats_${taskId}_${userId}`;

const readStorage = (key) => {
  try { return !!localStorage.getItem(key); } catch { return false; }
};

const writeStorage = (key) => {
  try { localStorage.setItem(key, '1'); } catch { /* private mode: the memory mark still holds */ }
};

export function hasAskedCompletionPrompt(userId, taskId, kind = 'rating') {
  // Without a user or a task there is nothing to identify the ask with, so it is
  // never worth showing a full-screen popup over.
  if (!userId || !taskId) return true;
  const id = `${kind}:${userId}:${taskId}`;
  if (asked.has(id)) return true;
  if (readStorage(legacyKey(userId, taskId, kind))) { asked.add(id); return true; }
  if (readStorage(storageKey(userId, taskId, kind))) { asked.add(id); return true; }
  return false;
}

export function markCompletionPromptAsked(userId, taskId, kind = 'rating') {
  if (!userId || !taskId) return;
  asked.add(`${kind}:${userId}:${taskId}`);
  writeStorage(storageKey(userId, taskId, kind));
}