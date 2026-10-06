/**
 * categoryTree — the GENERIC taxonomy engine.
 *
 * It knows nothing about Plumbing, Events or Save A Date. Every decision is
 * derived from data:
 *
 *   node_type 'group'   → a VISUAL section only. Never a task category.
 *   node_type 'root'    → a niche/root category. A Brand can be built around it.
 *   node_type 'service' → an actionable category that owns a global task form.
 *
 * A Brand is scoped by assigning ROOT keys (Brand.assigned_parent_keys — the
 * field name is historical; the values are root keys). Whatever a Brand assigns,
 * its users get the actionable categories beneath it, at any depth, with no
 * per-Brand content. A root that has no children falls back to being actionable
 * itself, so a Brand can never end up with zero services.
 */

export { actionableCategoryKey as categoryKeyForTask } from '@/lib/brand/categoryRegistry';
import { isFieldVisible } from '@/lib/brand/globalCategories';

const isGroupNode = (n) => n?.node_type === 'group' || n?.node_type === 'parent';
const isActive = (n) => !!n && n.active !== false;

/** Canonical ancestor chain (parent_key), root-last. */
export function ancestorsOf(row, map) {
  const chain = [], seen = new Set([row?.category_key]);
  let key = row?.parent_key;
  while (key && map[key] && !seen.has(key)) { seen.add(key); chain.push(map[key]); key = map[key].parent_key; }
  return chain;
}

/** The canonical ROOT node of a category (itself when it is already a root). */
export function rootOf(row, map) {
  return ancestorsOf(row, map).at(-1) || row || null;
}

/** The visual group a category should be presented under, if any. */
export function groupOf(row, map) {
  const root = rootOf(row, map);
  if (!root) return null;
  return (root.group_key && map[root.group_key]) || null;
}

/**
 * Every actionable (form-owning) category beneath a node, at any depth.
 * A node with no children is actionable itself — unless it is a pure group.
 */
function collectActionable(node, map, childrenOf, excluded, seen) {
  if (!node || seen.has(node.category_key)) return [];
  seen.add(node.category_key);
  if (excluded.has(node.category_key)) return [];
  const kids = (childrenOf[node.category_key] || []).filter(isActive);
  if (kids.length) return kids.flatMap((k) => collectActionable(k, map, childrenOf, excluded, seen));
  return isGroupNode(node) ? [] : [node];
}

/**
 * The actionable categories a Brand offers.
 * Legacy (non model-2) Brands keep their explicit BrandCategory rows.
 */
export function deriveServices(globals, brand, legacyRows = []) {
  const map = Object.fromEntries(globals.map((g) => [g.category_key, g]));
  const childrenOf = {};
  for (const g of globals) (childrenOf[g.parent_key] ||= []).push(g);

  if (brand?.category_model_version !== 2) {
    const active = globals.filter((g) => isActive(g) && !isGroupNode(g));
    const legacy = new Set(legacyRows.filter((r) => r.enabled !== false).map((r) => r.category_key));
    return legacyRows.length ? active.filter((g) => legacy.has(g.category_key)) : active;
  }

  const excluded = new Set(brand.excluded_child_keys || []);
  const assigned = brand.assigned_parent_keys || [];
  const seen = new Set();
  const out = [];
  for (const key of assigned) {
    const node = map[key];
    if (!node || !isActive(node)) continue;
    // An assigned GROUP expands to every actionable category beneath it;
    // an assigned ROOT yields its children (or itself when it has none).
    for (const s of collectActionable(node, map, childrenOf, excluded, seen)) {
      if (!out.some((x) => x.category_key === s.category_key)) out.push(s);
    }
  }
  return out;
}

/**
 * Presentational grouping.
 *
 * A Brand built on a single root IS that niche — a section header would only
 * repeat the Brand's own name, so it is suppressed. Otherwise categories are
 * grouped by their visual group (Joba24's broad sections), falling back to the
 * canonical root's own label.
 */
export function serviceGroups(globals, services, brand) {
  const map = Object.fromEntries(globals.map((g) => [g.category_key, g]));
  const assigned = (brand?.assigned_parent_keys || []).filter((k) => map[k]);
  const singleNiche = assigned.length === 1;

  const groups = new Map();
  for (const service of services) {
    const root = rootOf(service, map);
    const group = singleNiche ? null : (groupOf(service, map) || null);
    const key = group?.category_key || root?.category_key || '';
    if (!groups.has(key)) {
      groups.set(key, {
        category_key: key,
        label: group?.label || root?.label || 'שירותים נוספים',
        icon: group?.icon || root?.icon || '',
        sort_order: group?.sort_order ?? root?.sort_order ?? 999,
        hideHeader: singleNiche,
        services: [],
      });
    }
    groups.get(key).services.push(service);
  }
  return [...groups.values()].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/** Canonical root key for a task — what should be persisted as parent_category_key. */
export function canonicalRootKey(globals, categoryKey) {
  const map = Object.fromEntries(globals.map((g) => [g.category_key, g]));
  const row = map[categoryKey];
  return row ? (rootOf(row, map)?.category_key || '') : '';
}

export function globalFormError(fields, values) {
  for (const f of fields) {
    // A question the user cannot see must never block submission.
    if (!isFieldVisible(f, values)) continue;
    const v = values?.[f.key], empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    if (f.required && empty) return `יש למלא: ${f.label || f.key}`;
    if (empty) continue;
    if (f.type === 'number' && (!Number.isFinite(Number(v)) || (f.validation?.min !== undefined && Number(v) < Number(f.validation.min)) || (f.validation?.max !== undefined && Number(v) > Number(f.validation.max)))) return `ערך לא תקין: ${f.label || f.key}`;
    if (f.validation?.min_length && String(v).length < Number(f.validation.min_length)) return `ערך קצר מדי: ${f.label || f.key}`;
    if (f.validation?.max_length && String(v).length > Number(f.validation.max_length)) return `ערך ארוך מדי: ${f.label || f.key}`;
    if (f.type === 'select' && !(f.options || []).includes(v)) return `בחירה לא תקינה: ${f.label || f.key}`;
    if (f.type === 'multiselect' && (!Array.isArray(v) || v.some(x => !(f.options || []).includes(x)))) return `בחירה לא תקינה: ${f.label || f.key}`;
  }
  return null;
}