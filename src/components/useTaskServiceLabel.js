import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { categoryKeyForTask } from '@/lib/brand/categoryTree';
import { getCategoryLabel } from '@/lib/categories';
export default function useTaskServiceLabel(task, t) {
  const { map } = useGlobalCategories();
  const key = categoryKeyForTask(task);
  return map[key]?.label || getCategoryLabel(key,t);
}