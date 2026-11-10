import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useUserProfiles — the CURRENT public face of a set of users, by id.
 *
 * ── ONE SOURCE, ONE REQUEST, ONE CACHE ──────────────────────────────────────
 * A name, a photo and the badges are copied onto a Task (`worker_name`,
 * `worker_verified`), onto every application and onto every ChatMessage
 * (`sender_name`) at the moment they are written. Those copies are frozen: after
 * somebody renames themselves or uploads a new photo, every screen that reads a
 * copy keeps showing the old one. So no screen may read the copy as its answer —
 * they all read it here, by id, from the one endpoint that resolves it live.
 *
 * ── WHY THERE IS A MODULE-LEVEL CACHE ON TOP OF REACT QUERY ─────────────────
 * React Query keys a cache entry by the exact SET of ids a screen asks for, so
 * the applicant popup (one id), the applicant list (three ids) and the chat
 * header (two) were three separate entries and three separate round trips. On a
 * phone that is the "the name/photo takes ages to update" report: the data was
 * already in memory from another screen and still had to be fetched again.
 *
 * `knownProfiles` is keyed by the USER, not by the request: the moment any
 * screen resolves a person, every other screen paints that person's current name
 * and photo on its FIRST frame, and the request that follows only refreshes
 * them. Nothing else about the person leaves the server — the endpoint returns
 * name, photo and the two public badges only.
 *
 * @param {string[]} ids user ids to resolve (duplicates and falsy values ignored)
 * @returns {(id: string) => ({ name?: string, photo?: string|null,
 *            is_verified?: boolean, social_verified?: boolean } | undefined)}
 */

/** userId → the last profile any screen resolved for them. */
const knownProfiles = new Map();

/** What this device already knows, as a placeholder for a request still in flight. */
function knownFor(ids) {
  const seed = {};
  for (const id of ids) {
    const known = knownProfiles.get(id);
    if (known) seed[id] = known;
  }
  return seed;
}

export function useUserProfiles(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean))].sort();

  const { data } = useQuery({
    queryKey: ['userProfiles', unique.join(',')],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserDisplayNames', { user_ids: unique });
      const profiles = res?.data?.profiles || {};
      for (const [id, profile] of Object.entries(profiles)) {
        knownProfiles.set(id, profile);
      }
      return profiles;
    },
    enabled: unique.length > 0,
    // Short: a rename must show up on the next visit, not after five minutes of
    // a cached answer.
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    // Already-known people are painted immediately instead of after the trip.
    placeholderData: knownFor(unique),
  });

  // The request's answer wins; a person this screen has not resolved yet falls
  // back to whatever another screen already learned.
  return (id) => (id ? data?.[id] || knownProfiles.get(id) : undefined);
}