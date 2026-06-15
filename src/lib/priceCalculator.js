/**
 * Calculate the current displayed price of a task.
 *
 * Auto-bump logic:
 * - Price rises linearly from base_price → max_price over 24h
 * - The backend (applyForTask) FREEZES price by writing the calculated value to task.price
 *   the moment the first applicant arrives.
 * - We detect "frozen" by checking task.last_boost_at or simply by the absence of
 *   a pending/approved application. However since we don't load applications here,
 *   we rely on the backend-frozen task.price: if auto_bump is enabled AND task.price > base_price,
 *   that means the backend already froze it → return task.price as-is.
 * - If task.price === base_price (or not set), recalculate from elapsed time.
 */
export function calculateCurrentPrice(task) {
  if (!task.auto_bump_enabled || !task.base_price || !task.max_price) {
    return task.price;
  }

  const base = task.base_price;
  const max  = task.max_price;

  // Backend freezes price on first application by writing to task.price.
  // If task.price is strictly greater than base_price, the backend already froze it.
  if (task.price && task.price > base) {
    return task.price;
  }

  // Calculate live price from elapsed time (0–24h window)
  const createdTime = task.created_date ? new Date(task.created_date).getTime() : Date.now();
  const elapsedHours = (Date.now() - createdTime) / (1000 * 60 * 60);
  const progress = Math.min(elapsedHours / 24, 1);
  const currentPrice = base + (max - base) * progress;
  return Math.round(currentPrice);
}