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
    // "אחר" (and every "…אחרת" service) is listed LAST — the catch-all never
    // sits between real categories.
    const isOther = (key) => key === 'other' || /_other$/.test(key || '');
    return (rows || [])
      .filter((r) => r && r.active !== false && ACTIONABLE.includes(r.node_type || 'service'))
      .sort((a, b) => {
        const ao = isOther(a.category_key) ? 1 : 0;
        const bo = isOther(b.category_key) ? 1 : 0;
        if (ao !== bo) return ao - bo;
        return (a.sort_order || 0) - (b.sort_order || 0);
      })
      .map((r) => ({
        value: r.category_key,
        // The fixed list carries the emoji-prefixed labels the app has always
        // shown; the catalogue label is the fallback for everything newer.
        label: CATEGORIES.find((c) => c.value === r.category_key)?.label || r.label || r.category_key,
      }));
  }, [rows]);

  return { options, isLoading };
}