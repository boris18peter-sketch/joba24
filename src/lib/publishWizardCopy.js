import { TASK_FORM_SECTIONS } from '@/lib/taskFormFields';

/**
 * publishWizardCopy — what each step of the slider form SAYS.
 *
 * The form's own labels name the field ("תיאור המשימה", "מחיר"). A step needs
 * something else: a headline phrased as the question the publisher is actually
 * answering, and one line that explains what to do and why it matters. That is
 * the difference between a form that is filled and a form that is understood.
 *
 * The copy is keyed by the same keys the admin orders and switches in the
 * dashboard, so a step never says something its section no longer is. A section
 * added later without copy falls back to its own label and description from
 * taskFormFields — it can never render an untitled, unexplained step.
 */
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
    hint: 'כתבו בחופשיות מה הבעיה או מה צריך לבצע. מהטקסט הזה נבנית כותרת המשימה — ואיתה גם החיפוש של העובדים.',
  },
  media: {
    title: 'הוסיפו תמונה או סרטון',
    hint: 'תמונה של מה שצריך לתקן, להעביר או לבנות חוסכת שיחות ומגדילה את הסיכוי שעובד טוב יגיש בקשה.',
  },
  schedule: {
    title: 'מתי זה צריך לקרות?',
    hint: 'עד מתי המשימה פתוחה, עד כמה היא דחופה, ואם יש מועד מדויק שבו צריך להגיע.',
  },
  story: {
    title: 'רוצים עוד חשיפה?',
    hint: 'סטורי מציג את המשימה בראש הפיד לשעות הקרובות. זו תוספת — אפשר גם לדלג.',
  },
  location_name: {
    title: 'איפה העבודה מתבצעת?',
    hint: 'הכתובת המדויקת, כולל קומה או דירה אם צריך. היא נחשפת רק לעובד שתאשרו.',
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
    title: 'כמה זה שווה?',
    hint: 'המחיר שאתם מציעים לעובד. יש הצעה אוטומטית לפי מחירי השוק, ואפשר תמיד לשנות אותה.',
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

export function wizardCopy(key) {
  if (COPY[key]) return COPY[key];
  const section = TASK_FORM_SECTIONS.find(s => s.key === key);
  return { title: section?.label || '', hint: section?.desc || '' };
}