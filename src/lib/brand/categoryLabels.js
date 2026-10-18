import { getCategoryLabel } from '@/lib/categories';

/**
 * Category labels and placeholder text, in the reader's language.
 *
 * The GLOBAL catalogue (GlobalCategory) is authored in Hebrew — that is the
 * source of truth and it never changes. Each row carries a `translations`
 * overlay, so the same taxonomy reads correctly in every language without
 * duplicating a single category per locale.
 *
 * Resolution order, so nothing is ever shown blank or in the wrong language:
 *   1. the row's translation for this language   (every category, incl. new ones)
 *   2. the legacy `cat_<key>` i18n entry          (the original 26 categories)
 *   3. the stored Hebrew label
 *   4. the legacy CATEGORIES table
 *
 * The emoji is NOT part of the translation: it is taken from whichever source
 * carries one, so a translated label keeps the icon it had in Hebrew.
 */
const emojiFrom = (s) => (typeof s === 'string' ? (s.match(/^[^\p{L}\p{N}]+/u)?.[0] || '') : '');

export function localizedCategoryLabel(key, row, lang, t) {
  if (!key) return '';
  const legacy = t ? t(`cat_${key}`) : null;
  const legacyOk = legacy && legacy !== `cat_${key}` ? legacy : null;
  const emoji = emojiFrom(row?.label) || emojiFrom(legacyOk) || emojiFrom(getCategoryLabel(key)) || '';

  if (lang && lang !== 'he') {
    const translated = row?.translations?.[lang]?.label;
    if (translated) return emoji + translated;
  }
  if (legacyOk) return legacyOk;
  return row?.label || getCategoryLabel(key, t);
}

/**
 * The placeholder shown inside the task-description box for a category.
 * Falls back to the stored Hebrew example, then to nothing — the caller decides
 * what a category with no example shows.
 */
export function localizedCategoryExample(key, row, lang) {
  if (lang && lang !== 'he') {
    const translated = row?.translations?.[lang]?.description_example;
    if (translated) return translated;
  }
  return row?.description_example || '';
}