/**
 * applyCreditDeltas — move a Joba balance by a delta, ONE write per user.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * A balance must NEVER be written with `User.updateMany(...)`.
 *
 * The platform REJECTS any bulk update of the User entity outright — verified
 * against the live API, which answers "Bulk user update not allowed" even for a
 * filter that matches nothing. So every function that used the atomic
 * `updateMany({ id }, { $inc: { worker_credits } })` form threw before it could
 * finish: the boost was never charged, the application fee was never taken, and
 * refunds never landed. The caller only saw a failed request, so nothing
 * surfaced the reason.
 *
 * A SINGLE-record write IS allowed, so the balance is read, adjusted and
 * written back.
 *
 * ── WHY IT IS GROUPED PER USER ─────────────────────────────────────────────
 * An absolute write cannot be parallelised for the same user: two concurrent
 * read-modify-writes both start from the same balance and the second overwrites
 * the first, so one of the two changes is silently lost. Deltas are therefore
 * summed per user and applied as ONE write — which is also why a worker holding
 * two applications on the same task is paid for both instead of only one.
 *
 * Returns the resulting balance per user, so a caller can write a ledger row
 * that carries the balance that ACTUALLY resulted rather than one it assumed.
 *
 * @param sr       the service-role client (`base44.asServiceRole`)
 * @param patches  `[{ id, delta }]` — one entry per balance change
 * @returns        `{ [userId]: resultingBalance }`
 */
export async function applyCreditDeltas(sr, patches) {
  const deltasByUser = new Map();
  for (const p of patches || []) {
    if (!p?.id || !p.delta) continue;
    deltasByUser.set(p.id, (deltasByUser.get(p.id) || 0) + p.delta);
  }

  const balances = {};
  await Promise.all(
    [...deltasByUser.entries()].map(async ([id, delta]) => {
      const users = await sr.entities.User.filter({ id });
      const balance = (users?.[0]?.worker_credits ?? 0) + delta;
      await sr.entities.User.update(id, { worker_credits: balance });
      balances[id] = balance;
    }),
  );
  return balances;
}