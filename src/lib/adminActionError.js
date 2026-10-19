/**
 * One sentence for a failed admin action, in the user's language.
 *
 * Every admin action — approve, block, role, credits, KYC — runs on the server,
 * because those fields cannot be written from the browser at all (a client write
 * is silently ignored, by design: a user must never approve or promote
 * themselves). When the plan does not include backend functions, the platform
 * refuses the call with 402 and the admin sees only a status code, or — with no
 * toast surface mounted — nothing at all, which is what makes the button look
 * dead. The refusal must say what to do about it instead.
 */
export function adminActionError(error) {
  const message = String(error?.message || error || '');

  if (message.includes('402')) {
    return 'הפעולה דורשת פונקציות שרת, שאינן כלולות בתוכנית הנוכחית — נדרש שדרוג כדי לאשר או לחסום גישה';
  }
  if (/rate limit/i.test(message)) return 'יותר מדי פעולות — נסה עוד רגע';

  return 'שגיאה: ' + (message || 'לא ניתן לבצע את הפעולה');
}