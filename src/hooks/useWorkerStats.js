import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkerPool } from '@/hooks/useWorkerPool';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { countWorkers } from '@/lib/workerCounts';

/**
 * useWorkerStatsData — the pre-aggregated worker counts record.
 *
 * It is ONE record for the whole app (recomputed every few minutes by the
 * recountWorkerStats backend function), so it is fetched under a single shared
 * query key: the header indicator, a per-category rail and any other surface all
 * read the same numbers and the app pays for one request.
 */
export function useWorkerStatsData() {
  return useQuery({
    queryKey: ['workerStats'],
    queryFn: async () => {
      const records = await base44.entities.WorkerStat.filter({ stat_type: 'worker_counts' });
      return records[0]?.data || null;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

/**
 * useWorkerStats — how many professionals are available, optionally narrowed by
 * category and city.
 *
 * ── WHY IT READS THE POOL AND NOT THE PRE-AGGREGATED RECORD ────────────────
 * The WorkerStat record counts a professional under the EXACT category key they
 * saved, so a plumber who listed only a sub-service ("בעיית אינסטלציה אחרת") was
 * counted for that sub-service alone. The count in the publish form therefore
 * FELL from 39 to 2 the moment the publisher picked a service — the same trade,
 * two numbers. "אחר" was worse still: it was excluded from the lookup and fell
 * through to the whole-pool total, so one tile said 32 and the form said 140.
 *
 * Every number now comes from src/lib/workerCounts — the same function the feed's
 * category tiles call, over the same pool query — counted PER PARENT CATEGORY.
 * A sub-service therefore always shows its trade's real total.
 */
export function useWorkerStats(category, city) {
  const { data: pool = [] } = useWorkerPool();
  const { globalMap } = useBrandCategories();

  const hasCategory = !!category;
  const hasCity = !!city;

  const count = useMemo(
    () => countWorkers(pool, globalMap, {
      category: hasCategory ? category : null,
      city: hasCity ? city : null,
    }),
    [pool, globalMap, hasCategory, category, hasCity, city]
  );

  return { count, hasCategory, hasCity };
}