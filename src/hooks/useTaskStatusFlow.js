import { useMemo } from 'react';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { resolveStatusFlow } from '@/lib/taskStatusFlow';

/**
 * useTaskStatusFlow — resolves the category-aware lifecycle presentation for a
 * task's Actionable Category, reading the GLOBAL catalogue.
 *
 * Every component that shows a task status uses this hook instead of a
 * hardcoded label map, so a category's flow is defined once (globally) and
 * appears identically in the banner, the task sheet, the worker CTA and the
 * client tracker.
 *
 * @param {string} categoryKey  Task.category
 */
export default function useTaskStatusFlow(categoryKey) {
  const { rows } = useGlobalCategories();
  return useMemo(() => resolveStatusFlow(categoryKey, rows), [categoryKey, rows]);
}