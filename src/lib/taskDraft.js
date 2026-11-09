/**
 * taskDraft — one tiny store for "there is an unpublished task waiting".
 *
 * The publish form already saves a draft (CreateTask's own debounced auto-save,
 * same localStorage key). What was missing is a way for the REST of the app to
 * know it exists: the raised publish button in the bottom bar is the one place
 * that can bring the publisher back to it, and it had no idea.
 *
 * Two facts, not one:
 *   • the draft itself (owns by the form);
 *   • whether the publisher has already said "not now" by closing the form —
 *     the dot must not nag somebody who deliberately walked away. Entering the
 *     form again re-arms it, so the next abandonment asks once more.
 *
 * Deliberately module-level with subscribers: the form and the bottom bar live in
 * different trees (the bar is portaled to <body>), exactly like popupGate.
 */
const DRAFT_KEY = 'joba24_create_task_draft';
const DISMISS_KEY = 'joba24_create_task_draft_dismissed';

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

function isDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

/** Should the publish button carry the red dot right now? */
export function hasUnfinishedDraft() {
  return !!readDraft() && !isDismissed();
}

/**
 * The publisher closed the form: the dot goes away until they open the form
 * again. The DRAFT is untouched — the work is still there to resume.
 */
export function dismissDraftDot() {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
  emit();
}

/** The publisher is back in the form — a future abandonment may ask again. */
export function rearmDraftDot() {
  try { localStorage.removeItem(DISMISS_KEY); } catch { /* private mode */ }
  emit();
}

/** The form saved (or changed) its draft — re-read it. */
export function notifyDraftChanged() {
  emit();
}

/** The task was published: there is no draft left. */
export function clearTaskDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DISMISS_KEY);
  } catch { /* private mode */ }
  emit();
}