/**
 * Shared task utilities — STATUS_GRADIENT, STATUS_LABEL, repost navigation
 */

export const STATUS_GRADIENT = {
  OPEN:      'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
  TAKEN:     'linear-gradient(135deg, #1a6fd4 0%, #3b82f6 100%)',
  COMPLETED: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  CANCELLED: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
  EXPIRED:   'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
};

export const STATUS_LABEL = {
  OPEN: 'Open', TAKEN: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXPIRED: 'Expired',
};

/**
 * Build the repost URL for a task (navigate to create-task with prefilled params).
 * Returns the full path string.
 */
export function buildRepostUrl(task) {
  // Always use editId so ALL fields (images, scheduled_time, requirements, etc.) are loaded from the task
  return `/create-task?editId=${task.id}&repost=1`;
}