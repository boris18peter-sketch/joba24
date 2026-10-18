/**
 * categoryContent — the single Brand-aware content layer.
 *
 * Every piece of Task-facing helper copy (homepage examples, publish-task
 * description placeholder, helper chips, empty states, search hints, matching
 * copy) resolves through here instead of being hardcoded in a component.
 *
 * Resolution priority — never falls through to an unrelated category:
 *   1. Brand-specific override, if explicitly configured
 *      (BrandConfig.category_content_overrides[categoryKey])
 *   2. Global actionable-category content (GlobalCategory.description_example /
 *      examples / helper_copy)
 *   3. Root-category content (the canonical root's own copy)
 *   4. Generic platform fallback
 *
 * The category content itself is GLOBAL: Save A Date consumes the same DJ
 * example that Joba24 consumes. Improving it once improves it for every Brand.
 */

import { genericCategoryCopy } from '@/lib/brand/genericCategoryCopy';

export const GENERIC_DESCRIPTION_EXAMPLE = genericCategoryCopy('he').description_example;
export const GENERIC_TASK_EXAMPLES = genericCategoryCopy('he').examples;

/**
 * The translated value of a content field on a catalogue row.
 *
 * The Hebrew fields stay the source of truth; `translations[lang]` is the
 * presentation overlay written on every category. Reading the translation FIRST
 * is what keeps a French screen from falling back to a Hebrew example.
 */
function translated(row, field, lang) {
  if (!row || !lang || lang === 'he') return null;
  return row.translations?.[lang]?.[field] || null;
}

function clean(list) {
  return (list || []).filter((x) => typeof x === 'string' && x.trim());
}

/** Brand-level override for one category, if the Brand configured one. */
function brandOverride(brand, categoryKey) {
  const map = brand?.category_content_overrides;
  if (!map || !categoryKey) return null;
  return map[categoryKey] || null;
}

/**
 * The resolved content for ONE actionable category.
 * Pure function — usable from React and from non-React code alike.
 */
export function resolveCategoryContent(globals, categoryKey, brand, lang = 'he') {
  const rows = globals || [];
  const map = Object.fromEntries(rows.map((g) => [g.category_key, g]));
  const row = map[categoryKey] || null;

  // Canonical root ancestor (walks parent_key, not the visual group).
  let root = null;
  {
    const seen = new Set([categoryKey]);
    let key = row?.parent_key;
    while (key && map[key] && !seen.has(key)) { seen.add(key); root = map[key]; key = map[key].parent_key; }
  }

  const override = brandOverride(brand, categoryKey);
  const pick = (...vals) => vals.find((v) => (Array.isArray(v) ? v.length : v)) || null;

  return {
    categoryKey: categoryKey || '',
    label: translated(row, 'label', lang) || row?.label || '',
    rootKey: root?.category_key || row?.category_key || '',
    rootLabel: translated(root, 'label', lang) || root?.label || row?.label || '',
    descriptionExample:
      pick(
        override?.description_example,
        translated(row, 'description_example', lang),
        row?.description_example,
        translated(root, 'description_example', lang),
        root?.description_example,
      ) || genericCategoryCopy(lang).description_example,
    examples: clean(
      pick(override?.examples, row?.examples, root?.examples) || [],
    ),
    helperCopy:
      pick(override?.helper_copy, row?.helper_copy, root?.helper_copy) || '',
  };
}

/**
 * Homepage / empty-state / onboarding examples for the ACTIVE Brand.
 * Drawn from the Brand's own actionable categories, so a Plumbing Brand never
 * shows a babysitting example and a generic Joba24 Brand stays broad.
 */
export function resolveBrandExamples(globals, services, brand, limit = 4, lang = 'he') {
  const out = [];
  const seen = new Set();
  const usedRoots = new Set();
  const push = (text, key) => {
    const t = String(text || '').trim();
    if (!t || seen.has(t) || out.length >= limit) return;
    seen.add(t);
    out.push({ text: t, category_key: key });
  };

  const items = (services || []).map((svc) => {
    const c = resolveCategoryContent(globals, svc.category_key, brand, lang);
    return { key: svc.category_key, root: c.rootKey || svc.category_key, examples: c.examples };
  });

  // Pass 1 — one example per canonical root, so a BROAD Brand shows breadth
  // instead of draining the first category in the list. A single-niche Brand
  // simply contributes its first example here and fills up in pass 2.
  for (const it of items) {
    if (usedRoots.has(it.root)) continue;
    usedRoots.add(it.root);
    if (it.examples[0]) push(it.examples[0], it.key);
  }
  // Pass 2 — fill the remainder from every remaining example.
  for (const it of items) for (const ex of it.examples) push(ex, it.key);

  // Fall back to generic examples only when the active scope has no content.
  for (const ex of genericCategoryCopy(lang).examples) push(ex, '');
  return out.slice(0, limit);
}

/** Backwards-compatible helper: just the example strings. */
export function brandExampleStrings(globals, services, brand, limit = 4, lang = 'he') {
  return resolveBrandExamples(globals, services, brand, limit, lang).map((e) => e.text);
}