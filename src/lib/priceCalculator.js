/**
 * Calculate the current price of a task based on auto-bump settings
 * If auto_bump_enabled and base_price + max_price are set, the price gradually increases over time
 * Otherwise, returns the fixed price
 */
export function calculateCurrentPrice(task) {
  // If auto_bump not enabled or missing required fields, return fixed price
  if (!task.auto_bump_enabled || !task.base_price || !task.max_price) {
    return task.price;
  }

  // Price increases linearly over 24 hours
  const createdTime = new Date(task.created_date).getTime();
  const now = new Date().getTime();
  const elapsedMs = now - createdTime;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const bumpProgressPercent = Math.min(elapsedHours / 24, 1); // Cap at 100% (24 hours)

  const priceIncrease = (task.max_price - task.base_price) * bumpProgressPercent;
  const currentPrice = task.base_price + priceIncrease;

  return parseFloat(currentPrice.toFixed(2));
}