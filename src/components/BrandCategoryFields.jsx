import { useBrandCategories } from '@/lib/brand/brandCategories';
import { isFieldVisible } from '@/lib/brand/globalCategories';
import { useLanguage } from '@/lib/LanguageContext';
import useTaskFlowI18n from '@/hooks/useTaskFlowI18n';
import CategoryFieldList from '@/components/CategoryFieldList';

/**
 * BrandCategoryFields — renders the GLOBAL task form for the selected category.
 *
 * The fields come from `GlobalCategory.fields` (Admin → Categories), not from
 * the Brand. That is the whole point of the global form model: improving the
 * Events form once changes it for Joba24, Save A Date and every future Brand
 * that offers Events.
 *
 * Values are merged into the task's `category_details`, so they travel with the
 * Task exactly like the platform's own category extras.
 *
 * The DRAWING lives in CategoryFieldList, shared with the live preview in the
 * admin editor, so a question can never look like one thing while it is being
 * written and another thing once it is published.
 */
export default function BrandCategoryFields({ category, values = {}, onChange }) {
  const { formFieldsFor, globalMap } = useBrandCategories();
  const { lang } = useLanguage();
  const { tTaskFlow } = useTaskFlowI18n();
  const allFields = formFieldsFor(category);
  // The form's questions and answer chips are authored in Hebrew on the global
  // category. Each language's translation is stored beside them on the same row,
  // with the task-flow dictionary as the fallback — so a Brand that adds a
  // question in Hebrew still shows a translated form everywhere the app already
  // had that wording.
  const fieldTr = globalMap?.[category]?.translations?.[lang]?.fields || {};
  const tr = (s) => (s ? fieldTr[s] || tTaskFlow(s, lang) || s : s);
  // A conditional question appears only while its condition holds — evaluated by
  // the same helper the legacy renderer uses, so both paths behave identically.
  const fields = allFields.filter((f) => isFieldVisible(f, values));

  if (!allFields.length) return null;

  return <CategoryFieldList fields={fields} values={values} onChange={onChange} tr={tr} />;
}