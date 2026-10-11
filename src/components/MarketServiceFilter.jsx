import { useBrandCategories } from '@/lib/brand/brandCategories';
import { categoryKeyForTask, categoryMatches } from '@/lib/brand/categoryTree';

/**
 * The category picker shown next to search (Home + Map).
 *
 * Every root is VISIBLE immediately — no collapsed accordions to hunt through.
 * Grouping is still used, but only as a visible section header for ordering, so
 * a user sees all services at a glance instead of opening a section first.
 */
export default function MarketServiceFilter({ tasks, selected = [], onChange }) {
  const { groups, categories, isLoading, globalMap } = useBrandCategories();
  // A task is counted under the option it BELONGS to: on the platform Brand the
  // options are broad roots, so a plumbing job counts towards "אינסטלציה".
  const counts = {};
  for (const task of tasks) {
    if (task.status !== 'OPEN') continue;
    const key = categoryKeyForTask(task);
    for (const c of categories) if (categoryMatches(key, c.value, globalMap)) counts[c.value] = (counts[c.value] || 0) + 1;
  }
  const option = c => <button key={c.value} type="button" className={selected.includes(c.value) ? 'w-full text-start flex justify-between p-3 bg-surface-3 text-brand-primary font-bold' : 'w-full text-start flex justify-between p-3 text-jtext-1'} onClick={() => onChange(selected.includes(c.value) ? selected.filter(k => k !== c.value) : [...selected, c.value])}>
    <span>{selected.includes(c.value) ? '✓ ' : ''}{c.icon} {c.label}</span><span className="text-xs text-jtext-3">{counts[c.value] || 0}</span>
  </button>;
  if (isLoading) return <p className="p-3 text-sm text-jtext-3">טוען שירותים…</p>;
  if (!categories.length) return <p className="p-3 text-sm text-jtext-3">אין שירותים זמינים</p>;
  // A single group IS the whole list — a header would only repeat the brand name.
  if (groups.length <= 1) return categories.map(option);
  return groups.map(g => (
    <div key={g.category_key}>
      {!g.hideHeader && <div className="px-3 pt-3 pb-1 text-xs font-bold text-jtext-3">{g.icon} {g.label}</div>}
      {g.services.map(option)}
    </div>
  ));
}