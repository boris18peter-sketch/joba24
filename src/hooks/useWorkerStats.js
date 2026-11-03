import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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
 * useWorkerStats — a count that narrows based on category + city selection:
 *   - category + city:  stats.category_city['cat|city']
 *   - category only:    stats.categories[cat]
 *   - nothing:          stats.total
 *
 * Data is recomputed every 5 min by the recountWorkerStats backend function.
 */
export function useWorkerStats(category, city) {
  const { data: stats } = useWorkerStatsData();

  const hasCategory = category && category !== 'other';
  const hasCity = !!city;

  const count = (() => {
    if (!stats) return 0;
    if (hasCategory && hasCity) {
      return stats.category_city?.[`${category}|${city}`] || 0;
    }
    if (hasCategory) {
      return stats.categories?.[category] || 0;
    }
    return stats.total || 0;
  })();

  return { count, hasCategory, hasCity, stats };
}