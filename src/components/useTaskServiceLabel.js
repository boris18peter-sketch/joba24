import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { actionableCategoryKey } from '@/lib/brand/categoryRegistry';
import { getCategoryLabel } from '@/lib/categories';

/**
 * The ONE label resolver for a task's actionable category.
 *
 * A task's actionable category is its canonical global child service (e.g. DJs).
 * Every surface — card, detail, stories, matching copy, availability — reads the
 * label from here, so the same task can never be labelled two different ways.
 * Subscribing to the catalogue keeps the label correct the moment it loads.
 */
export default function useTaskServiceLabel(task, t) {
  const { map } = useGlobalCategories();
  const key = actionableCategoryKey(task);
  return map[key]?.label || getCategoryLabel(key, t);
}