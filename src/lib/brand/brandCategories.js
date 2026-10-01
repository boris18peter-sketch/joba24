import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBrand } from '@/lib/brand/BrandProvider';
import { CATEGORIES } from '@/lib/categories';
import { fetchGlobalCategories, globalFormFields } from '@/lib/brand/globalCategories';

/**
 * Brand categories at runtime.
 *
 * The split of authority:
 *
 *   GlobalCategory  → the category definition AND its task form (GLOBAL, shared)
 *   BrandCategory   → only whether THIS Brand offers it, in what order, plus an
 *                     optional display label/icon override
 *
 * A Brand therefore never owns a form. Improving a category's form in
 * Admin → Categories changes it for every Brand that offers that category.
 *
 * A row is offered when `enabled !== false`. A key outside the platform
 * Task.category enum is stored on the Task as `category: 'other'` with the key
 * kept in `category_details.brand_category_key` (the enum is fixed and is never
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

/** This Brand's rows, including disabled ones (the admin needs to see them). */
export async function fetchBrandCategoryRows(brandId) {
  if (!brandId) return [];
  const rows = await base44.entities.BrandCategory.filter({ brand_id: brandId }, 'sort_order', 300);
  return rows || [];
}

/** The categories the CURRENT surface's Brand offers, ordered. */
export function useBrandCategories() {
  const { brandId } = useBrand();

  const brandQuery = useQuery({
    queryKey: ['brandCategories', brandId],
    queryFn: () => fetchBrandCategoryRows(brandId),
    enabled: !!brandId,
    staleTime: 60000,
  });

  const globalQuery = useQuery({
    queryKey: ['globalCategories'],
    queryFn: fetchGlobalCategories,
    staleTime: 60000,
  });

  const rows = brandQuery.data || [];
  const globals = globalQuery.data || [];
  const globalMap = {};
  for (const g of globals) globalMap[g.category_key] = g;

  const activeGlobals = globals.filter((g) => g.active !== false);
  const configured = rows.length > 0;

  const shape = (key, overrideLabel, overrideIcon) => {
    const g = globalMap[key];
    return {
      value: key,
      label: overrideLabel || g?.label || platformCategoryLabel(key),
      icon: overrideIcon || g?.icon || '',
      description: g?.description || '',
      fields: globalFormFields(g),
      brandSpecific: isBrandSpecificKey(key),
    };
  };

  const categories = configured
    ? rows
        .filter((r) => r.enabled !== false)
        .slice()
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((r) => shape(r.category_key, r.label, r.icon))
    : activeGlobals.map((g) => shape(g.category_key));

  /** The Task.category value to persist for a Brand category choice. */
  const taskCategoryFor = (value) => (isBrandSpecificKey(value) ? 'other' : value);

  /** The BrandCategory row behind a category value, if any. */
  const rowFor = (value) => rows.find((r) => r.category_key === value) || null;

  /** The GLOBAL task form for a category value — one definition, all Brands. */
  const formFieldsFor = (value) => globalFormFields(globalMap[value]);

  return {
    categories,
    rows,
    globalRows: globals,
    globalMap,
    configured,
    isLoading: brandQuery.isLoading || globalQuery.isLoading,
    taskCategoryFor,
    rowFor,
    formFieldsFor,
  };
}