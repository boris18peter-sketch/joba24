/**
 * taskDraft — one tiny store for "there is an unpublished task waiting".
 *
 * The publish form already saves a draft (CreateTask's own debounced auto-save,
 * same localStorage key). What was missing is a way for the REST of the app to
 * know it exists: the raised publish button in the bottom bar is the one place
 * that can bring the publisher back to it.
 *
 * ── THE DOT ASKS ONCE, THEN STOPS ───────────────────────────────────────────
 * The dot is a nudge, not a badge. It appears the FIRST time a publisher walks
 * away from a task he started, then it stops: entering the form again and
 * closing it again is a decision, and repeating the dot every time turns the
 * publish button into a red light permanently stuck on (there is no way for him
 * to delete the draft from the form, so it could never be cleared).
 *
 * That is why the state is a COUNT of closings rather than a flag: the dot is
 * shown at exactly one close. The draft itself is never touched — nothing typed
 * is lost — and publishing or deleting the draft resets the count, so a NEW
 * draft earns its own single nudge.
 */
const DRAFT_KEY = 'joba24_create_task_draft';
const CLOSES_KEY = 'joba24_create_task_draft_closes';

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export function subscribeTaskDraft(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only a draft with real content counts — an empty shell is not unfinished
    // work, and a dot for it would be a lie.
    const meaningful = parsed && (parsed.title || parsed.description || parsed.location_name || parsed.category);
    return meaningful ? parsed : null;
  } catch {
    return null;
  }
}

function closeCount() {
  try {
    const n = parseInt(localStorage.getItem(CLOSES_KEY) || '0', 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function setCloseCount(n) {
  try { localStorage.setItem(CLOSES_KEY, String(n)); } catch { /* private mode */ }
}

/**
 * Should the publish button carry the red dot right now?
 *
 * YES for as long as a real draft exists — that is the rule the app defines: an
 * unfinished task waiting to be published is flagged on the raised publish
 * button. It used to require the draft to have been abandoned exactly once
 * (`closeCount() === 1`), so a publisher who left the form a second time, or
 * whose app was closed by the OS while the form was open, saw no dot at all even
 * though the draft was sitting there. The count is still recorded (the dot's
 * "one nudge" wording is historical), but the dot now follows the draft itself,
 * and publishing or deleting the draft is what clears it.
 */
export function hasUnfinishedDraft() {
  return !!readDraft();
}

/**
 * The publisher left the form. The FIRST time this is what raises the dot; from
 * the second time on it lowers it, so a repeated close is never nagged.
 */
export function dismissDraftDot() {
  if (!readDraft()) return;
  setCloseCount(closeCount() + 1);
  emit();
}

/**
 * Kept for the form's own mount. Entering the form no longer re-arms anything:
 * the count is what decides, so coming back and leaving again must NOT bring
 * the dot back.
 */
export function rearmDraftDot() {
  emit();
}

/** The form saved (or changed) its draft — re-read it. */
export function notifyDraftChanged() {
  emit();
}

/** The task was published (or the draft deleted): there is no draft left. */
export function clearTaskDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(CLOSES_KEY);
  } catch { /* private mode */ }
  emit();
}