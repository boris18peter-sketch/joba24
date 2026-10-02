import { useBrandCategories } from '@/lib/brand/brandCategories';
import { useBrand } from '@/lib/brand/BrandProvider';
import { getCategoryLabel } from '@/lib/categories';

/**
 * The PROFESSIONAL SCOPE of the current Brand.
 *
 * User identity is global — a user's professional categories live on the User
 * record and are never duplicated per Brand. What changes per Brand is which of
 * those categories are VISIBLE and EDITABLE on that surface.
 *
 *   Brand scope → the global service categories this Brand offers
 *
 * Joba24 (the platform Brand) is broad: every category is in scope and its
 * presentation is unchanged. A specialised Brand only ever sees its own
 * services — a Plumbing Brand never shows DJ or Waiter.
 *
 * Filtering is by canonical GlobalCategory key (never by label text), so the
 * same category can never be mis-matched by a translated string.
 */

/** Canonical label for a professional key, from the global catalogue. */
export function professionalLabel(key, map, t) {
  return map?.[key]?.label || getCategoryLabel(key, t);
}

export function useProfessionalScope() {
  const { categories, globalMap, isLoading } = useBrandCategories();
  const { isPlatformBrand } = useBrand();

  const keys = categories.map((c) => c.category_key);
  const keySet = new Set(keys);

  return {
    isPlatformBrand,
    isLoading,
    services: categories,
    globalMap,
    keys,
    /** Is this canonical category part of the current Brand's professional scope? */
    has: (key) => isPlatformBrand || (!!key && keySet.has(key)),
    /** Keep only the categories this Brand exposes. Joba24 keeps everything. */
    filter: (list) => (isPlatformBrand ? (list || []) : (list || []).filter((k) => keySet.has(k))),
    label: (key, t) => professionalLabel(key, globalMap, t),
  };
}

/**
 * A category label that respects the Brand context.
 *
 * A category INSIDE the Brand's scope keeps its real label (DJs → תקליטנים).
 * A category OUTSIDE the Brand's scope is never exposed as an unrelated
 * profession on that surface — it is presented as the neutral "כללי".
 * Nothing stored is rewritten; this is presentation only.
 */
export function brandContextCategoryLabel(key, scope, t) {
  if (!key) return '';
  const general = t('category_general');
  const generalLabel = general && general !== 'category_general' ? general : 'כללי';
  if (scope?.isPlatformBrand) return scope.label ? scope.label(key, t) : getCategoryLabel(key, t);
  if (!scope?.has?.(key)) return generalLabel;
  return scope.label ? scope.label(key, t) : getCategoryLabel(key, t);
}