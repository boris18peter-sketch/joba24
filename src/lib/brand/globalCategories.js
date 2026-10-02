import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * The GLOBAL category catalogue at runtime.
 *
 * `GlobalCategory` is the single authoritative definition of every category and
 * its TASK FORM. Every Brand reads this same catalogue; none of them owns a
 * copy. Editing a form in Admin → Categories therefore changes the task form for
 * every Brand that offers that category, with no per-Brand work.
 */

export async function fetchGlobalCategories() {
  const rows = await base44.entities.GlobalCategory.list('sort_order', 500);
  return rows || [];
}

/** The ordered, enabled fields of a global category — its task form. */
export function globalFormFields(row) {
  if (!row || row.active === false) return [];
  return (row.fields || [])
    .filter((f) => f.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function useGlobalCategories() {
  const cache = useQueryClient();
  useEffect(() => base44.entities.GlobalCategory.subscribe(() => {
    cache.invalidateQueries({ queryKey: ['globalCategories'] });
    cache.invalidateQueries({ queryKey: ['brandDashboard'] });
  }), [cache]);
  const { data, isLoading } = useQuery({
    queryKey: ['globalCategories'],
    queryFn: fetchGlobalCategories,
    staleTime: 60000,
  });

  const rows = data || [];
  const map = {};
  for (const r of rows) map[r.category_key] = r;

  return { rows, map, isLoading };
}