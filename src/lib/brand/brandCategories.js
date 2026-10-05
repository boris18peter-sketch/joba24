import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBrand } from '@/lib/brand/BrandProvider';
import { CATEGORIES } from '@/lib/categories';
import { useGlobalCategories, globalFormFields } from '@/lib/brand/globalCategories';
import { deriveServices, serviceGroups } from '@/lib/brand/categoryTree';
import { resolveCategoryContent, resolveBrandExamples } from '@/lib/brand/categoryContent';
export const PLATFORM_CATEGORY_KEYS = CATEGORIES.map(c => c.value);
export const isBrandSpecificKey = key => !!key && !PLATFORM_CATEGORY_KEYS.includes(key);
export const platformCategoryLabel = key => CATEGORIES.find(c => c.value === key)?.label || key;
export async function fetchBrandCategoryRows(brandId) {
  return brandId ? await base44.entities.BrandCategory.filter({ brand_id:brandId }, 'sort_order',500) : [];
}
export function useBrandCategories() {
  const { brandId,brand,isPlatformBrand } = useBrand(), cache = useQueryClient();
  const scopeQuery = useQuery({ queryKey:['brandScope',brandId], queryFn:async () => (await base44.entities.Brand.filter({ id:brandId }))?.[0], enabled:!!brandId, staleTime:60000 });
  const effectiveBrand = scopeQuery.data || brand;
  const legacy = useQuery({ queryKey:['brandCategories',brandId], queryFn:() => fetchBrandCategoryRows(brandId), enabled:!!brandId && effectiveBrand?.category_model_version !== 2 });
  const global = useGlobalCategories();
  useEffect(() => base44.entities.Brand.subscribe(event => { if (event.id === brandId) cache.invalidateQueries({ queryKey:['brandScope',brandId] }); }), [brandId,cache]);
  const services = deriveServices(global.rows,effectiveBrand,legacy.data || []);
  const categories = services.map(g => ({ ...g,value:g.category_key,label:g.label || platformCategoryLabel(g.category_key),fields:globalFormFields(g,global.map),brandSpecific:isBrandSpecificKey(g.category_key) }));
  // Single source of truth for every Brand-facing task example / placeholder.
  const examplesFor = (limit = 4) => resolveBrandExamples(global.rows, categories, effectiveBrand, limit).map(e => e.text);
  return { categories,isPlatformBrand,examples:examplesFor(4),examplesFor,groups:serviceGroups(global.rows,categories,effectiveBrand),rows:legacy.data || [],globalRows:global.rows,globalMap:global.map,
    contentFor:value => resolveCategoryContent(global.rows,value,effectiveBrand),
    configured:effectiveBrand?.category_model_version === 2 || !!legacy.data?.length,
    isLoading:scopeQuery.isLoading || global.isLoading || (effectiveBrand?.category_model_version !== 2 && legacy.isLoading),
    taskCategoryFor:value => value,
    rowFor:value => (legacy.data || []).find(r => r.category_key === value) || null,
    formFieldsFor:value => globalFormFields(global.map[value],global.map) };
}