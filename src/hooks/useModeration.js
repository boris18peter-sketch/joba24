import { base44 } from '@/api/base44Client';

// Comprehensive local block list — Hebrew insults, sexual, threats, English
const BLOCKED_WORDS = [
  // Hebrew sexual/explicit
  'סקס', 'זין', 'כוס', 'תחת', 'זיון', 'מזדיין', 'מזדיינת', 'מזדיינים',
  'לזיין', 'לדפוק', 'דפוק', 'דפוקה', 'דפקתי', 'דפקת', 'זיינתי', 'זיינת',
  'מציץ', 'מציצה', 'פין', 'שדיים', 'עיסוי אינטימי',
  'בולבול', 'כוסית', 'כוסיות', 'פוצי', 'פוצה', 'תחתון', 'תחתונים',
  'גיל', 'לאנוס', 'אונס', 'מאנס', 'אנסתי', 'אנס', 'זיון חינם',
  'לשכב', 'שכב איתי', 'בסקס', 'ביחד במיטה',
  // Hebrew insults / harassment
  'שרמוטה', 'זונה', 'בן זונה', 'בת זונה', 'מנוול', 'חרא', 'כאס',
  'יבן', 'יבנה', 'מחרבן', 'בוזדיק', 'אחבל',
  'מפגר', 'מפגרת', 'מטומטם', 'מטומטמת', 'טמבל', 'טמבלה',
  'אידיוט', 'אידיוטית', 'אחמק', 'אחמקית',
  'מניאק', 'מניאקית', 'פסיכו', 'פסיכופת', 'פסיכופתית',
  'שוטה', 'כלבה', 'בן כלבה', 'חזיר', 'חזירה',
  'נבלה', 'זבל', 'אשפה', 'סחבה', 'זבלה',
  'מרושע', 'גנב', 'רמאי', 'שקרן', 'שקרנית',
  'בוגד', 'בוגדת', 'ארור', 'ארורה',
  'מסריח', 'מסריחה', 'דביל', 'דבילה', 'קרטין', 'קרטינית',
  'שפל', 'שפלה', 'מושחת', 'מושחתת',
  'כסח', 'בן כסח', 'חרוב', 'חרובה', 'פרוצה', 'פרוץ',
  'לזיין אותך', 'לדפוק אותך', 'בן מנוול', 'בן שרמוטה',
  'עזאזל', 'לך לגיהינום', 'לך תזדיין', 'לך תדפוק',
  'אפסית', 'חלאה', 'בהמה', 'יצור', 'מסכן', 'מסכנה',
  'טיפש', 'טיפשה', 'פראייר', 'פריירית', 'פרייר', 'נאיבי',
  'לוזר', 'כישלון', 'אפס מוחלט', 'חסר תקנה',
  'לא שווה כלום', 'לא שווה שום דבר',
  'ממזר', 'ממזרה', 'בסטרד', 'כלבות',
  // Hebrew threats
  'אהרוג', 'אשחט', 'אמחק', 'תמות', 'ימח שמו',
  'אפגע', 'אשבור', 'תשלם על זה',
  'אדפוק אותך', 'אשבור לך', 'אהרוג אותך', 'אסיים אותך',
  'אחסל אותך', 'אכחיד אותך', 'תיזהר ממני',
  // Arabic slurs common in Hebrew speech
  'קחבה', 'חמאר', 'כלב אבן', 'יבן אלחמאר', 'אבן זונה', 'שרמוטה אחת',
  'כס אמך', 'כס אומך', 'כואס', 'בן זונה',
  // Leetspeak / evasion variations
  'ז1ין', 'כ0ס', 'ש4מוטה', 'ז0נה',
  // English explicit/sexual
  'sex', 'porn', 'fuck', 'fucking', 'fucker', 'motherfucker', 'mf',
  'shit', 'bitch', 'dick', 'pussy', 'ass', 'asshole', 'cunt', 'cock',
  'whore', 'slut', 'nude', 'naked', 'blowjob', 'handjob',
  'masturbat', 'orgasm', 'erection', 'penis', 'vagina',
  'rape', 'molest', 'pedophile', 'incest',
  'fck', 'fuk', 'fvck', 'fcuk', 'sh1t', 'b1tch', 'a55', 'a$$',
  'wtf', 'stfu', 'gtfo',
  // English insults
  'idiot', 'moron', 'retard', 'stupid', 'loser', 'freak',
  'psycho', 'maniac', 'dumbass', 'imbecile', 'dimwit',
  'jackass', 'dipshit', 'nitwit', 'halfwit', 'scumbag',
  'bastard', 'wanker', 'prick', 'twat', 'tosser',
  'kill yourself', 'kys', 'die bitch', 'i will kill',
  'go to hell', 'drop dead', 'piece of shit', 'pos',
];

// Regex patterns for evasion (spaces/dashes/dots/asterisks between letters)
const SEP = /[\s\-_.*@#!]+/; // separator between letters
function buildSep(letters) {
  return new RegExp(letters.split('').join('[\\s\\-_.*@#!]*'), 'i');
}
const BLOCKED_REGEX = [
  // English evasion
  buildSep('fuck'),
  buildSep('shit'),
  buildSep('bitch'),
  buildSep('cunt'),
  buildSep('cock'),
  buildSep('dick'),
  buildSep('pussy'),
  buildSep('asshole'),
  buildSep('bastard'),
  buildSep('wanker'),
  // Hebrew evasion
  /כ[\s\-_.*@#!]*ו[\s\-_.*@#!]*ס/,
  /ז[\s\-_.*@#!]*י[\s\-_.*@#!]*ן/,
  /ז[\s\-_.*@#!]*י[\s\-_.*@#!]*י[\s\-_.*@#!]*ן/,
  /ז[\s\-_.*@#!]*ו[\s\-_.*@#!]*נ[\s\-_.*@#!]*ה/,
  /ש[\s\-_.*@#!]*ר[\s\-_.*@#!]*מ[\s\-_.*@#!]*ו[\s\-_.*@#!]*ט[\s\-_.*@#!]*ה/,
  /מ[\s\-_.*@#!]*פ[\s\-_.*@#!]*ג[\s\-_.*@#!]*ר/,
  /מ[\s\-_.*@#!]*ט[\s\-_.*@#!]*ו[\s\-_.*@#!]*מ[\s\-_.*@#!]*ט[\s\-_.*@#!]*ם/,
  /פ[\s\-_.*@#!]*ר[\s\-_.*@#!]*ו[\s\-_.*@#!]*צ[\s\-_.*@#!]*ה/,
  /ח[\s\-_.*@#!]*ר[\s\-_.*@#!]*א/,
  /ד[\s\-_.*@#!]*ב[\s\-_.*@#!]*י[\s\-_.*@#!]*ל/,
  /כ[\s\-_.*@#!]*ס[\s\-_.*@#!]*א[\s\-_.*@#!]*מ/,
  /ב[\s\-_.*@#!]*ן[\s\-_.* @#!]*כ[\s\-_.*@#!]*ל[\s\-_.*@#!]*ב/,
  /מ[\s\-_.*@#!]*מ[\s\-_.*@#!]*ז[\s\-_.*@#!]*ר/,
  // Number substitution (1=i/l, 0=o, 3=e, 4=a)
  /[fF][uU0][cC][kK]/,
  /[sS][hH][1iI!][tT]/,
  /[bB][1iI!][tT][cC][hH]/,
  /[aA@4][sS][sS]/,
];

function localCheck(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (BLOCKED_WORDS.some(w => lower.includes(w.toLowerCase()))) return true;
  if (BLOCKED_REGEX.some(r => r.test(text))) return true;
  return false;
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