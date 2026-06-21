/**
 * taskFlowConfig.js — Single source of truth for all task publish/edit/activation flows.
 *
 * Consumed by:
 *   - CreateTask.jsx (form mode + edit mode + repost)
 *   - CategoryExtraFields.jsx (renders extraFields from this config)
 *   - TaskChatInterface.jsx (chat mode)
 *   - taskChatAgent backend function (inlined — backend can't import local files)
 *
 * Merges: categories.js (labels), CategoryExtraFields.CATEGORY_CONFIG (field defs),
 * requirements.js (requirement checklists), CreateTask.CATEGORY_KEYWORDS (keyword detection),
 * taskChatAgent prompt (price ranges + chat question order).
 */

import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { CATEGORY_REQUIREMENTS, DEFAULT_REQUIREMENT_CATEGORIES, getRequirementCategories } from '@/lib/requirements';

// Re-export for backward compatibility — consumers can import from one place
export { CATEGORIES, getCategoryLabel, getRequirementCategories, CATEGORY_REQUIREMENTS, DEFAULT_REQUIREMENT_CATEGORIES };

export const TASK_FLOW_CONFIG = {
  moving: {
    label: '🚛 הובלה',
    keywords: ['הובלה', 'להוביל', 'ארגזים', 'רהיטים', 'מעבר דירה', 'משאית', 'ואן', 'עזרה בהובלה', 'נשיאה', 'לפרק', 'להרכיב', 'להעביר ריהוט'],
    priceRange: { min: 300, max: 800 },
    extraFields: [
      { key: 'to_address', type: 'address', label: 'כתובת יעד — לאן מובילים? *', placeholder: 'עיר, רחוב...' },
      { key: 'from_floor', type: 'number', label: 'קומת מוצא', placeholder: '0 = קרקע' },
      { key: 'to_floor', type: 'number', label: 'קומת יעד', placeholder: '0 = קרקע' },
      { key: 'elevator_from', type: 'toggle', label: 'יש מעלית במוצא' },
      { key: 'elevator_to', type: 'toggle', label: 'יש מעלית ביעד' },
      { key: 'needs_truck', type: 'toggle', label: 'דרושה משאית' },
      { key: 'items', type: 'textarea', label: 'מה מובילים?', placeholder: 'ספה, מקרר, 5 ארגזים...' },
    ],
    suggestedExtras: ['heavy_lifting', 'driver'],
    chatQuestionOrder: ['to_address', 'from_floor', 'elevator_from', 'elevator_to', 'items'],
  },
  delivery: {
    label: '📦 משלוח',
    keywords: ['משלוח', 'לשלוח', 'להביא חבילה', 'שליח', 'חבילה', 'מסירה', 'אספקה', 'הגעה לכתובת', 'הסעת חבילה'],
    priceRange: { min: 80, max: 200 },
    extraFields: [
      { key: 'to_address', type: 'address', label: 'כתובת מסירה *', placeholder: 'לאן מספקים?' },
      { key: 'item_size', type: 'select', label: 'גודל הפריט', options: ['קטן (כמו ארנק)', 'בינוני (כמו תיק)', 'גדול (כמו מזוודה)', 'ענק (רהיט/ציוד)'] },
    ],
    suggestedExtras: ['driver', 'experience'],
    chatQuestionOrder: ['to_address', 'item_size'],
  },
  cleaning: {
    label: '🧹 ניקיון',
    keywords: ['ניקיון', 'לנקות', 'ניקוי', 'שואב אבק', 'מגב', 'חלונות', 'ניקוי עמוק', 'ניקוי בית', 'ניקוי משרד', 'ניקוי דירה', 'מגבון', 'אבק', 'רצפה'],
    priceRange: { min: 150, max: 400 },
    extraFields: [
      { key: 'rooms', type: 'number', label: 'מספר חדרים', placeholder: 'למשל: 3' },
      { key: 'area', type: 'number', label: 'שטח בערך (מ"ר)', placeholder: 'למשל: 80' },
      { key: 'has_materials', type: 'toggle', label: 'יש חומרי ניקוי' },
      { key: 'cleaning_type', type: 'select', label: 'סוג ניקוי', options: ['ניקיון שוטף', 'ניקיון לאחר שיפוץ', 'ניקיון לפני מעבר', 'ניקוי חלונות', 'שטיחים'] },
    ],
    suggestedExtras: ['cleaner_pro', 'two_people'],
    chatQuestionOrder: ['rooms', 'cleaning_type', 'has_materials'],
  },
  babysitting: {
    label: '👶 בייביסיטר',
    keywords: ['ילדים', 'ילד', 'ילדה', 'בייביסיטר', 'שמירה על ילד', 'גן ילדים', 'פעוט', 'תינוק', 'טיפול בילדים', 'לשמור על', 'בבייסיטינג', 'ביביסיטר'],
    priceRange: { min: 50, max: 120 },
    extraFields: [
      { key: 'kids_count', type: 'number', label: 'כמה ילדים?', placeholder: 'למשל: 2' },
      { key: 'kids_ages', type: 'text', label: 'גילאי הילדים', placeholder: 'למשל: 2, 5, 8' },
      { key: 'has_pets', type: 'toggle', label: 'יש חיות מחמד' },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['kids_count', 'kids_ages', 'has_pets'],
  },
  plumbing: {
    label: '🔧 אינסטלציה',
    keywords: ['אינסטלטור', 'צנרת', 'ברז', 'צינור', 'מים', 'כיור', 'שירותים', 'אסלה', 'דוד', 'נזילה', 'ניקוז', 'ביוב', 'אינסטלציה', 'צינורות', 'קולנית'],
    priceRange: { min: 200, max: 600 },
    extraFields: [
      { key: 'issue_type', type: 'select', label: 'סוג הבעיה', options: ['נזילה', 'סתימה', 'התקנת ברז/מכשיר', 'הרחבת צנרת', 'בדיקה', 'אחר'] },
      { key: 'urgency', type: 'select', label: 'דחיפות', options: ['מיידי (נזילה פעילה)', 'היום', 'תוך יום-יומיים', 'גמיש'] },
    ],
    suggestedExtras: ['plumber', 'certified'],
    chatQuestionOrder: ['issue_type', 'urgency'],
  },
  electricity: {
    label: '⚡ חשמלאות',
    keywords: ['חשמל', 'חשמלאי', 'שקע', 'מתג', 'לוח חשמל', 'נורה', 'חיווט', 'מפסק', 'תקע', 'חוט חשמל', 'התקנת שקע', 'לוח ראשי', 'מפל מתח'],
    priceRange: { min: 200, max: 500 },
    extraFields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['תיקון תקלה', 'התקנת שקע/מפסק', 'לוח חשמל', 'חיווט', 'בדיקה', 'אחר'] },
      { key: 'urgency', type: 'select', label: 'דחיפות', options: ['מיידי', 'היום', 'גמיש'] },
    ],
    suggestedExtras: ['electrician', 'certified'],
    chatQuestionOrder: ['issue_type', 'urgency'],
  },
  ac: {
    label: '❄️ מזגנים',
    keywords: ['מזגן', 'מיזוג', 'התקנת מזגן', 'תיקון מזגן', 'ניקוי מזגן', 'טכנאי מזגנים', 'קולר', 'מאוורר', 'מזגן מפוצל'],
    priceRange: { min: 300, max: 700 },
    extraFields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['התקנה', 'תיקון', 'ניקוי', 'פירוק', 'אחר'] },
      { key: 'units', type: 'number', label: 'כמה יחידות?', placeholder: '1' },
    ],
    suggestedExtras: ['certified', 'ladder'],
    chatQuestionOrder: ['issue_type', 'units'],
  },
  carpentry: {
    label: '🪵 נגרות',
    keywords: ['נגרות', 'נגר', 'ארון', 'מדף', 'ריהוט עץ', 'הרכבת ריהוט', 'תיקון ריהוט', 'דלת עץ', 'מטבח', 'ארונות', 'חיבור עץ'],
    priceRange: { min: 200, max: 600 },
    extraFields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['הרכבת רהיטים', 'תיקון', 'ייצור', 'פירוק', 'אחר'] },
    ],
    suggestedExtras: ['carpenter', 'drill'],
    chatQuestionOrder: ['issue_type'],
  },
  painting: {
    label: '🎨 צביעה',
    keywords: ['צביעה', 'לצבוע', 'צבע קיר', 'קירות', 'רולר', 'מברשת צבע', 'גג', 'גדר', 'סיוד', 'צבעי', 'ניקוז צבע'],
    priceRange: { min: 300, max: 1000 },
    extraFields: [
      { key: 'rooms', type: 'number', label: 'כמה חדרים/קירות?', placeholder: 'למשל: 2' },
      { key: 'area', type: 'number', label: 'שטח משוער (מ"ר)', placeholder: 'למשל: 50' },
      { key: 'has_paint', type: 'toggle', label: 'יש צבע' },
    ],
    suggestedExtras: ['painter_pro', 'ladder'],
    chatQuestionOrder: ['rooms', 'area', 'has_paint'],
  },
  locksmith: {
    label: '🔐 מנעולן',
    keywords: ['מנעול', 'מנעולן', 'פריצת מנעול', 'מפתח', 'כספת', 'החלפת מנעול', 'נעילה', 'פריצה', 'ידית דלת'],
    priceRange: { min: 200, max: 500 },
    extraFields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['פריצה / נעילה בחוץ', 'החלפת מנעול', 'התקנת מנעול', 'כספת', 'שכפול מפתח', 'אחר'] },
    ],
    suggestedExtras: ['certified', 'experience'],
    chatQuestionOrder: ['issue_type'],
  },
  shopping: {
    label: '🛒 קניות',
    keywords: ['קניות', 'לקנות', 'סופרמרקט', 'מוצרים', 'רשימת קניות', 'שליח קניות', 'רכישה', 'מכולת', 'קנייה'],
    priceRange: { min: 60, max: 150 },
    extraFields: [
      { key: 'store', type: 'text', label: 'איפה לקנות?', placeholder: 'שם חנות / מיקום' },
      { key: 'items', type: 'textarea', label: 'רשימת קניות', placeholder: 'חלב, לחם, עגבניות...' },
    ],
    suggestedExtras: ['vehicle', 'heavy_lifting'],
    chatQuestionOrder: ['store', 'items'],
  },
  tutoring: {
    label: '📚 שיעורים פרטיים',
    keywords: ['שיעורים פרטיים', 'שיעור פרטי', 'מורה פרטי', 'לימוד', 'חונך', 'מתמטיקה', 'פיזיקה', 'כימיה', 'תגבור', 'הכנה לבגרות', 'עזרה בשיעורים'],
    priceRange: { min: 80, max: 150 },
    extraFields: [
      { key: 'subject', type: 'text', label: 'איזה מקצוע?', placeholder: 'למשל: מתמטיקה, אנגלית...' },
      { key: 'grade_level', type: 'select', label: 'כיתה/רמה', options: ['יסודי', 'חטיבת ביניים', 'תיכון', 'בגרויות', 'אקדמיה', 'אחר'] },
      { key: 'session_duration', type: 'select', label: 'משך שיעור', options: ['45 דקות', 'שעה', 'שעה וחצי', '2 שעות'] },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['subject', 'grade_level', 'session_duration'],
  },
  it_support: {
    label: '💻 מחשבים',
    keywords: ['מחשב', 'רשת', 'תמיכה טכנית', 'תוכנה', 'חומרה', 'אינטרנט', 'ווייפיי', 'wifi', 'התקנת תוכנה', 'וירוס', 'טלפון תקוע', 'אפליקציה'],
    priceRange: { min: 150, max: 400 },
    extraFields: [
      { key: 'issue_type', type: 'select', label: 'סוג הבעיה', options: ['מחשב איטי/תקוע', 'וירוס/תוכנה זדונית', 'בעיית רשת/אינטרנט', 'התקנת תוכנה', 'גיבוי/שחזור נתונים', 'אחר'] },
      { key: 'device_type', type: 'select', label: 'סוג מכשיר', options: ['מחשב נייח', 'לפטופ', 'טאבלט', 'סמארטפון', 'מספר מכשירים'] },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['issue_type', 'device_type'],
  },
  gardening: {
    label: '🌿 גינון',
    keywords: ['גינה', 'גינון', 'צמחים', 'עשב', 'גזם', 'גיזום', 'שיח', 'עשבייה', 'השקיה', 'דשא', 'זבל גינה', 'ערוגה', 'עץ', 'עצים', 'גינת'],
    priceRange: { min: 200, max: 500 },
    extraFields: [
      { key: 'garden_type', type: 'select', label: 'סוג גינה', options: ['גינה פרטית', 'גינת בניין', 'מרפסת', 'שטח ציבורי'] },
      { key: 'work_type', type: 'select', label: 'סוג עבודה', options: ['גיזום עצים/שיחים', 'כיסוח דשא', 'עישוב', 'השקיה/טפטוף', 'ניקוי/פינוי פסולת', 'תכנון/הקמת גינה'] },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['garden_type', 'work_type'],
  },
  other: {
    label: '📋 אחר',
    keywords: [],
    priceRange: { min: 100, max: 500 },
    extraFields: [],
    suggestedExtras: [],
    chatQuestionOrder: [],
  },
};

// ── Helper functions ──

export const getCategoryConfig = (category) => TASK_FLOW_CONFIG[category] || TASK_FLOW_CONFIG.other;

export const getCategoryExtraFields = (category) => getCategoryConfig(category).extraFields || [];

export const getCategoryKeywords = (category) => getCategoryConfig(category).keywords || [];

export const getCategoryPriceRange = (category) => getCategoryConfig(category).priceRange || { min: 100, max: 500 };

export const getSuggestedExtras = (category) => getCategoryConfig(category).suggestedExtras || [];

export const getChatQuestionOrder = (category) => getCategoryConfig(category).chatQuestionOrder || [];

// All keywords as a flat map for category auto-detection
export const ALL_CATEGORY_KEYWORDS = Object.fromEntries(
  Object.entries(TASK_FLOW_CONFIG).map(([cat, cfg]) => [cat, cfg.keywords || []])
);

// Auto-detect category from text — returns best matching category or null
export const autoDetectCategory = (text) => {
  if (!text || text.trim().length < 5) return null;
  const combined = text.toLowerCase();
  let bestCategory = null;
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(ALL_CATEGORY_KEYWORDS)) {
    if (cat === 'other') continue;
    const score = keywords.filter(kw => combined.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  return bestScore >= 1 ? bestCategory : null;
};

// Check if text matches a given category's keywords
export const matchesCategory = (category, text) => {
  const keywords = getCategoryKeywords(category);
  if (!keywords.length) return true; // 'other' always matches
  const combined = text.toLowerCase();
  return keywords.some(kw => combined.includes(kw.toLowerCase()));
};

// Format category_details object into human-readable text (for description fallback)
export const formatCategoryDetails = (details, category) => {
  if (!details || typeof details !== 'object') return '';
  const fields = getCategoryExtraFields(category);
  if (!fields.length) return '';
  const config = getCategoryConfig(category);
  const lines = [];
  lines.push(`--- ${config.label} ---`);
  fields.forEach(f => {
    const v = details[f.key];
    if (v === undefined || v === '' || v === null) return;
    if (f.type === 'toggle') {
      if (v) lines.push(`✓ ${f.label}`);
    } else {
      lines.push(`${f.label}: ${v}`);
    }
  });
  return lines.join('\n');
};