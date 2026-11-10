/**
 * taskDraft — the publish form's saved draft, from the rest of the app's side.
 *
 * The form saves the draft itself (CreateTask's own debounced auto-save, same
 * localStorage key). This module exists for ONE job: clearing that draft when
 * the task it belongs to is published or deleted.
 *
 * There used to be a red dot on the raised publish button announcing an
 * unfinished draft. It was removed for good: there is no way to delete the draft
 * from the bar, so for anyone who abandoned a task the dot could never go out —
 * it became a permanent red light on the app's main action. Nothing watches the
 * draft any more; the draft still survives, so reopening the form resumes it.
 */
const DRAFT_KEY = 'joba24_create_task_draft';

/** The task was published (or its draft deleted): there is no draft left. */
export function clearTaskDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch { /* private mode */ }
}