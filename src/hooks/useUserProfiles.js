import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useUserProfiles — the CURRENT public face of a set of users, by id.
 *
 * A name, a photo and the badges are copied onto a Task (`worker_name`,
 * `worker_verified`) and onto every ChatMessage (`sender_name`) at the moment
 * they are written. Those copies are frozen: after somebody renames themselves
 * the chat list and the conversation header keep showing the old name, and the
 * badge never appears at all because the snapshot only ever held the KYC one.
 *
 * This reads it live from the same endpoint the name resolver already uses, so
 * one request answers for a whole screen, and keeps the stored copy only as the
 * fallback for the instant before the answer arrives.
 *
 * @param {string[]} ids user ids to resolve (duplicates and falsy values ignored)
 * @returns {(id: string) => ({ name?: string, photo?: string|null,
 *            is_verified?: boolean, social_verified?: boolean } | undefined)}
 */
export function useUserProfiles(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean))].sort();

  const { data } = useQuery({
    queryKey: ['userProfiles', unique.join(',')],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserDisplayNames', { user_ids: unique });
      return res?.data?.profiles || {};
    },
    enabled: unique.length > 0,
    // Short: a rename must show up on the next visit, not after five minutes of
    // a cached answer.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  return (id) => (id ? data?.[id] : undefined);
}