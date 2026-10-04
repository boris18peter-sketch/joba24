import { useEffect, useMemo, useState } from 'react';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { useLanguage } from '@/lib/LanguageContext';
import { rootOf } from '@/lib/brand/categoryTree';

/**
 * CategoryServiceSelector — the category picker, built from the Brand's ACTUAL
 * services. Nothing is hardcoded: every category the Brand offers is reachable,
 * and a category added globally appears here with no code change.
 *
 * - A Brand built on a SINGLE root IS that niche → its services are listed flat,
 *   with no intermediate step.
 * - A BROAD Brand groups its services under their canonical root, so the picker
 *   mirrors the real catalogue (including roots whose services live one level
 *   deeper).
 *
 * The value handed to the form is always an ACTIONABLE category key — the one
 * that owns the global task form and its Brand-aware content.
 */
export default function CategoryServiceSelector({ value, onChange, allowHistorical = false }) {
  const { categories, globalMap, isLoading } = useBrandCategories();
  const { t } = useLanguage();

  // Every canonical root the Brand's services belong to, in catalogue order.
  const roots = useMemo(() => {
    const byRoot = new Map();
    for (const s of categories) {
      const row = globalMap[s.value];
      const root = rootOf(row, globalMap) || row;
      const key = root?.category_key || s.value;
      if (!byRoot.has(key)) {
        byRoot.set(key, { key, label: root?.label || s.label, icon: root?.icon || '', sort: root?.sort_order ?? 999, services: [] });
      }
      byRoot.get(key).services.push(s);
    }
    return [...byRoot.values()].sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }, [categories, globalMap]);

  const selectedRoot =
    roots.find((r) => r.key === value || r.services.some((s) => s.value === value))?.key || '';
  const [root, setRoot] = useState(selectedRoot);
  useEffect(() => { if (selectedRoot) setRoot(selectedRoot); }, [selectedRoot]);

  if (isLoading) return <p className="text-sm text-jtext-3">{t('loading')}</p>;
  if (!categories.length && !allowHistorical) return <p className="text-sm text-jtext-3">אין שירותים זמינים במותג זה.</p>;

  const option = (c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>;
  const historical = allowHistorical && value && !categories.some((c) => c.value === value);
  const historicalOption = historical && <option value={value}>{globalMap[value]?.label || value} (היסטורי)</option>;

  // Single niche — the Brand IS one root, so its services are the choice.
  if (roots.length <= 1) {
    return <select className="j-input p-3" aria-label={t('ct_category')} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>בחרו קטגוריה</option>
      {historicalOption}
      {categories.map(option)}
    </select>;
  }

  const active = roots.find((r) => r.key === root);
  // A root that is itself its only service is chosen in one step.
  const direct = !!active && active.services.length === 1 && active.services[0].value === active.key;

  return <div className="space-y-3">
    <select className="j-input p-3" aria-label={t('ct_category')} value={root} onChange={(e) => {
      const key = e.target.value;
      setRoot(key);
      const r = roots.find((x) => x.key === key);
      const isDirect = !!r && r.services.length === 1 && r.services[0].value === r.key;
      onChange(isDirect ? r.key : '');
    }}>
      <option value="" disabled>בחרו קטגוריה</option>
      {historicalOption}
      {roots.map((r) => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
    </select>
    {active && !direct && <select
      className="j-input p-3"
      aria-label="בחירת שירות"
      value={active.services.some((s) => s.value === value) ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>בחרו שירות</option>
      {active.services.map(option)}
    </select>}
  </div>;
}