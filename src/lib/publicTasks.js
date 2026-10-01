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
  try {
    const res = await base44.functions.invoke('getPublicTasks', params);
    return res?.data?.tasks || [];
  } catch (e) {
    console.warn('fetchPublicTasks failed:', e?.message);
    return [];
  }
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