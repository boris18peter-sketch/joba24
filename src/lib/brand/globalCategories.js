import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { registerCategoryCatalogue, globalCategoryFor } from '@/lib/brand/categoryRegistry';

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

/**
 * The canonical ancestor chain of a category, ROOT-first, ending with the
 * category itself. A visual group owns no form and is never a task category,
 * so the walk stops there. `map` is optional — without it the published
 * catalogue is used, so both React and non-React readers inherit identically.
 */
export function globalFieldChain(row, map) {
  if (!row || row.active === false) return [];
  const lookup = (key) => (map ? map[key] : globalCategoryFor(key));
  const chain = [], seen = new Set();
  let node = row;
  while (node && !seen.has(node.category_key)) {
    seen.add(node.category_key);
    if (node.node_type === 'group' || node.node_type === 'parent') break;
    chain.unshift(node);
    node = node.parent_key ? lookup(node.parent_key) : null;
  }
  return chain;
}

/**
 * The ordered, enabled task form of a category — its ROOT's fields MERGED with
 * its own, never a straight replacement.
 *
 * A subcategory therefore inherits every question its parent root asks and adds
 * only what is genuinely unique to it. A field key the category defines itself
 * overrides the root's definition of that same key, so a service can refine a
 * question without duplicating it. Order is the field's own `order`, so the
 * root's questions keep their place and the service's extras slot in around them.
 */
export function globalFormFields(row, map) {
  const merged = new Map();
  for (const node of globalFieldChain(row, map)) {
    for (const f of (node.fields || [])) {
      if (f.enabled === false) continue;
      merged.set(f.key, f);
    }
  }
  return [...merged.values()].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Whether a field's `showWhen` condition is met by the current answers.
 *
 * The catalogue only ever stores the declarative shape the sanitizer allows — a
 * source field key plus exactly one operator — so this is the SINGLE evaluator,
 * shared by the global renderer and the legacy renderer. A field with no
 * condition is always visible.
 */
export function isFieldVisible(field, values) {
  const sw = field?.showWhen;
  if (!sw || !sw.field) return true;
  const cur = values?.[sw.field];
  // An absent / null / empty operand is not an operator. The store fills every
  // declared key, so a saved condition reads back as
  // { equals:true, notEquals:null, in:[], notIn:[] } — the empty ones must be
  // ignored, never treated as a real constraint.
  const has = (v) => v !== undefined && v !== null;
  if (has(sw.equals) && cur !== sw.equals) return false;
  if (has(sw.notEquals) && cur === sw.notEquals) return false;
  if (Array.isArray(sw.in) && sw.in.length && !sw.in.includes(cur)) return false;
  if (Array.isArray(sw.notIn) && sw.notIn.length && sw.notIn.includes(cur)) return false;
  return true;
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

  // Publish the catalogue for non-React readers (labels, icons, filtering) so a
  // child service keeps its identity everywhere without a per-component fetch.
  useEffect(() => { registerCategoryCatalogue(data || []); }, [data]);

  const rows = data || [];
  const map = {};
  for (const r of rows) map[r.category_key] = r;

  return { rows, map, isLoading };
}