import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBrand } from '@/lib/brand/BrandProvider';
import { CATEGORIES } from '@/lib/categories';

/**
 * Brand categories at runtime.
 *
 * BrandCategory is the AUTHORITATIVE source for the categories a Brand offers.
 * The platform catalogue (src/lib/categories.js) is only the fallback label
 * source and the fallback list when a Brand has no configuration yet.
 *
 * A row is offered when `enabled !== false`. A row whose `category_key` is not
 * in the platform Task.category enum is a BRAND-SPECIFIC category: it is stored
 * on the Task as `category: 'other'` with the brand key preserved in
 * `category_details.brand_category_key` (the Task enum is fixed and must not be
 * extended per Brand).
 */

export const PLATFORM_CATEGORY_KEYS = CATEGORIES.map((c) => c.value);

export function isBrandSpecificKey(key) {
  return !!key && !PLATFORM_CATEGORY_KEYS.includes(key);
}

/** Platform label (emoji + text) for a category key, or a neutral fallback. */
export function platformCategoryLabel(key) {
  return CATEGORIES.find((c) => c.value === key)?.label || key;
}

export async function fetchBrandCategories(brandId) {
  if (!brandId) return [];
  const rows = await base44.entities.BrandCategory.filter({ brand_id: brandId }, 'sort_order', 300);
  return (rows || []).filter((r) => r.enabled !== false);
}

/**
 * The categories the CURRENT surface's Brand offers, ordered by sort_order.
 * Falls back to the platform catalogue while loading or when the Brand has no
 * rows yet, so a Brand is never left with an empty category list.
 */
export function useBrandCategories() {
  const { brandId } = useBrand();

  const { data, isLoading } = useQuery({
    queryKey: ['brandCategories', brandId],
    queryFn: () => fetchBrandCategories(brandId),
    enabled: !!brandId,
    staleTime: 60000,
  });

  const rows = data || [];
  const configured = rows.length > 0;

  const categories = configured
    ? rows.map((r) => ({
        value: r.category_key,
        label: r.label || platformCategoryLabel(r.category_key),
        icon: r.icon || '',
        formConfig: r.form_config || {},
        brandSpecific: isBrandSpecificKey(r.category_key),
      }))
    : CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: '', formConfig: {}, brandSpecific: false }));

  /** The Task.category value to persist for a Brand category choice. */
  const taskCategoryFor = (value) => (isBrandSpecificKey(value) ? 'other' : value);

  /** The BrandCategory row behind a category value, if any. */
  const rowFor = (value) => rows.find((r) => r.category_key === value) || null;

  return { categories, rows, configured, isLoading, taskCategoryFor, rowFor };
}