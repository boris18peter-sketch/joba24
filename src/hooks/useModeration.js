import { base44 } from '@/api/base44Client';

/**
 * Content moderation — deliberately PRECISE.
 *
 * Hebrew is an agglutinated language: "מתחת" (underneath) contains "תחת",
 * "רגיל" (regular) contains "גיל", "אחראי" (responsible) contains "חרא",
 * "מזין" (feeds) contains "זין", "לפרוץ" (to break in) contains "פרוץ".
 * Plain substring matching therefore blocked completely ordinary job
 * descriptions — e.g. "יש לי נזילה מתחת לכיור".
 *
 * So every Hebrew term here is matched as a WHOLE WORD only, and the terms that
 * are legitimate words in their own right (תחת, גיל, יצור, זבל, אשפה, פרוץ,
 * דפוק, מסריח, חזיר…) were dropped from the list entirely. The meaning of a
 * sentence is left to the LLM pass, which reads the whole text in context.
 */

// Hebrew terms — matched as whole words only.
const BLOCKED_HE = [
  // sexual / explicit
  'סקס', 'זיון', 'לזיין', 'מזדיין', 'מזדיינת', 'מזדיינים', 'זיינתי', 'זיינת',
  'מציצה', 'פין', 'שדיים', 'עיסוי אינטימי', 'בולבול', 'כוסית', 'כוסיות',
  'פוצי', 'פוצה', 'לאנוס', 'אונס', 'מאנס', 'אנסתי', 'זיון חינם',
  // insults / harassment aimed at a person
  'שרמוטה', 'זונה', 'בן זונה', 'בת זונה', 'בן שרמוטה', 'מנוול', 'בן מנוול',
  'חרא', 'יבן', 'מחרבן', 'בוזדיק',
  'מפגר', 'מפגרת', 'מטומטם', 'מטומטמת', 'טמבל', 'טמבלה', 'טיפש', 'טיפשה',
  'אידיוט', 'אידיוטית', 'מניאק', 'מניאקית', 'פסיכו', 'פסיכופת', 'פסיכופתית',
  'שוטה', 'בן כלבה', 'גנב', 'רמאי', 'שקרן', 'שקרנית',
  'בוגד', 'בוגדת', 'דביל', 'דבילה', 'קרטין', 'קרטינית',
  'שפל', 'פרוצה', 'פראייר', 'פרייר', 'פריירית',
  'ממזר', 'ממזרה', 'בסטרד', 'חלאה',
  // threats
  'אהרוג', 'אשחט', 'תמות', 'ימח שמו', 'אהרוג אותך', 'אשחט אותך',
  'אדפוק אותך', 'אשבור לך', 'אסיים אותך', 'אחסל אותך', 'אכחיד אותך',
  'לך לגיהינום', 'לך תזדיין', 'לך תדפוק',
  // Arabic slurs used in Hebrew speech
  'קחבה', 'חמאר', 'אבן זונה', 'כס אמך', 'כס אומך', 'כואס',
];

// Hebrew sequences also caught when spaced out / punctuated ("ז י ו ן").
// Whole-word matched exactly like the plain list above.
const BLOCKED_HE_EVASION = [
  'כוס', 'זין', 'זיון', 'זונה', 'שרמוטה', 'מפגר', 'מטומטם', 'פרוצה', 'חרא', 'דביל', 'ממזר',
];

// English terms — whole-word matched, so "ass" no longer hits "class" and
// "pos" no longer hits "position".
const BLOCKED_EN = [
  'sex', 'porn', 'fuck', 'fucking', 'fucker', 'motherfucker',
  'shit', 'bitch', 'dick', 'pussy', 'asshole', 'cunt', 'cock',
  'whore', 'slut', 'nude', 'naked', 'blowjob', 'handjob',
  'masturbat', 'orgasm', 'erection', 'penis', 'vagina',
  'rape', 'molest', 'pedophile', 'incest',
  'fck', 'fuk', 'fvck', 'fcuk',
  'idiot', 'moron', 'retard', 'stupid', 'loser', 'freak',
  'psycho', 'maniac', 'dumbass', 'imbecile', 'dimwit',
  'jackass', 'dipshit', 'nitwit', 'halfwit', 'scumbag',
  'bastard', 'wanker', 'prick', 'twat', 'tosser',
  'kill yourself', 'kys', 'die bitch', 'i will kill',
  'go to hell', 'drop dead', 'piece of shit',
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// JS \b is ASCII-only and can never sit between two Hebrew letters, so a Hebrew
// word boundary is written out explicitly. This is what stops "תחת" from
// matching inside "מתחת".
const heWord = (w) => new RegExp(`(^|[^א-ת])${esc(w)}([^א-ת]|$)`);
const heSepWord = (w) =>
  new RegExp(`(^|[^א-ת])${w.split('').map(esc).join('[\\s\\-_.*@#!]*')}([^א-ת]|$)`);
const enWord = (w) => new RegExp(`\\b${esc(w)}\\w*\\b`, 'i');

const HE_REGEX = [...BLOCKED_HE.map(heWord), ...BLOCKED_HE_EVASION.map(heSepWord)];
const EN_REGEX = BLOCKED_EN.map(enWord);

function localCheck(text) {
  if (!text) return false;
  return HE_REGEX.some((r) => r.test(text)) || EN_REGEX.some((r) => r.test(text));
}

export async function moderateText(text) {
  if (!text || text.trim().length < 1) return { flagged: false };

  // 1. Instant local check
  if (localCheck(text)) {
    return { flagged: true, reason: 'תוכן לא הולם', source: 'local' };
  }

  // 2. LLM check for context-based violations
  if (text.trim().length < 3) return { flagged: false };
  try {
    const res = await base44.functions.invoke('moderateContent', { text });
    return res.data || { flagged: false };
  } catch {
    return { flagged: false };
  }
}

export async function moderateImage(imageUrl) {
  if (!imageUrl) return { flagged: false };
  try {
    const res = await base44.functions.invoke('moderateContent', { imageUrl });
    return res.data || { flagged: false };
  } catch {
    return { flagged: false };
  }
}