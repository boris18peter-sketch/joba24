import { base44 } from '@/api/base44Client';

// Local fast-check word list (Hebrew + transliterations)
const BLOCKED_PATTERNS = [
  'סקס', 'זין', 'כוס', 'תחת', 'זיון', 'מזדיין', 'מזדיינת',
  'שרמוטה', 'זונה', 'בן זונה', 'בת זונה', 'לזיין', 'לדפוק',
  'דפוק', 'דפוקה', 'מנוול', 'בסריח', 'חרא', 'כאס אמק',
  'יבן', 'יבני', 'ניאוף', 'porn', 'sex', 'fuck', 'shit',
  'bitch', 'dick', 'pussy', 'ass', 'nude', 'naked',
];

function localCheck(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BLOCKED_PATTERNS.some(w => lower.includes(w.toLowerCase()));
}

export async function moderateText(text) {
  if (!text || text.trim().length < 1) return { flagged: false };

  // 1. Instant local check — no API needed
  if (localCheck(text)) {
    return { flagged: true, reason: 'תוכן לא הולם', source: 'local' };
  }

  // 2. LLM check for complex/implicit violations (only for longer texts)
  if (text.trim().length < 4) return { flagged: false };
  try {
    const res = await base44.functions.invoke('moderateContent', { text });
    return res.data || { flagged: false };
  } catch {
    return { flagged: false }; // fail open on API errors
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