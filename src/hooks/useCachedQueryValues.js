import { useEffect, useReducer } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Read query-cache entries WITHOUT registering a query of your own.
 *
 * ── THE BUG THIS REPLACES ─────────────────────────────────────────────────
 * A component that must only LOOK at a cache used to write this:
 *
 *     useQuery({ queryKey: ['myPublishedTasks', me.id], queryFn: () => null,
 *                enabled: false, staleTime: Infinity })
 *
 * — "observe without fetching". React Query does not work that way. An observer
 * copies its own options onto the SHARED query (`query.setOptions`), and
 * `invalidateQueries()` then refetches using the QUERY's options, not the
 * caller's. So once that component had rendered, the next invalidation of
 * `['myPublishedTasks', me.id]` ran `() => null` and replaced the publisher's
 * task list with `null`. The app shell's very next `T.find(...)` threw
 * `null is not an object (evaluating 'T.find')`, which is exactly the crash seen
 * on a published iPhone build after a Live Activity action.
 *
 * Reading the value out of the cache and subscribing to the cache's own events
 * has none of that: it registers no observer, writes no options, and cannot
 * touch a query another component owns.
 *
 * The subscription is removed on unmount (and whenever the key set changes), so a
 * long-lived screen never accumulates listeners.
 *
 * @param queryKeys array of query keys, identity may change every render
 * @returns the cached data for each key, in the same order
 */
export default function useCachedQueryValues(queryKeys) {
  const queryClient = useQueryClient();
  const [, bump] = useReducer((n) => n + 1, 0);

  // A primitive fingerprint, so a fresh array literal on every render does not
  // tear down and re-create the subscription each time.
  const fingerprint = (queryKeys || []).map((key) => JSON.stringify(key)).join('|');

  useEffect(() => {
    const wanted = new Set((queryKeys || []).map((key) => JSON.stringify(key)));
    if (!wanted.size) return undefined;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event?.query?.queryKey;
      if (!key) return;
      if (wanted.has(JSON.stringify(key))) bump();
    });
    return unsubscribe;
    // Re-subscribe only when the SET OF KEYS changes, never on identity alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, fingerprint]);

  return (queryKeys || []).map((key) => queryClient.getQueryData(key));
}