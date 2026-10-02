import { useBrandCategories } from '@/lib/brand/brandCategories';
import { useLanguage } from '@/lib/LanguageContext';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { ancestorsOf } from '@/lib/brand/categoryTree';
export default function CategoryServiceSelector({ value, onChange, allowHistorical = false }) {
  const { categories,isPlatformBrand,isLoading,globalMap } = useBrandCategories();
  const { t } = useLanguage();
  const rootFor = key => ancestorsOf(globalMap[key],globalMap).at(-1)?.category_key || '';
  // Original Joba24 categories stay at level one; a category whose global parent
  // has additional services becomes a gateway to that parent's child selector.
  const originalKeys = new Set(CATEGORIES.map(c => c.value));
  const mainOptions = CATEGORIES.flatMap(c => {
    const row = globalMap[c.value];
    if (!row) return [];
    const root = rootFor(c.value);
    const children = categories.filter(s => rootFor(s.value) === root);
    const gateway = root && children.some(s => !originalKeys.has(s.value));
    if (gateway) {
      const originals = children.filter(s => originalKeys.has(s.value));
      const anchor = originals.find(s => s.icon === globalMap[root]?.icon) || originals[0];
      return anchor?.value === c.value ? [{ ...globalMap[root],value:root,children }] : [];
    }
    return categories.some(s => s.value === c.value) ? [{ ...row,value:c.value }] : [];
  });
  const selectedMain = mainOptions.find(c => c.value === value || c.children?.some(s => s.value === value))?.value || '';
  const [main,setMain] = useState(selectedMain);
  useEffect(() => { if (selectedMain) setMain(selectedMain); },[selectedMain]);
  if (isLoading) return <p className="text-sm text-jtext-3">{t('loading')}</p>;
  if (!categories.length && !allowHistorical) return <p className="text-sm text-jtext-3">אין שירותים זמינים במותג זה.</p>;
  const option = c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>;
  const historical = allowHistorical && value && !categories.some(c => c.value === value);
  const children = mainOptions.find(c => c.value === main)?.children;
  return <div className="space-y-3">
    <select className="j-input p-3" aria-label={t('ct_category')} value={isPlatformBrand ? main : value} onChange={e => {
      const key = e.target.value; setMain(key);
      onChange(isPlatformBrand && mainOptions.find(c => c.value === key)?.children ? '' : key);
    }}>
      <option value="" disabled>בחרו קטגוריה</option>
      {historical && <option value={value}>{globalMap[value]?.label || value} (היסטורי)</option>}
      {(isPlatformBrand ? mainOptions : categories).map(option)}
    </select>
    {isPlatformBrand && children && <select className="j-input p-3" aria-label="בחירת שירות" value={children.some(c => c.value === value) ? value : ''} onChange={e => onChange(e.target.value)}>
      <option value="" disabled>בחרו שירות</option>{children.map(option)}
    </select>}
  </div>;
}