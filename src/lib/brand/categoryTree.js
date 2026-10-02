export const categoryKeyForTask = task => task?.category_details?.brand_category_key || task?.category || 'other';
export function ancestorsOf(row, map) {
  const chain = [], seen = new Set([row?.category_key]); let key = row?.parent_key;
  while (key && map[key] && !seen.has(key)) { seen.add(key); chain.push(map[key]); key = map[key].parent_key; }
  return chain;
}
export function deriveServices(globals, brand, legacyRows = []) {
  const map = Object.fromEntries(globals.map(g => [g.category_key, g]));
  const active = globals.filter(g => g.node_type !== 'parent' && g.active !== false && ancestorsOf(g, map).every(p => p.active !== false));
  if (brand?.category_model_version !== 2) {
    const legacy = new Set(legacyRows.filter(r => r.enabled !== false).map(r => r.category_key));
    return legacyRows.length ? active.filter(g => legacy.has(g.category_key)) : active;
  }
  const assigned = new Set(brand.assigned_parent_keys || []), excluded = new Set(brand.excluded_child_keys || []);
  return active.filter(g => !excluded.has(g.category_key) && ancestorsOf(g, map).some(p => assigned.has(p.category_key)));
}
export function serviceGroups(globals, services) {
  const map = Object.fromEntries(globals.map(g => [g.category_key, g]));
  const groups = new Map();
  for (const service of services) {
    const chain = ancestorsOf(service, map), parent = chain.at(-1);
    const key = parent?.category_key || '';
    if (!groups.has(key)) groups.set(key, { ...(parent || { category_key: '', label: 'שירותים נוספים', sort_order: 999 }), services: [] });
    groups.get(key).services.push(service);
  }
  return [...groups.values()].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
}
export function globalFormError(fields, values) {
  for (const f of fields) {
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