import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * The worker pool — every registered professional, with the few fields the
 * public surfaces need.
 *
 * It reads through a backend function rather than the User entity directly,
 * because the User entity is not readable by a visitor who is not signed in. The
 * stack of faces and the live counts are the app's main answer to "will anyone
 * actually answer this?", and they have to be there for a guest deciding whether
 * to post — the moment they matter most. Reading the entity directly made both
 * disappear for exactly that visitor.
 *
 * ONE query, shared: the avatar stack and every count read this same key, so
 * they can never disagree about who is in the pool and the page pays for a
 * single request.
 */
export function useWorkerPool() {
  return useQuery({
    queryKey: ['workerPool'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPublicWorkerPool', {});
      return res.data?.workers || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export default useWorkerPool;