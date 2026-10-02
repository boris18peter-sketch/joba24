import { useBrandCategories } from '@/lib/brand/brandCategories';
import { categoryKeyForTask } from '@/lib/brand/categoryTree';
export default function MarketServiceFilter({ tasks, selected = [], onChange }) {
  const { groups,categories,isLoading } = useBrandCategories();
  const counts = {};
  for (const task of tasks) if (task.status === 'OPEN') { const key=categoryKeyForTask(task); counts[key]=(counts[key] || 0)+1; }
  const option = c => <button key={c.value} type="button" className={selected.includes(c.value) ? 'w-full text-start flex justify-between p-3 bg-surface-3 text-brand-primary font-bold' : 'w-full text-start flex justify-between p-3 text-jtext-1'} onClick={() => onChange(selected.includes(c.value) ? selected.filter(k => k !== c.value) : [...selected,c.value])}>
    <span>{selected.includes(c.value) ? '✓ ' : ''}{c.icon} {c.label}</span><span className="text-xs text-jtext-3">{counts[c.value] || 0}</span>
  </button>;
  if (isLoading) return <p className="p-3 text-sm text-jtext-3">טוען שירותים…</p>;
  if (!categories.length) return <p className="p-3 text-sm text-jtext-3">אין שירותים זמינים</p>;
  return groups.length > 1 ? groups.map(g => <details key={g.category_key} className="border-b border-jborder-1"><summary className="cursor-pointer p-3 text-sm font-bold text-jtext-1">{g.icon} {g.label}</summary>{g.services.map(option)}</details>) : categories.map(option);
}