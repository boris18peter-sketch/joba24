import { useBrandCategories } from '@/lib/brand/brandCategories';
import { useLanguage } from '@/lib/LanguageContext';
export default function CategoryServiceSelector({ value, onChange, allowHistorical = false }) {
  const { categories,groups,isLoading,globalMap } = useBrandCategories();
  const { t } = useLanguage();
  if (isLoading) return <p className="text-sm text-jtext-3">{t('loading')}</p>;
  if (!categories.length && !allowHistorical) return <p className="text-sm text-jtext-3">אין שירותים זמינים במותג זה.</p>;
  const option = c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>;
  return <select className="j-input p-3" aria-label={t('ct_category')} value={value} onChange={e => onChange(e.target.value)}>
    <option value="" disabled>בחרו שירות</option>
    {allowHistorical && value && !categories.some(c => c.value === value) && <option value={value}>{globalMap[value]?.label || value} (היסטורי)</option>}
    {groups.length > 1 ? groups.map(g => <optgroup key={g.category_key} label={g.label}>{g.services.map(option)}</optgroup>) : categories.map(option)}
  </select>;
}