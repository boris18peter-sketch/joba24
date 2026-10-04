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

export const GENERIC_DESCRIPTION_EXAMPLE =
  'ספרו בקצרה מה צריך לעשות — כולל כל פרט שיעזור לנותן השירות להבין את העבודה.';

export const GENERIC_TASK_EXAMPLES = [
  'צריך עזרה עם משהו בבית',
  'מחפש מישהו שיסדר לי משהו',
  'צריך עזרה מקצועית',
];

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
export function resolveCategoryContent(globals, categoryKey, brand) {
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
    label: row?.label || '',
    rootKey: root?.category_key || row?.category_key || '',
    rootLabel: root?.label || row?.label || '',
    descriptionExample:
      pick(override?.description_example, row?.description_example, root?.description_example) ||
      GENERIC_DESCRIPTION_EXAMPLE,
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
export function resolveBrandExamples(globals, services, brand, limit = 4) {
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
    const c = resolveCategoryContent(globals, svc.category_key, brand);
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
  for (const ex of GENERIC_TASK_EXAMPLES) push(ex, '');
  return out.slice(0, limit);
}

/** Backwards-compatible helper: just the example strings. */
export function brandExampleStrings(globals, services, brand, limit = 4) {
  return resolveBrandExamples(globals, services, brand, limit).map((e) => e.text);
}