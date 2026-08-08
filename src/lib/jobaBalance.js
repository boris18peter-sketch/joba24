/**
 * Joba Balance helpers
 * 
 * Joba24 uses "ג'ובות" (Jobas) as the work-balance currency.
 * The charge model: task_price * 0.05 = jobas deducted per application.
 * So 1 joba = ₪20 of task value.
 * 
 * These helpers convert raw credit numbers into human-friendly value,
 * WITHOUT exposing the 5% formula — just framing it as "work capacity".
 */

/** 1 joba = ₪20 of task value */
export const JOBA_VALUE_NIS = 20;

/**
 * Format the ₪-worth of a joba amount for package / balance displays.
 * Example: 5 jobas → "₪100" (worth of tasks you can commit to)
 *          100 jobas → "₪2,000"
 */
export function jobasToNis(jobas) {
  return (jobas || 0) * JOBA_VALUE_NIS;
}

/**
 * Human label for a package — short, sharp value framing.
 */
export function packageValueLabel(jobas, t) {
  const nis = jobasToNis(jobas).toLocaleString('en-US');
  if (typeof t === 'function') return t('buy_value_label', { nis });
  return `מאפשר להגיש בקשות למשימות עד ₪${nis}`;
}

/**
 * Short balance caption for wallet header.
 * Example: "מספיק לעבודות בשווי ₪2,000"
 */
export function balanceValueCaption(jobas, t) {
  const nis = jobasToNis(jobas).toLocaleString('en-US');
  if (typeof t === 'function') return t('balance_value_caption', { nis });
  return `מספיק לעבודות בשווי ₪${nis}`;
}

/**
 * Compute locked (committed) jobas from a list of pending applications.
 * Locked = sum of credits_charged where status === 'pending'.
 */
export function computeLockedJobas(applications) {
  if (!Array.isArray(applications)) return 0;
  return applications
    .filter(app => app.status === 'pending')
    .reduce((sum, app) => sum + (app.credits_charged || 0), 0);
}