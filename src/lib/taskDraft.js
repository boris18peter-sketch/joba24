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
 * Kept so the form's close handler keeps compiling — but deliberately does
 * NOTHING to the dot.
 *
 * It used to record "the publisher walked away on purpose" and hide the dot.
 * Leaving the form, however, is precisely the moment the dot earns its place:
 * it is the only signal anywhere in the app that an unfinished task is waiting.
 * Because that signal was silenced by the very action it exists for, it never
 * appeared at all. The draft is untouched either way, and the dot clears when
 * the task is published or the draft is deleted.
 */
export function dismissDraftDot() {
  // No-op on purpose. See above.
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