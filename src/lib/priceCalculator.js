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
/**
 * Always returns task.price as stored in the DB.
 * Auto-bump display is handled separately in TaskCard/TaskDetail.
 * We never override the user-entered price with a calculated one for display.
 */
export function calculateCurrentPrice(task) {
  return task.price ?? 0;
}