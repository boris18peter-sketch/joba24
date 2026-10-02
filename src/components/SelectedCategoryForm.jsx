import { useBrandCategories } from '@/lib/brand/brandCategories';
import BrandCategoryFields from '@/components/BrandCategoryFields';
import CategoryExtraFields from '@/components/CategoryExtraFields';

export default function SelectedCategoryForm({ category, values, onChange, onLegacyChange, originLat, originLng, initialValues }) {
  const { formFieldsFor, isLoading } = useBrandCategories();
  if (!category) return null;
  if (isLoading) return <p className="text-sm text-jtext-3">טוען שאלות…</p>;
  return formFieldsFor(category).length
    ? <BrandCategoryFields category={category} values={values} onChange={onChange} />
    : <CategoryExtraFields category={category} originLat={originLat} originLng={originLng} initialValues={initialValues} onChange={onLegacyChange} />;
}