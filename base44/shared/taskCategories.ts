import { getGlobalCategories } from './globalCategories.ts';
export const categoryKeyForTask = task => task?.category_details?.brand_category_key || task?.category || '';
export function ancestors(row, map) {
  const chain = [], seen = new Set(); let key = row?.parent_key;
  while (key && map[key] && !seen.has(key)) { seen.add(key); chain.push(map[key]); key = map[key].parent_key; }
  return chain;
}
export function supportedServices(rows, brand, legacy = []) {
  const map = Object.fromEntries(rows.map(r => [r.category_key,r]));
  const active = rows.filter(r => r.node_type !== 'parent' && r.active !== false && ancestors(r,map).every(p => p.active !== false));
  if (brand?.category_model_version !== 2) {
    const enabled = new Set(legacy.filter(r => r.enabled !== false).map(r => r.category_key));
    return legacy.length ? active.filter(r => enabled.has(r.category_key)) : active;
  }
  return active.filter(r => !(brand.excluded_child_keys || []).includes(r.category_key) && ancestors(r,map).some(p => (brand.assigned_parent_keys || []).includes(p.category_key)));
}
export async function taskCatalogue(base44, brandId) {
  const [rows,brands] = await Promise.all([getGlobalCategories(base44),base44.asServiceRole.entities.Brand.filter({id:brandId})]);
  const brand = brands[0];
  const legacy = brand?.category_model_version === 2 ? [] : await base44.asServiceRole.entities.BrandCategory.filter({brand_id:brandId},'sort_order',500);
  return { rows,brand,services:supportedServices(rows,brand,legacy),map:Object.fromEntries(rows.map(r => [r.category_key,r])) };
}
export function normalizeTaskCategory(task, map) {
  const key = categoryKeyForTask(task), row = map[key];
  if (!row || row.node_type === 'parent') return task;
  return { ...task,category:key,category_id:row.id,parent_category_key:row.parent_key || '',category_label:row.label,category_icon:row.icon };
}
export function validateGlobalForm(row, values) {
  for (const field of (row.fields || []).filter(f => f.enabled !== false)) {
    const value = values[field.key], empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    if (field.required && empty) return `יש למלא: ${field.label || field.key}`;
    if (empty) continue;
    const rule = field.validation || {};
    if (field.type === 'number' && (!Number.isFinite(Number(value)) || (rule.min !== undefined && Number(value) < rule.min) || (rule.max !== undefined && Number(value) > rule.max))) return `ערך לא תקין: ${field.label || field.key}`;
    if (rule.min_length && String(value).length < rule.min_length || rule.max_length && String(value).length > rule.max_length) return `אורך לא תקין: ${field.label || field.key}`;
    if (field.type === 'select' && !(field.options || []).includes(value)) return `בחירה לא תקינה: ${field.label || field.key}`;
    if (field.type === 'multiselect' && (!Array.isArray(value) || value.some(v => !(field.options || []).includes(v)))) return `בחירה לא תקינה: ${field.label || field.key}`;
  }
  return null;
}