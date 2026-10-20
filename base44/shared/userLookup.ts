/**
 * fetchUserMap — read many users in ONE query.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * The User entity only accepts the POSITIONAL read forms
 * (User.filter(query, sort, limit, skip)), so each function here built its own
 * lookup. Four of them did it with
 * Promise.all(ids.map(id => User.filter({ id }))) — which LOOKS like a batch
 * but is still one database round-trip per user, just fired in parallel.
 *
 * A task with thirty applicants therefore cost thirty separate queries every
 * time its publisher cancelled it, deleted it, completed it or let it expire.
 * Those are the app's most important moments: the publisher is watching a
 * button, and the refunds have to settle before the screen can answer.
 *
 * `$in` asks the same question once and returns the same records.
 *
 * Returns a plain map keyed by user id, so callers keep the `workerMap[id]`
 * shape they already use.
 */
export async function fetchUserMap(svc: any, ids: string[]): Promise<Record<string, any>> {
  const unique = [...new Set((ids || []).filter(Boolean))];
  const map: Record<string, any> = {};
  if (unique.length === 0) return map;

  // A User read returns at most `limit` rows, so the id set is chunked to match.
  // Chunking the INPUT (rather than paging with skip) is what keeps this correct
  // when some of the ids no longer exist.
  const LIMIT = 200;
  const chunkCount = Math.ceil(unique.length / LIMIT);

  for (const [c] of Array.from({ length: chunkCount }).entries()) {
    const chunk = unique.slice(c * LIMIT, c * LIMIT + LIMIT);
    const rows = await svc.entities.User.filter({ id: { $in: chunk } }, '-created_date', LIMIT, 0);
    for (const u of rows || []) map[u.id] = u;
  }

  return map;
}