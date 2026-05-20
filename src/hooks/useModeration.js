import { base44 } from '@/api/base44Client';

// Comprehensive Hebrew + Arabic slurs + English profanity list
const BLOCKED_WORDS = [
  // Hebrew sexual/explicit
  'סקס', 'זין', 'כוס', 'תחת', 'זיון', 'מזדיין', 'מזדיינת', 'מזדיינים',
  'לזיין', 'לדפוק', 'דפוק', 'דפוקה', 'דפקתי', 'דפקת', 'דפק', 'זיינתי',
  'זיינת', 'זיין', 'מציץ', 'מציצה', 'ביצים', 'שדיים', 'חזה', 'פין',
  'נרתיק', 'הומו', 'הומואים', 'לסבית', 'לסביות', 'עיסוי אינטימי',
  // Hebrew insults/threats
  'שרמוטה', 'זונה', 'בן זונה', 'בת זונה', 'מנוול', 'חרא', 'חרות',
  'כאס', 'יבן', 'יבני', 'יבנה', 'מחרבן', 'סחבק', 'בוזדיק', 'אחבל',
  'מפגר', 'מפגרת', 'אידיוט', 'טמבל', 'אחמק', 'שוטה', 'בן כלבה',
  'כלבה', 'כלב', 'זבל', 'נבלה', 'גנב', 'רמאי', 'שקרן',
  'ארור', 'מרושע', 'חזיר', 'שחיטה', 'אפס', 'בוגד',
  // Arabic slurs used in Hebrew context
  'יבن אלקחבה', 'אבן זונה', 'קחבה', 'חמאר', 'כלב',
  // English explicit/sexual
  'sex', 'porn', 'fuck', 'fucking', 'fucker', 'shit', 'shitting',
  'bitch', 'dick', 'pussy', 'ass', 'asshole', 'cunt', 'cock',
  'whore', 'slut', 'nude', 'naked', 'blowjob', 'handjob',
  'masturbat', 'orgasm', 'erection', 'penis', 'vagina',
  'rape', 'molest', 'pedophile', 'incest',
  // Threats
  'אהרוג', 'אשחט', 'אמחק', 'תמות', 'למות', 'תסתלק', 'ימח שמו',
  'kill yourself', 'kys', 'die', 'murder', 'threat',
];

// Regex patterns for common bypasses (l33t speak etc.)
const BLOCKED_REGEX = [
  /f+u+c+k+/i,
  /s+h+i+t+/i,
  /b+i+t+c+h+/i,
  /c+u+n+t+/i,
  /d+i+c+k+/i,
  /כ[\s\-_]*ו[\s\-_]*ס/,
  /ז[\s\-_]*י[\s\-_]*י[\s\-_]*ן/,
  /ז[\s\-_]*ו[\s\-_]*נ[\s\-_]*ה/,
  /ש[\s\-_]*ר[\s\-_]*מ[\s\-_]*ו[\s\-_]*ט[\s\-_]*ה/,
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

  // 1. Instant local check — no API needed
  if (localCheck(text)) {
    return { flagged: true, reason: 'תוכן לא הולם', source: 'local' };
  }

  // 2. LLM check for context-based violations (longer texts only)
  if (text.trim().length < 4) return { flagged: false };
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