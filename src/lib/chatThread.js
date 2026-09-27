/**
 * Chat threads.
 *
 * A conversation belongs to exactly TWO people — the task owner and one
 * counterpart (an applicant, the approved worker, or whoever the owner is
 * talking to). `task_id` alone cannot express that, so every message also
 * carries a `thread_key`: the two participant ids, sorted and joined. Two
 * applicants on the same task therefore get two separate threads and never
 * see each other's messages.
 */

/** Stable key for the conversation between two users. */
export function chatThreadKey(a, b) {
  if (!a || !b) return null;
  return [a, b].sort().join('__');
}

/** The other participant of a thread, from this user's point of view. */
export function threadCounterpart(threadKey, myId) {
  if (!threadKey || !myId) return null;
  return threadKey.split('__').find((id) => id !== myId) || null;
}

/**
 * Is this message part of the given thread?
 *
 * Messages written before threads existed have no `thread_key`; they are
 * included only when their sender is one of the two participants, so a third
 * applicant's old messages can never leak into this thread.
 */
export function isMessageInThread(msg, threadKey, pairIds = []) {
  if (!msg || !threadKey) return false;
  if (msg.thread_key) return msg.thread_key === threadKey;
  return pairIds.includes(msg.sender_id);
}