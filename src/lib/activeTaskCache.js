/**
 * reconcileActiveTask — how the two "active task" caches converge on the server.
 *
 * ── WHY A RECONCILE AND NOT A ONE-TIME SEED ────────────────────────────────
 * `['activeWorkerTask']` and `['activeClientTask']` were SEEDED once, with
 * `old !== undefined ? old : takenTask` — so the first task written into them
 * stayed there for the life of the page, whatever the server said afterwards.
 * They are read by the Active Task Banner inside the task sheet and by the Live
 * Activity bridge, so a completed job kept a banner on screen and kept being
 * treated as live work by the card pipeline.
 *
 * The two TAKEN-task list queries are the authority (they are refetched on
 * resume, patched by the realtime layer and polled). These caches are derived
 * from them, so they are now RECONCILED on every list result:
 *
 *   • the list says there is no TAKEN task → the cache becomes null (the banner
 *     goes, and the Live Activity bridge stops treating the job as live);
 *   • a different task is now the active one → it replaces the old one;
 *   • the same task → whichever record is NEWER wins, so an older list read can
 *     never pull a newer optimistic patch backwards.
 *
 * It is a plain function rather than an effect body so the rule is testable
 * without a React tree.
 */
export function reconcileActiveTask(cached, authoritative) {
  // The list has been read and holds no TAKEN task: there is no active task.
  // This is the branch that closes the stale banner and the stale card.
  if (!authoritative) return null;

  if (!cached || cached.id !== authoritative.id) return authoritative;

  const cachedAt = Date.parse(cached.updated_date || '') || 0;
  const nextAt = Date.parse(authoritative.updated_date || '') || 0;

  // Equal timestamps resolve to the list: it is the record the realtime layer
  // patches, so it is the one every other screen is already showing.
  return nextAt >= cachedAt ? authoritative : cached;
}