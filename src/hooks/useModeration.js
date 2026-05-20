import { base44 } from '@/api/base44Client';

// Comprehensive local block list — Hebrew insults, sexual, threats, English
const BLOCKED_WORDS = [
  // Hebrew sexual/explicit
  'סקס', 'זין', 'כוס', 'תחת', 'זיון', 'מזדיין', 'מזדיינת', 'מזדיינים',
  'לזיין', 'לדפוק', 'דפוק', 'דפוקה', 'דפקתי', 'דפקת', 'זיינתי', 'זיינת',
  'מציץ', 'מציצה', 'פין', 'שדיים', 'עיסוי אינטימי',
  // Hebrew insults / harassment
  'שרמוטה', 'זונה', 'בן זונה', 'בת זונה', 'מנוול', 'חרא', 'כאס',
  'יבן', 'יבנה', 'מחרבן', 'בוזדיק', 'אחבל',
  'מפגר', 'מפגרת', 'מטומטם', 'מטומטמת', 'טמבל', 'טמבלה',
  'אידיוט', 'אידיוטית', 'אחמק', 'אחמקית',
  'מניאק', 'מניאקית', 'פסיכו', 'פסיכופת', 'פסיכופתית',
  'שוטה', 'שוטה גמור', 'כלבה', 'בן כלבה', 'חזיר', 'חזירה',
  'נבלה', 'זבל', 'אשפה', 'פח', 'סחבה', 'זבלה',
  'מרושע', 'רשע', 'גנב', 'רמאי', 'שקרן', 'שקרנית',
  'בוגד', 'בוגדת', 'ארור', 'ארורה', 'אפס', 'אפסה',
  'מחולה', 'חולה נפש', 'לא נורמלי', 'לא נורמלית',
  'מסריח', 'מסריחה', 'דביל', 'דבילה', 'קרטין', 'קרטינית',
  'שפל', 'שפלה', 'מושחת', 'מושחתת',
  // Hebrew threats
  'אהרוג', 'אשחט', 'אמחק', 'תמות', 'למות', 'תסתלק', 'ימח שמו',
  'אפגע', 'אשבור', 'תיזהר', 'תשלם על זה',
  // Arabic slurs common in Hebrew speech
  'קחבה', 'חמאר', 'כלב אבן',
  // English explicit/sexual
  'sex', 'porn', 'fuck', 'fucking', 'fucker', 'motherfucker',
  'shit', 'bitch', 'dick', 'pussy', 'ass', 'asshole', 'cunt', 'cock',
  'whore', 'slut', 'nude', 'naked', 'blowjob', 'handjob',
  'masturbat', 'orgasm', 'erection', 'penis', 'vagina',
  'rape', 'molest', 'pedophile', 'incest',
  // English insults
  'idiot', 'moron', 'retard', 'stupid', 'loser', 'freak',
  'psycho', 'maniac', 'dumbass', 'imbecile',
  'kill yourself', 'kys', 'die bitch', 'i will kill',
];

// Regex patterns for evasion (spaces/dashes between letters)
const BLOCKED_REGEX = [
  /f+u+c+k+/i,
  /s+h+i+t+/i,
  /b+i+t+c+h+/i,
  /c+u+n+t+/i,
  /כ[\s\-_]*ו[\s\-_]*ס/,
  /ז[\s\-_]*י[\s\-_]*י[\s\-_]*ן/,
  /ז[\s\-_]*ו[\s\-_]*נ[\s\-_]*ה/,
  /ש[\s\-_]*ר[\s\-_]*מ[\s\-_]*ו[\s\-_]*ט[\s\-_]*ה/,
  /מ[\s\-_]*פ[\s\-_]*ג[\s\-_]*ר/,
  /מ[\s\-_]*ט[\s\-_]*ו[\s\-_]*מ[\s\-_]*ט[\s\-_]*ם/,
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