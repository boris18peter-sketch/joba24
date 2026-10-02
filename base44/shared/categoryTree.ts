export const PARENTS = [
  { key: 'parent_events', label: 'אירועים', icon: '🎉', children: ['events', 'photography'] },
  { key: 'parent_cleaning', label: 'ניקיון', icon: '🧹', children: ['cleaning'] },
  { key: 'parent_moving', label: 'הובלות ועזרה פיזית', icon: '🚛', children: ['moving', 'heavy_lifting'] },
  { key: 'parent_home', label: 'בית ותחזוקה', icon: '🏠', children: ['plumbing','electricity','handyman','painting','carpentry','ac','locksmith','gardening','home_maintenance'] },
  { key: 'parent_transport', label: 'רכב, משלוחים וקניות', icon: '🚗', children: ['car','transportation','delivery','shopping'] },
  { key: 'parent_care', label: 'טיפול וסיוע', icon: '🤝', children: ['pets','babysitting','elderly_care'] },
  { key: 'parent_learning', label: 'לימודים וכושר', icon: '📚', children: ['tutoring','fitness'] },
  { key: 'parent_personal', label: 'עזרה אישית ושירותים נוספים', icon: '📋', children: ['personal_help','other'] },
  { key: 'parent_digital', label: 'מחשבים וטכנולוגיה', icon: '💻', children: ['it_support'] },
];
export const EVENT_SERVICES = [
  ['waiters','מלצרים','🍽️'], ['bartenders','ברמנים','🍸'], ['djs','תקליטנים','🎧'],
  ['event_producers','מפיקי אירועים','🎬'], ['event_setup','הקמה ופירוק','🛠️'],
  ['event_decorations','קישוטים ועיצוב אירועים','🎈'],
];
export async function listAll(entity, query = null, sort = 'created_date') {
  const result = []; let offset = 0;
  for (;;) { const rows = query ? await entity.filter(query, sort, 500, offset) : await entity.list(sort, 500, offset); result.push(...(rows || [])); if (!rows || rows.length < 500) return result; offset += rows.length; }
}
export function rootKey(key, map) {
  const visited = new Set(); let node = map[key];
  while (node?.parent_key && !visited.has(node.category_key)) { visited.add(node.category_key); node = map[node.parent_key]; }
  return node?.category_key || null;
}
export function treeError(rows) {
  const map = Object.fromEntries(rows.map(r => [r.category_key, r]));
  for (const row of rows) {
    const seen = new Set([row.category_key]); let p = row.parent_key;
    while (p) { if (seen.has(p)) return 'category_cycle'; seen.add(p); if (!map[p] || map[p].node_type !== 'parent') return 'parent_invalid'; p = map[p].parent_key; }
  }
  return null;
}