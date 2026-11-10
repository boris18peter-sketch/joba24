/**
 * userDisplayNames — "what is this person called RIGHT NOW", for the server.
 *
 * ── WHY THIS MODULE EXISTS ─────────────────────────────────────────────────
 * A Task freezes the counterpart's name when it is written (`client_name`,
 * `worker_name`, and one `worker_name` inside every entry of `applicants`).
 * Those copies are what the Lock Screen card, the Android live update and the
 * publisher's assign button read — so after somebody renames themselves the
 * card keeps offering "אשר את <השם הישן>" for ever, on BOTH platforms, because
 * both render the same server-built snapshot.
 *
 * The name a person chose lives in the User record (`display_name`, falling
 * back to `full_name`), and the app already treats that as the single source of
 * truth everywhere else (see `getUserDisplayNames` and `useUserProfiles`). This
 * is the server half of that rule: one batched read, applied to the task before
 * any snapshot is built, so the card can never show a frozen name again.
 *
 * Reading another user's record is not permitted for a normal user, so this
 * runs with the service role. Only the name is taken — nothing else about the
 * person leaves this module.
 */

/** A real Base44 record id. Demo/simulator ids are not, and one of them in an
 *  `$in` query rejects the WHOLE query — so they are filtered out first. */
const RECORD_ID = /^[0-9a-f]{24}$/i;

const MAX_IDS = 100;

/** id → current display name, for the ids that resolve. */
export async function resolveLiveNames(base44: any, ids: string[], limit = MAX_IDS) {
  const clean = [...new Set((ids || []).filter((id) => typeof id === 'string' && RECORD_ID.test(id)))]
    .slice(0, limit);
  const names: Record<string, string> = {};
  if (!clean.length) return names;

  const rows = await base44.asServiceRole.entities.User
    .filter({ id: { $in: clean } }, '-created_date', clean.length)
    .catch(() => []);

  for (const row of rows || []) {
    const name = String(row?.display_name || '').trim() || String(row?.full_name || '').trim();
    if (name) names[row.id] = name;
  }
  return names;
}

/**
 * The task, with every name it carries replaced by the person's current one.
 *
 * Purely a presentation fix: ids, statuses, prices and every rule that decides
 * what a card may offer are untouched, so authorization can never be widened by
 * a rename. An id that does not resolve keeps the stored copy, so a card is
 * never drawn with a blank line.
 */
export async function withLiveNames(base44: any, task: any) {
  if (!task) return task;

  const applicants = Array.isArray(task.applicants) ? task.applicants : [];
  const names = await resolveLiveNames(base44, [
    task.client_id,
    task.worker_id,
    ...applicants.map((a: any) => a?.worker_id),
  ]);

  const nameOf = (id: string | undefined, fallback: string | undefined) =>
    (id && names[id]) || fallback || '';

  return {
    ...task,
    client_name: nameOf(task.client_id, task.client_name),
    worker_name: nameOf(task.worker_id, task.worker_name),
    applicants: applicants.map((a: any) => ({
      ...a,
      worker_name: nameOf(a?.worker_id, a?.worker_name),
    })),
  };
}