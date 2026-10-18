import { useMemo } from 'react';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { categoryKeyForTask, categoryMatches, rootOf } from '@/lib/brand/categoryTree';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The category picker shown next to search (Home + Map).
 *
 * On the platform Brand the shopper picks a NEED, not a service: the options are
 * the broad ROOT categories ("אינסטלציה"), and a task counts towards the root it
 * sits under. A partner Brand keeps listing the exact services it offers.
 *
 * Every option is VISIBLE immediately — grouping is only a section header for
 * ordering, so nothing hides behind an accordion.
 */
export default function MarketServiceFilter({ tasks, selected = [], onChange }) {
  const { groups, categories, isLoading, globalMap, isPlatformBrand } = useBrandCategories();
  const { t } = useLanguage();

  // Platform Brand → the roots behind the offered services, de-duplicated.
  const options = useMemo(() => {
    if (!isPlatformBrand) return categories;
    const byRoot = new Map();
    for (const c of categories) {
      const root = rootOf(globalMap[c.value], globalMap);
      const key = root?.category_key || c.value;
      if (byRoot.has(key)) continue;
      byRoot.set(key, { ...c, value: key, label: root?.label || c.label, icon: root?.icon || c.icon });
    }
    return [...byRoot.values()];
  }, [categories, globalMap, isPlatformBrand]);

  // The same visual sections, rebuilt over the roots.
  const optionGroups = useMemo(() => {
    const byGroup = new Map();
    for (const o of options) {
      const group = globalMap[o.value]?.group_key ? globalMap[globalMap[o.value].group_key] : null;
      const key = group?.category_key || 'other';
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          category_key: key,
          label: group?.label || t('svc_other'),
          icon: group?.icon || '',
          sort_order: group?.sort_order ?? 999,
          services: [],
        });
      }
      byGroup.get(key).services.push(o);
    }
    return [...byGroup.values()].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [options, globalMap]);

  const counts = {};
  for (const task of tasks) {
    if (task.status !== 'OPEN') continue;
    const key = categoryKeyForTask(task);
    for (const o of options) {
      if (categoryMatches(key, o.value, globalMap)) counts[o.value] = (counts[o.value] || 0) + 1;
    }
  }

  const option = (c) => (
    <button
      key={c.value}
      type="button"
      className={selected.includes(c.value) ? 'w-full text-start flex justify-between p-3 bg-surface-3 text-brand-primary font-bold' : 'w-full text-start flex justify-between p-3 text-jtext-1'}
      onClick={() => onChange(selected.includes(c.value) ? selected.filter(k => k !== c.value) : [...selected, c.value])}
    >
      <span>{selected.includes(c.value) ? '✓ ' : ''}{c.icon} {c.label}</span>
      <span className="text-xs text-jtext-3">{counts[c.value] || 0}</span>
    </button>
  );

  if (isLoading) return <p className="p-3 text-sm text-jtext-3">{t('svc_loading')}</p>;
  if (!options.length) return <p className="p-3 text-sm text-jtext-3">{t('svc_none')}</p>;

  if (isPlatformBrand) {
    if (optionGroups.length <= 1) return optionGroups.flatMap(g => g.services).map(option);
    return optionGroups.map(g => (
      <div key={g.category_key}>
        <div className="px-3 pt-3 pb-1 text-xs font-bold text-jtext-3">{g.icon} {g.label}</div>
        {g.services.map(option)}
      </div>
    ));
  }

  // A single group IS the whole list — a header would only repeat the brand name.
  if (groups.length <= 1) return categories.map(option);
  return groups.map(g => (
    <div key={g.category_key}>
      {!g.hideHeader && <div className="px-3 pt-3 pb-1 text-xs font-bold text-jtext-3">{g.icon} {g.label}</div>}
      {g.services.map(option)}
    </div>
  ));
}