/**
 * Returns task.price exactly as stored in the DB.
 * We never override the user-entered price with a calculated value for display.
 */
export function calculateCurrentPrice(task) {
  return task.price ?? 0;
}