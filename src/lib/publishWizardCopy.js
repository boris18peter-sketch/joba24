import { TASK_FORM_SECTIONS } from '@/lib/taskFormFields';

/**
 * publishWizardCopy — what each step of the slider form SAYS.
 *
 * The form's own labels name the field ("תיאור המשימה", "מחיר"). A step needs
 * something else: a headline phrased as the question the publisher is actually
 * answering, and one line that explains what to do and why it matters.
 *
 * ── IT DESCRIBES WHAT IS ON THE SCREEN, NOT WHAT COULD HAVE BEEN ───────────
 * A step's copy is written from the fields the admin actually kept. "עד מתי
 * המשימה פתוחה" used to sit above a screen with no expiry field in it at all,
 * and "כולל קומה או דירה" above a form that only asks for a street. A headline
 * that names something not on the screen is worse than no headline: it makes
 * the publisher look for a field that is not there.
 *
 * The copy is keyed by the same keys the admin orders and switches in the
 * dashboard. A section added later without copy falls back to its own label and
 * description from taskFormFields, so no step can render untitled.
 */

function scheduleCopy(fieldOn) {
  const expiry = fieldOn('expiry');
  const urgency = fieldOn('urgency');
  const exact = fieldOn('exact_datetime');

  // The title asks only about what is there. With one question on the screen it
  // is that question; with several, the general one is honest.
  const title =
    expiry && !urgency && !exact ? 'עד מתי המשימה פתוחה?'
    : urgency && !expiry && !exact ? 'כמה זה דחוף?'
    : exact && !expiry && !urgency ? 'מתי צריך להגיע?'
    : 'מתי זה צריך לקרות?';

  const hint =
    expiry && urgency && exact ? 'עד מתי המשימה פתוחה, כמה היא דחופה, ואם יש מועד מדויק שבו צריך להגיע.'
    : expiry && urgency ? 'עד מתי המשימה פתוחה, וכמה היא דחופה.'
    : expiry && exact ? 'עד מתי המשימה פתוחה, ובאיזה מועד צריך להגיע.'
    : urgency && exact ? 'מתי צריך להגיע, וכמה זה דחוף.'
    : expiry ? 'עד מתי המשימה נשארת פתוחה לעובדים.'
    : urgency ? 'כמה דחוף שהעובד יגיע.'
    : exact ? 'באיזה תאריך ושעה צריך להגיע.'
    : '';

  return { title, hint };
}

function locationCopy(fieldOn) {
  const details = fieldOn('address_details');
  return {
    title: 'איפה העבודה מתבצעת?',
    hint: details
      ? 'הכתובת של מקום העבודה, ואם צריך גם בניין, קומה או דירה. היא נחשפת רק לעובד שתאשרו.'
      : 'הכתובת של מקום העבודה. היא נחשפת רק לעובד שתאשרו.',
  };
}

const COPY = {
  category: {
    title: 'מה צריך לעשות?',
    hint: 'בחרו את סוג השירות. מהרגע הזה הטופס מתאים את עצמו ושואל רק את מה שרלוונטי.',
  },
  category_form: {
    title: 'עוד כמה פרטים',
    hint: 'השאלות של השירות שבחרתם. ככל שהתשובות מדויקות יותר, כך מגיעים עובדים מתאימים יותר.',
  },
  description: {
    title: 'ספרו מה צריך לעשות',
    hint: 'כתבו בחופשיות מה התקלה או מה צריך לבצע כדי שבעלי מקצוע מתאימים יבינו את הבעיה ויוכלו לפנות אליכם.',
  },
  story: {
    title: 'רוצים עוד חשיפה?',
    hint: 'סטורי מציג את המשימה בראש הפיד לשעות הקרובות. זו תוספת — אפשר גם לדלג.',
  },
  requirements: {
    title: 'מה חייב להיות לעובד?',
    hint: 'רכב, כלים, ניסיון או מספר אנשים. סימון דרישות חוסך פניות של מי שלא מתאים.',
  },
  verification: {
    title: 'מי יכול להגיש בקשה?',
    hint: 'אפשר לפתוח לכולם, או להגביל לעובדים מאומתים בלבד — פחות פניות, יותר אמינות.',
  },
  price: {
    title: 'מה המחיר?',
    hint: 'המחיר שאתה מציע לעובד. לא משלמים עכשיו — תוכל לבחור עם מי להתקדם לאחר קבלת הפניות.',
  },
  payment_method: {
    title: 'איך תשלמו?',
    hint: 'מזומן, ביט או PayBox. העובד רואה את זה לפני שהוא מגיש בקשה, כך שאין הפתעות בסוף.',
  },
  contactPhone: {
    title: 'איך מתאמים הגעה?',
    hint: 'מספר טלפון שיוצג רק לעובד שתאשרו — לתיאום שעה ופרטי הגעה.',
  },
};

export function wizardCopy(key, fieldOn = () => true) {
  if (key === 'schedule') return scheduleCopy(fieldOn);
  if (key === 'location_name') return locationCopy(fieldOn);
  if (COPY[key]) return COPY[key];
  const section = TASK_FORM_SECTIONS.find(s => s.key === key);
  return { title: section?.label || '', hint: section?.desc || '' };
}