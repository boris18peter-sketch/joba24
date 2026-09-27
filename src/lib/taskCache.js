/**
 * The `['task', id]` query is read as a SINGLE task by several screens, but the
 * raw cache value arrives in two different shapes:
 *
 *   • the queryFn uses `base44.entities.Task.filter({ id })` → an ARRAY
 *   • realtime handlers and optimistic updates write ONE object
 *
 * Every screen that assumed a single shape broke whenever the other one was in
 * the cache: `data[0]` on a plain object is `undefined` → "לא נמצאה משימה" /
 * blank task sheet. Spreading an array into an object (`{ ...old, ...patch }`)
 * was just as bad — it produced `{ 0: task, ...patch }`, losing the task.
 *
 * These helpers make the shape irrelevant: readers normalise either form, and
 * writers always merge into one object.
 */

export const taskQueryKey = (id) => ['task', id];

/** Accepts either an array (from `.filter()`) or a single object. */
export function selectTask(data) {
  if (!data) return undefined;
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Merge `patch` into the cached task, whatever shape it is currently in.
 * `create: false` leaves the cache untouched when no task is cached yet.
 */
export function patchTaskCache(queryClient, id, patch, { create = true } = {}) {
  if (!queryClient || !id) return;
  queryClient.setQueryData(taskQueryKey(id), (old) => {
    const base = selectTask(old);
    if (!base) return create ? { ...patch } : old;
    return { ...base, ...patch };
  });
}