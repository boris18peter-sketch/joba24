/**
 * The GLOBAL category catalogue.
 *
 * TASK FORMS ARE GLOBAL PER CATEGORY. A category — its name, icon, description,
 * ordering, active state and its whole task form (questions, field types,
 * required flags, options, validation) — is defined ONCE in `GlobalCategory`
 * and shared by every Brand that offers it.
 *
 * A Brand never owns a copy of a form. `BrandCategory` only records whether the
 * Brand offers the category, in what order, and an optional display
 * label/icon override. Improving a form here improves it for every Brand.
 *
 * This module is the only place that knows the shape of the catalogue, so the
 * admin function, the public reader and the task-creation form all agree.
 */

/** The platform Task.category enum — a fixed list that must never be extended per Brand. */
export const PLATFORM_CATEGORY_KEYS = [
  'plumbing', 'electricity', 'handyman', 'cleaning', 'moving', 'heavy_lifting',
  'painting', 'carpentry', 'ac', 'locksmith', 'gardening', 'home_maintenance',
  'car', 'transportation', 'delivery', 'shopping', 'pets', 'babysitting',
  'elderly_care', 'tutoring', 'fitness', 'photography', 'events',
  'personal_help', 'it_support', 'other',
];

export const FIELD_TYPES = [
  'text', 'textarea', 'number', 'select', 'multiselect', 'boolean', 'date', 'time',
];

/**
 * The starting catalogue, used only to seed `GlobalCategory` once. After that
 * the entity is authoritative — editing a label or icon here does nothing.
 */
export const PLATFORM_CATEGORY_SEED = [
  { key: 'plumbing', icon: '🔧', label: 'אינסטלציה' },
  { key: 'electricity', icon: '⚡', label: 'חשמלאות' },
  { key: 'handyman', icon: '🔨', label: 'הנדימן / תיקונים' },
  { key: 'cleaning', icon: '🧹', label: 'ניקיון' },
  { key: 'moving', icon: '🚛', label: 'הובלה' },
  { key: 'heavy_lifting', icon: '💪', label: 'עזרה פיזית' },
  { key: 'painting', icon: '🎨', label: 'צביעה' },
  { key: 'carpentry', icon: '🪵', label: 'נגרות' },
  { key: 'ac', icon: '❄️', label: 'מזגנים' },
  { key: 'locksmith', icon: '🔐', label: 'מנעולן' },
  { key: 'gardening', icon: '🌿', label: 'גינון' },
  { key: 'home_maintenance', icon: '🏠', label: 'תחזוקת בית' },
  { key: 'car', icon: '🚗', label: 'רכב' },
  { key: 'transportation', icon: '🚙', label: 'הסעות וטרמפים' },
  { key: 'delivery', icon: '📦', label: 'משלוח' },
  { key: 'shopping', icon: '🛒', label: 'קניות' },
  { key: 'pets', icon: '🐶', label: 'בעלי חיים' },
  { key: 'babysitting', icon: '👶', label: 'בייביסיטר' },
  { key: 'elderly_care', icon: '👵', label: 'סיוע לקשישים' },
  { key: 'tutoring', icon: '📚', label: 'שיעורים פרטיים' },
  { key: 'fitness', icon: '🏋️', label: 'כושר וספורט' },
  { key: 'photography', icon: '📸', label: 'צילום ותוכן' },
  { key: 'events', icon: '🎉', label: 'אירועים' },
  { key: 'personal_help', icon: '🤝', label: 'עזרה אישית' },
  { key: 'it_support', icon: '💻', label: 'מחשבים' },
  { key: 'other', icon: '📋', label: 'אחר' },
];

export const KEY_RE = /^[a-z][a-z0-9_]{1,40}$/;

/** A global key that is NOT in the Task enum is stored on the Task as 'other'. */
export function isBrandSpecificKey(key: string) {
  return !!key && !PLATFORM_CATEGORY_KEYS.includes(key);
}

/** Keep a form to the supported, practical shape. */
export function sanitizeFields(raw: unknown) {
  const fields = Array.isArray(raw) ? raw : [];
  return fields
    .filter((f: any) => f && typeof f.key === 'string' && KEY_RE.test(f.key))
    .slice(0, 40)
    .map((f: any, i: number) => {
      const out: any = {
        key: f.key,
        label: String(f.label || f.key).slice(0, 120),
        description: String(f.description || '').slice(0, 240),
        type: FIELD_TYPES.includes(f.type) ? f.type : 'text',
        required: f.required === true,
        enabled: f.enabled !== false,
        order: Number.isFinite(Number(f.order)) ? Number(f.order) : i,
        options: Array.isArray(f.options)
          ? f.options.map((o: any) => String(o).slice(0, 80)).filter(Boolean).slice(0, 30)
          : [],
      };
      if (f.validation && typeof f.validation === 'object') {
        const v: any = {};
        for (const k of ['min', 'max', 'min_length', 'max_length', 'pattern']) {
          if (f.validation[k] !== undefined && f.validation[k] !== '') v[k] = f.validation[k];
        }
        if (Object.keys(v).length) out.validation = v;
      }
      return out;
    })
    .sort((a: any, b: any) => a.order - b.order);
}

/** Every global category row, ordered. */
export async function getGlobalCategories(base44: any) {
  const rows = await base44.asServiceRole.entities.GlobalCategory.list('sort_order', 500);
  return rows || [];
}

/** category_key -> GlobalCategory row. */
export async function getGlobalCategoryMap(base44: any) {
  const rows = await getGlobalCategories(base44);
  const map: Record<string, any> = {};
  for (const r of rows) map[r.category_key] = r;
  return map;
}

/**
 * The global task form for a category, as ordered enabled fields.
 * Returns [] when the category has no form or does not exist.
 */
export async function getGlobalCategoryForm(base44: any, categoryKey: string) {
  if (!categoryKey) return [];
  const rows = await base44.asServiceRole.entities.GlobalCategory.filter({ category_key: categoryKey });
  const row = rows?.[0];
  if (!row || row.active === false) return [];
  return (row.fields || [])
    .filter((f: any) => f.enabled !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
}