/**
 * Calculate the current price of a task based on auto-bump settings.
 * Price increases linearly over 24 hours from base_price to max_price.
 * STOPS increasing as soon as there is at least one active applicant.
 */
export function calculateCurrentPrice(task) {
  if (!task.auto_bump_enabled || !task.base_price || !task.max_price) {
    return task.price;
  }

  // Freeze price when there are active applicants
  const activeApplicants = (task.applicants || []).length;
  if (activeApplicants > 0) {
    // Return the stored price (which was the price at the time of the first application)
    return task.price;
  }

  // Price increases linearly over 24 hours
  const createdTime = new Date(task.created_date).getTime();
  const now = new Date().getTime();
  const elapsedHours = (now - createdTime) / (1000 * 60 * 60);
  const progress = Math.min(elapsedHours / 24, 1);

  const currentPrice = task.base_price + (task.max_price - task.base_price) * progress;
  return Math.round(currentPrice);
}