import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Current display names, resolved LIVE by user id.
 *
 * Why this exists: a user's chosen name lives in `display_name` on their User
 * record. Records that mention a person (a task's `worker_name`, an application's
 * `worker_name`, a message's `sender_name`) hold a COPY taken when they were
 * written, so they keep showing the old name after the person renames
 * themselves. Anything that shows someone else's name resolves it from here by
 * their stable id, and keeps the stored copy only as the fallback for the moment
 * before the answer arrives.
 *
 * One request per distinct set of ids, cached for five minutes — so a screen
 * that lists several people costs a single call, not one per person.
 *
 * @param {string[]} ids user ids to resolve (duplicates and falsy values ignored)
 * @returns {(id: string, fallback?: string) => string}
 */
export function useDisplayNames(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean))].sort();

  const { data } = useQuery({
    queryKey: ['displayNames', unique.join(',')],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserDisplayNames', { user_ids: unique });
      return res?.data?.names || {};
    },
    enabled: unique.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const map = data || {};

  /** The current name for `id`, or `fallback` when it is not known yet. */
  return (id, fallback = '') => map[id] || fallback || '';
}