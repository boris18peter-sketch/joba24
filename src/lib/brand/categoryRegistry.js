let catalogue = {};
export function registerCategoryCatalogue(rows) {
  catalogue = Object.fromEntries((rows || []).map(row => [row.category_key, row]));
}
export function globalCategoryFor(key) { return catalogue[key] || null; }
export function actionableCategoryKey(task) {
  if (typeof task === 'string') return task;
  return task?.category_details?.brand_category_key || task?.category || '';
}
export function actionableCategory(task) { return globalCategoryFor(actionableCategoryKey(task)); }