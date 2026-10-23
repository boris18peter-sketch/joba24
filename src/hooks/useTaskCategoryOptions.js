import { useMemo } from 'react';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { CATEGORIES } from '@/lib/categories';

/**
 * The categories a task can actually be posted under — read from the live
 * catalogue rather than a list kept in code.
 *
 * A visual group owns no task form and is never a task category, so only roots
 * and services are offered. That is what keeps the demo generator in step with
 * Admin → Categories: a category added there is usable here immediately, and a
 * category disabled there disappears from here too.
 */
const ACTIONABLE = ['root', 'service'];

export default function useTaskCategoryOptions() {
  const { rows, isLoading } = useGlobalCategories();

  const options = useMemo(() => {
    return (rows || [])
      .filter((r) => r && r.active !== false && ACTIONABLE.includes(r.node_type || 'service'))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((r) => ({
        value: r.category_key,
        // The fixed list carries the emoji-prefixed labels the app has always
        // shown; the catalogue label is the fallback for everything newer.
        label: CATEGORIES.find((c) => c.value === r.category_key)?.label || r.label || r.category_key,
      }));
  }, [rows]);

  return { options, isLoading };
}