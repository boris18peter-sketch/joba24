import { base44 } from '@/api/base44Client';

/**
 * Trusted public readers (Packages 4.1.2–4.4).
 *
 * Marketplace surfaces must NOT read Task / TaskApplication directly. The Brand
 * is resolved SERVER-SIDE from the request host, so the client never passes (and
 * is never trusted with) a brand id, and an unknown production host returns
 * nothing.
 *
 *   fetchPublicTasks      → Tasks this surface is allowed to show
 *   fetchApplicantStats   → application COUNTS only (no application records)
 */

export async function fetchPublicTasks(params = {}) {
  // A failed read must NEVER be reported as "no tasks". Swallowing the error and
  // returning [] made a network hiccup indistinguishable from an empty
  // marketplace, so a guest whose request failed saw a blank feed that looked
  // like a broken app — the intermittent "tasks sometimes don't appear" on
  // Android. Throwing lets React Query retry and keep the tasks already on
  // screen instead of replacing them with nothing.
  const res = await base44.functions.invoke('getPublicTasks', params);
  if (res?.data?.error) throw new Error(res.data.error);
  return res?.data?.tasks || [];
}

/** @returns {Promise<Record<string, { active: number, all: number }>>} */
export async function fetchApplicantStats(taskIds = []) {
  const ids = (taskIds || []).filter(Boolean);
  if (!ids.length) return {};
  try {
    const res = await base44.functions.invoke('getTaskApplicantStats', { taskIds: ids });
    return res?.data?.counts || {};
  } catch (e) {
    console.warn('fetchApplicantStats failed:', e?.message);
    return {};
  }
}