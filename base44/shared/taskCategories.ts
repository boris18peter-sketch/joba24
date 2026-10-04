import { getGlobalCategories } from './globalCategories.ts';

export const categoryKeyForTask = task => task?.category_details?.brand_category_key || task?.category || '';

const isGroupNode = r => r?.node_type === 'group' || r?.node_type === 'parent';

export function ancestors(row, map) {
  const chain = [], seen = new Set(); let key = row?.parent_key;
  while (key && map[key] && !seen.has(key)) { seen.add(key); chain.push(map[key]); key = map[key].parent_key; }
  return chain;
}

/** The canonical ROOT ancestor of a category (itself when it is already a root). */
export function rootKeyOf(row, map) {
  return ancestors(row, map).at(-1)?.category_key || row?.category_key || '';
}

/**
 * Every actionable (form-owning) category beneath a node, at ANY depth.
 *
 * Generic on purpose: nothing here knows the name of a single category. A node
 * with no children is actionable itself, unless it is a pure visual group — so
 * a Brand built on a leaf root still offers that root and can never end up with
 * zero services.
 */
function collectActionable(node, map, childrenOf, excluded, seen) {
  if (!node || seen.has(node.category_key)) return [];
  seen.add(node.category_key);
  if (excluded.has(node.category_key)) return [];
  const kids = (childrenOf[node.category_key] || []).filter(r => r.active !== false);
  if (kids.length) return kids.flatMap(k => collectActionable(k, map, childrenOf, excluded, seen));
  return isGroupNode(node) ? [] : [node];
}

/**
 * The actionable categories a Brand offers.
 *
 * A Brand is scoped by assigning ROOT keys (Brand.assigned_parent_keys — the
 * field name is historical; the values are root keys). Assigning a visual group
 * expands to every actionable category beneath it.
 */
export function supportedServices(rows, brand, legacy = []) {
  const map = Object.fromEntries(rows.map(r => [r.category_key, r]));
  const childrenOf = {};
  for (const r of rows) (childrenOf[r.parent_key] ||= []).push(r);

  if (brand?.category_model_version !== 2) {
    const active = rows.filter(r => !isGroupNode(r) && r.active !== false);
    const enabled = new Set(legacy.filter(r => r.enabled !== false).map(r => r.category_key));
    return legacy.length ? active.filter(r => enabled.has(r.category_key)) : active;
  }

  const excluded = new Set(brand.excluded_child_keys || []);
  const seen = new Set();
  const out = [];
  for (const key of (brand.assigned_parent_keys || [])) {
    const node = map[key];
    if (!node || node.active === false) continue;
    for (const s of collectActionable(node, map, childrenOf, excluded, seen)) {
      if (!out.some(x => x.category_key === s.category_key)) out.push(s);
    }
  }
  return out;
}

export async function taskCatalogue(base44, brandId) {
  const [rows, brands] = await Promise.all([getGlobalCategories(base44), base44.asServiceRole.entities.Brand.filter({ id: brandId })]);
  const brand = brands[0];
  const legacy = brand?.category_model_version === 2 ? [] : await base44.asServiceRole.entities.BrandCategory.filter({ brand_id: brandId }, 'sort_order', 500);
  return { rows, brand, services: supportedServices(rows, brand, legacy), map: Object.fromEntries(rows.map(r => [r.category_key, r])) };
}

/**
 * Pin a task to its canonical taxonomy.
 *
 * `category` / `category_id` are the ACTIONABLE category; `parent_category_key`
 * is the canonical ROOT — a visual group is never persisted as a task's
 * professional category.
 */
export function normalizeTaskCategory(task, map) {
  const key = categoryKeyForTask(task), row = map[key];
  if (!row || isGroupNode(row)) return task;
  return { ...task, category: key, category_id: row.id, parent_category_key: rootKeyOf(row, map) };
}

export function validateGlobalForm(row, values = {}) {
  for (const field of (row.fields || []).filter(f => f.enabled !== false)) {
    const value = values[field.key], empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    if (field.required && empty) return `יש למלא: ${field.label || field.key}`;
    if (empty) continue;
    const rule = field.validation || {};
    if (field.type === 'number' && (!Number.isFinite(Number(value)) || (rule.min !== undefined && Number(value) < rule.min) || (rule.max !== undefined && Number(value) > rule.max))) return `ערך לא תקין: ${field.label || field.key}`;
    if (rule.min_length && String(value).length < rule.min_length || rule.max_length && String(value).length > rule.max_length) return `אורך לא תקין: ${field.label || field.key}`;
    if (field.type === 'select' && !(field.options || []).includes(value)) return `בחירה לא תקינה: ${field.label || field.key}`;
    if (field.type === 'multiselect' && (!Array.isArray(value) || value.some(v => !(field.options || []).includes(v)))) return 'בחירה לא תקינה';
  }
  return null;
}