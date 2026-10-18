import { useMemo } from 'react';
import { useBrandCategories } from '@/lib/brand/brandCategories';
import { categoryKeyForTask, categoryMatches, rootOf } from '@/lib/brand/categoryTree';
import { localizedCategoryLabel } from '@/lib/brand/categoryLabels';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * The category picker shown next to search (Home + Map).
 *
 * On the platform Brand the shopper picks a NEED, not a service: the options are
 * the broad ROOT categories ("אינסטלציה"), and a task counts towards the root it
 * sits under. A partner Brand keeps listing the exact services it offers.
 *
 * The list shows ONLY categories that currently have an open task. A dropdown
 * full of empty categories is a list of dead ends — tapping one produces an
 * empty feed. Group headings are gone for the same reason: they were a second
 * layer of text between the user and the choice they came here to make.
 */
export default function MarketServiceFilter({ tasks, selected = [], onChange }) {
  const { categories, isLoading, globalMap, isPlatformBrand } = useBrandCategories();
  const { t, lang } = useLanguage();

  // Platform Brand → the roots behind the offered services, de-duplicated.
  const options = useMemo(() => {
    const raw = !isPlatformBrand
      ? categories.map((c) => ({ ...c, value: c.category_key || c.value }))
      : (() => {
          const byRoot = new Map();
          for (const c of categories) {
            const root = rootOf(globalMap[c.value], globalMap);
            const key = root?.category_key || c.value;
            if (byRoot.has(key)) continue;
            byRoot.set(key, { ...c, value: key });
          }
          return [...byRoot.values()];
        })();

    // One label resolution for every option, in the reader's language.
    //
    // localizedCategoryLabel already PREFIXES the label with the category's
    // emoji (taken from the Hebrew label or the legacy i18n entry). Reading the
    // icon separately as well printed it twice — "🔌 🔌 אינסטלציה". So the
    // leading emoji is split off here: it becomes `icon`, and the label keeps
    // only the words.
    return raw.map((o) => {
      const full = localizedCategoryLabel(o.value, globalMap[o.value], lang, t);
      const lead = full.match(/^[^\p{L}\p{N}]+/u);
      return {
        ...o,
        label: lead ? full.slice(lead[0].length) : full,
        icon: (lead ? lead[0].trim() : '') || globalMap[o.value]?.icon || o.icon || '',
      };
    });
  }, [categories, globalMap, isPlatformBrand, lang, t]);

  const counts = useMemo(() => {
    const c = {};
    for (const task of tasks || []) {
      if (task.status !== 'OPEN') continue;
      const key = categoryKeyForTask(task);
      for (const o of options) {
        if (categoryMatches(key, o.value, globalMap)) c[o.value] = (c[o.value] || 0) + 1;
      }
    }
    return c;
  }, [tasks, options, globalMap]);

  // Only categories with at least one open task. A category the user already
  // picked always stays, so a filter can never become impossible to clear.
  const visible = options.filter((o) => (counts[o.value] || 0) > 0 || selected.includes(o.value));

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
  if (!visible.length) return <p className="p-3 text-sm text-jtext-3">{t('svc_none')}</p>;

  return visible.map(option);
}