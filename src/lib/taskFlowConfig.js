/**
 * taskFlowConfig.js — Single source of truth for all task publish/edit/activation flows.
 */

import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { CATEGORY_REQUIREMENTS, DEFAULT_REQUIREMENT_CATEGORIES, getRequirementCategories } from '@/lib/requirements';

export { CATEGORIES, getCategoryLabel, getRequirementCategories, CATEGORY_REQUIREMENTS, DEFAULT_REQUIREMENT_CATEGORIES };

export const TASK_FLOW_CONFIG = {

  // ── 🔧 אינסטלציה ──────────────────────────────────────────────────────────
  plumbing: {
    label: '🔧 אינסטלציה',
    keywords: ['אינסטלטור', 'צנרת', 'ברז', 'צינור', 'מים', 'כיור', 'שירותים', 'אסלה', 'דוד', 'נזילה', 'ניקוז', 'ביוב', 'אינסטלציה', 'צינורות', 'קולנית', 'סתימה', 'בוילר'],
    priceRange: { min: 200, max: 600 },
    extraFields: [
      {
        key: 'issue_type',
        type: 'select',
        label: 'מה הבעיה? 🔧',
        options: [
          'נזילה ממקום מסוים',
          'סתימה בכיור / אמבטיה / שירותים',
          'החלפת ברז',
          'אסלה שלא נסגרת / זורמת',
          'דוד שמש / בוילר',
          'התקנת מכשיר חדש (מדיח, מכונת כביסה...)',
          'בדיקה כללית',
          'אחר',
        ],
      },
      {
        key: 'urgency',
        type: 'select',
        label: 'כמה דחוף? ⏰',
        options: [
          '🔴 מיידי — מים זורמים עכשיו',
          '🟡 היום',
          '🟢 תוך יום-יומיים',
          '⚪ לא דחוף',
        ],
      },
      {
        key: 'location_in_home',
        type: 'select',
        label: 'איפה בבית?',
        options: ['מטבח', 'חדר אמבטיה', 'שירותים', 'מרפסת', 'מחוץ לבית', 'אחר'],
      },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: צינור תחת הכיור, רטיבות בקיר...' },
    ],
    suggestedExtras: ['plumber', 'certified'],
    chatQuestionOrder: ['issue_type', 'urgency', 'location_in_home'],
  },

  // ── ⚡ חשמלאות ──────────────────────────────────────────────────────────────
  electricity: {
    label: '⚡ חשמלאות',
    keywords: ['חשמל', 'חשמלאי', 'שקע', 'מתג', 'לוח חשמל', 'נורה', 'חיווט', 'מפסק', 'תקע', 'חוט חשמל', 'התקנת שקע', 'לוח ראשי', 'מפל מתח'],
    priceRange: { min: 200, max: 500 },
    extraFields: [
      {
        key: 'issue_type',
        type: 'select',
        label: 'מה צריך? ⚡',
        options: [
          'שקע / מפסק לא עובד',
          'נפח חשמל (מפסק קפץ)',
          'התקנת שקע חדש',
          'החלפת נורה / גוף תאורה',
          'בדיקת לוח חשמל',
          'חיווט לחדר / מקום חדש',
          'התקנת מאוורר תקרה',
          'אחר',
        ],
      },
      {
        key: 'urgency',
        type: 'select',
        label: 'כמה דחוף?',
        options: [
          '🔴 אין חשמל עכשיו — מיידי',
          '🟡 היום',
          '🟢 תוך יומיים',
          '⚪ לא דחוף',
        ],
      },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: שקע ליד מקרר, חדר ילדים...' },
    ],
    suggestedExtras: ['electrician', 'certified'],
    chatQuestionOrder: ['issue_type', 'urgency'],
  },

  // ── 🌿 גינון ────────────────────────────────────────────────────────────────
  gardening: {
    label: '🌿 גינון',
    keywords: ['גינה', 'גינון', 'צמחים', 'עשב', 'גזם', 'גיזום', 'שיח', 'עשבייה', 'השקיה', 'דשא', 'זבל גינה', 'ערוגה', 'עץ', 'עצים', 'גינת'],
    priceRange: { min: 200, max: 500 },
    extraFields: [
      {
        key: 'work_type',
        type: 'select',
        label: 'מה צריך לעשות? 🌿',
        options: [
          'כיסוח דשא',
          'גיזום עצים / שיחים',
          'עישוב (ניכוש עשבים)',
          'ניקוי וסידור הגינה',
          'פינוי ענפים / גזם',
          'שתילה',
          'תכנון והקמת גינה חדשה',
          'אחר',
        ],
      },
      {
        key: 'garden_size',
        type: 'select',
        label: 'גודל הגינה',
        options: [
          'קטנה — עד 20 מ"ר',
          'בינונית — 20–60 מ"ר',
          'גדולה — 60–150 מ"ר',
          'גדולה מאוד — מעל 150 מ"ר',
        ],
      },
      {
        key: 'garden_type',
        type: 'select',
        label: 'איזה סוג גינה?',
        options: ['גינה פרטית בבית', 'גינת בניין משותף', 'מרפסת / גג', 'שטח ציבורי / עסקי'],
      },
      { key: 'has_tools', type: 'toggle', label: 'יש ציוד (מקצרה, מסור...)' },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['work_type', 'garden_size', 'garden_type'],
  },

  // ── 🧹 ניקיון ───────────────────────────────────────────────────────────────
  cleaning: {
    label: '🧹 ניקיון',
    keywords: ['ניקיון', 'לנקות', 'ניקוי', 'שואב אבק', 'מגב', 'חלונות', 'ניקוי עמוק', 'ניקוי בית', 'ניקוי משרד', 'ניקוי דירה', 'מגבון', 'אבק', 'רצפה'],
    priceRange: { min: 150, max: 400 },
    extraFields: [
      {
        key: 'cleaning_type',
        type: 'select',
        label: 'איזה סוג ניקיון? 🧹',
        options: [
          'ניקיון שוטף (שבועי / דו-שבועי)',
          'ניקיון עומק (אחת לחודש)',
          'ניקיון לפני / אחרי מעבר דירה',
          'ניקיון לאחר שיפוץ',
          'ניקוי חלונות',
          'ניקוי שטיחים / ריפוד',
          'ניקוי משרד / עסק',
        ],
      },
      {
        key: 'property_type',
        type: 'select',
        label: 'מה מנקים?',
        options: ['דירה', 'בית פרטי', 'משרד', 'מחסן / חדר'],
      },
      { key: 'rooms', type: 'number', label: 'כמה חדרים? (לא כולל מטבח ושירותים)', placeholder: 'למשל: 3' },
      { key: 'has_materials', type: 'toggle', label: 'יש חומרי ניקוי בבית' },
      { key: 'has_equipment', type: 'toggle', label: 'יש ציוד (שואב אבק, מגב...)' },
    ],
    suggestedExtras: ['cleaner_pro', 'two_people'],
    chatQuestionOrder: ['cleaning_type', 'property_type', 'rooms'],
  },

  // ── 🚛 הובלה ────────────────────────────────────────────────────────────────
  moving: {
    label: '🚛 הובלה',
    keywords: ['הובלה', 'להוביל', 'ארגזים', 'רהיטים', 'מעבר דירה', 'משאית', 'ואן', 'עזרה בהובלה', 'נשיאה', 'לפרק', 'להרכיב', 'להעביר ריהוט'],
    priceRange: { min: 300, max: 1200 },
    extraFields: [
      { key: 'to_address', type: 'address', label: 'כתובת יעד — לאן מובילים? *', placeholder: 'עיר, רחוב...' },
      {
        key: 'move_type',
        type: 'select',
        label: 'מה מובילים?',
        options: [
          'מעבר דירה מלא',
          'כמה פריטים / ארגזים',
          'רהיט בודד (ספה, מיטה, ארון...)',
          'ציוד / מכשיר גדול',
          'אחר',
        ],
      },
      { key: 'from_floor', type: 'number', label: 'קומה במוצא', placeholder: '0 = קרקע' },
      { key: 'to_floor', type: 'number', label: 'קומה ביעד', placeholder: '0 = קרקע' },
      { key: 'elevator_from', type: 'toggle', label: 'יש מעלית במוצא' },
      { key: 'elevator_to', type: 'toggle', label: 'יש מעלית ביעד' },
      { key: 'needs_truck', type: 'toggle', label: 'צריך משאית (לא רק ואן)' },
      { key: 'needs_packing', type: 'toggle', label: 'צריך עזרה באריזה' },
      { key: 'items', type: 'textarea', label: 'תיאור הפריטים (לא חובה)', placeholder: 'למשל: ספה גדולה, 3 ארגזים, מקרר...' },
    ],
    suggestedExtras: ['heavy_lifting', 'driver', 'two_people'],
    chatQuestionOrder: ['to_address', 'move_type', 'from_floor', 'elevator_from', 'elevator_to'],
  },

  // ── 🎨 צביעה ────────────────────────────────────────────────────────────────
  painting: {
    label: '🎨 צביעה',
    keywords: ['צביעה', 'לצבוע', 'צבע קיר', 'קירות', 'רולר', 'מברשת צבע', 'גג', 'גדר', 'סיוד', 'צבעי', 'ניקוז צבע'],
    priceRange: { min: 300, max: 1500 },
    extraFields: [
      {
        key: 'paint_type',
        type: 'select',
        label: 'מה צריך לצבוע?',
        options: [
          'קירות פנים (חדר / דירה)',
          'תקרה',
          'קירות חוץ',
          'גדר / קיר חיצוני',
          'דלת / ריהוט עץ',
          'מדרגות',
          'אחר',
        ],
      },
      {
        key: 'rooms',
        type: 'number',
        label: 'כמה חדרים / קירות?',
        placeholder: 'למשל: 2 חדרים',
      },
      {
        key: 'area',
        type: 'number',
        label: 'שטח משוער (מ"ר)',
        placeholder: 'למשל: 50',
      },
      { key: 'has_paint', type: 'toggle', label: 'יש צבע (לא צריך להביא)' },
      { key: 'needs_prep', type: 'toggle', label: 'צריך הכנה — טיח / גבס / סתימת סדקים' },
      {
        key: 'condition',
        type: 'select',
        label: 'מצב הקירות',
        options: ['חדש — רק צבע', 'תקין — צריך שכבה', 'דורש תיקון קל', 'דורש שיפוץ מקדים'],
      },
    ],
    suggestedExtras: ['painter_pro', 'ladder', 'two_people'],
    chatQuestionOrder: ['paint_type', 'rooms', 'area', 'has_paint'],
  },

  // ── 🪵 נגרות ────────────────────────────────────────────────────────────────
  carpentry: {
    label: '🪵 נגרות',
    keywords: ['נגרות', 'נגר', 'ארון', 'מדף', 'ריהוט עץ', 'הרכבת ריהוט', 'תיקון ריהוט', 'דלת עץ', 'מטבח', 'ארונות', 'חיבור עץ', 'איקאה', 'IKEA'],
    priceRange: { min: 150, max: 800 },
    extraFields: [
      {
        key: 'work_type',
        type: 'select',
        label: 'מה צריך? 🪵',
        options: [
          'הרכבת רהיט מקופסה (IKEA וכד\')',
          'תיקון / חיזוק רהיט שבור',
          'בניית מדף / ארון מותאם',
          'החלפת דלת / תיקון דלת',
          'עבודת עץ מותאמת אישית',
          'פירוק רהיטים',
          'אחר',
        ],
      },
      {
        key: 'item_count',
        type: 'select',
        label: 'כמה פריטים?',
        options: ['פריט אחד', '2–3 פריטים', '4–6 פריטים', 'יותר מ-6'],
      },
      { key: 'has_tools', type: 'toggle', label: 'יש כלים (מקדחה, פטיש...)' },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: שידה + ספריה, מדריך יש...' },
    ],
    suggestedExtras: ['carpenter', 'drill', 'experience'],
    chatQuestionOrder: ['work_type', 'item_count'],
  },

  // ── ❄️ מזגנים ──────────────────────────────────────────────────────────────
  ac: {
    label: '❄️ מזגנים',
    keywords: ['מזגן', 'מיזוג', 'התקנת מזגן', 'תיקון מזגן', 'ניקוי מזגן', 'טכנאי מזגנים', 'קולר', 'מאוורר', 'מזגן מפוצל'],
    priceRange: { min: 250, max: 900 },
    extraFields: [
      {
        key: 'work_type',
        type: 'select',
        label: 'מה צריך? ❄️',
        options: [
          'התקנת מזגן חדש',
          'פירוק מזגן',
          'ניקוי / שירות שנתי',
          'מזגן לא מקרר / לא מחמם',
          'מזגן מטפטף',
          'מזגן לא נדלק',
          'אחר',
        ],
      },
      { key: 'units', type: 'number', label: 'כמה יחידות?', placeholder: 'למשל: 2' },
      {
        key: 'ac_type',
        type: 'select',
        label: 'סוג מזגן',
        options: ['מפוצל (split)', 'נייד', 'מיני מרכזי', 'לא יודע'],
      },
      {
        key: 'urgency',
        type: 'select',
        label: 'דחיפות',
        options: ['🔴 מיידי', '🟡 היום', '🟢 תוך יומיים', '⚪ גמיש'],
      },
    ],
    suggestedExtras: ['certified', 'ladder'],
    chatQuestionOrder: ['work_type', 'units', 'urgency'],
  },

  // ── 🔐 מנעולן ──────────────────────────────────────────────────────────────
  locksmith: {
    label: '🔐 מנעולן',
    keywords: ['מנעול', 'מנעולן', 'פריצת מנעול', 'מפתח', 'כספת', 'החלפת מנעול', 'נעילה', 'פריצה', 'ידית דלת'],
    priceRange: { min: 200, max: 600 },
    extraFields: [
      {
        key: 'issue_type',
        type: 'select',
        label: 'מה הבעיה? 🔐',
        options: [
          '🚨 ננעלתי בחוץ — פריצת מנעול',
          'החלפת מנעול',
          'התקנת מנעול חדש / חיזוק',
          'שכפול מפתח',
          'תיקון / ידית דלת',
          'כספת — פתיחה / התקנה',
          'אחר',
        ],
      },
      {
        key: 'door_type',
        type: 'select',
        label: 'סוג הדלת',
        options: ['דלת דירה', 'דלת בית פרטי', 'דלת מחסן / חניה', 'דלת משרד', 'מכונית', 'אחר'],
      },
      {
        key: 'urgency',
        type: 'select',
        label: 'דחיפות',
        options: ['🔴 מיידי — ננעלתי עכשיו', '🟡 היום', '🟢 תוך יום-יומיים', '⚪ לא דחוף'],
      },
    ],
    suggestedExtras: ['certified', 'experience'],
    chatQuestionOrder: ['issue_type', 'urgency', 'door_type'],
  },

  // ── 🛒 קניות ────────────────────────────────────────────────────────────────
  shopping: {
    label: '🛒 קניות',
    keywords: ['קניות', 'לקנות', 'סופרמרקט', 'מוצרים', 'רשימת קניות', 'שליח קניות', 'רכישה', 'מכולת', 'קנייה', 'פארם', 'תרופות'],
    priceRange: { min: 50, max: 150 },
    extraFields: [
      {
        key: 'shopping_type',
        type: 'select',
        label: 'מה קונים? 🛒',
        options: [
          'קניות מזון (סופר / מכולת)',
          'תרופות / בית מרקחת',
          'ציוד / חנות ספציפית',
          'קניות כלליות — יספק הקונה',
        ],
      },
      { key: 'store', type: 'text', label: 'שם החנות / מיקום', placeholder: 'למשל: סופר רמי לוי, רחוב הרצל...' },
      { key: 'budget', type: 'number', label: 'תקציב הקנייה (₪) משוער', placeholder: 'למשל: 200' },
      { key: 'items', type: 'textarea', label: 'רשימת קניות', placeholder: 'חלב, לחם, עגבניות, ביצים...' },
      { key: 'needs_receipt', type: 'toggle', label: 'צריך להביא קבלה' },
    ],
    suggestedExtras: ['vehicle', 'driver'],
    chatQuestionOrder: ['shopping_type', 'store', 'items'],
  },

  // ── 📦 משלוח ────────────────────────────────────────────────────────────────
  delivery: {
    label: '📦 משלוח',
    keywords: ['משלוח', 'לשלוח', 'להביא חבילה', 'שליח', 'חבילה', 'מסירה', 'אספקה', 'הגעה לכתובת', 'הסעת חבילה', 'להעביר מסמך'],
    priceRange: { min: 60, max: 250 },
    extraFields: [
      { key: 'to_address', type: 'address', label: 'כתובת מסירה — לאן? *', placeholder: 'עיר, רחוב, מספר...' },
      {
        key: 'item_type',
        type: 'select',
        label: 'מה מוסרים?',
        options: [
          'מסמכים / מעטפה',
          'חבילה קטנה (כמו נעליים)',
          'חבילה בינונית (כמו מזוודה)',
          'חבילה גדולה / כבדה',
          'אוכל / מזון',
          'אחר',
        ],
      },
      {
        key: 'time_window',
        type: 'select',
        label: 'מתי צריך להגיע?',
        options: ['🔴 מיידי — תוך שעה', 'היום עד שעה מסוימת', 'היום — גמיש', 'מחר', 'גמיש לחלוטין'],
      },
      { key: 'recipient_name', type: 'text', label: 'שם המקבל (לא חובה)', placeholder: 'למשל: דוד כהן' },
      { key: 'fragile', type: 'toggle', label: 'שביר — יש לטפל בזהירות' },
    ],
    suggestedExtras: ['driver', 'vehicle'],
    chatQuestionOrder: ['to_address', 'item_type', 'time_window'],
  },

  // ── 👶 בייביסיטר ────────────────────────────────────────────────────────────
  babysitting: {
    label: '👶 בייביסיטר',
    keywords: ['ילדים', 'ילד', 'ילדה', 'בייביסיטר', 'שמירה על ילד', 'גן ילדים', 'פעוט', 'תינוק', 'טיפול בילדים', 'לשמור על', 'בבייסיטינג', 'ביביסיטר'],
    priceRange: { min: 40, max: 120 },
    extraFields: [
      { key: 'kids_count', type: 'number', label: 'כמה ילדים?', placeholder: 'למשל: 2' },
      { key: 'kids_ages', type: 'text', label: 'גילאי הילדים', placeholder: 'למשל: 1.5 שנים, 4, 7' },
      {
        key: 'duration',
        type: 'select',
        label: 'כמה זמן?',
        options: ['עד שעתיים', '2–4 שעות', 'חצי יום', 'יום מלא', 'לילה', 'כמה ימים'],
      },
      {
        key: 'location',
        type: 'select',
        label: 'איפה?',
        options: ['בבית שלנו', 'בבית הבייביסיטר', 'גמיש'],
      },
      { key: 'special_needs', type: 'text', label: 'צרכים מיוחדים (לא חובה)', placeholder: 'למשל: אלרגיה לבוטנים, ילד עם אוטיזם...' },
      { key: 'has_pets', type: 'toggle', label: 'יש חיות מחמד בבית' },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['kids_count', 'kids_ages', 'duration', 'location'],
  },

  // ── 📚 שיעורים פרטיים ──────────────────────────────────────────────────────
  tutoring: {
    label: '📚 שיעורים פרטיים',
    keywords: ['שיעורים פרטיים', 'שיעור פרטי', 'מורה פרטי', 'לימוד', 'חונך', 'מתמטיקה', 'פיזיקה', 'כימיה', 'תגבור', 'הכנה לבגרות', 'עזרה בשיעורים', 'אנגלית'],
    priceRange: { min: 80, max: 180 },
    extraFields: [
      { key: 'subject', type: 'text', label: 'איזה מקצוע? 📚', placeholder: 'למשל: מתמטיקה, אנגלית, פיזיקה...' },
      {
        key: 'grade_level',
        type: 'select',
        label: 'כיתה / רמה',
        options: ['כיתה א-ו (יסודי)', 'כיתה ז-ט (חטיבה)', 'כיתה י-יב (תיכון)', 'הכנה לבגרות', 'אקדמיה / אוניברסיטה', 'מבוגר'],
      },
      {
        key: 'frequency',
        type: 'select',
        label: 'כמה פעמים בשבוע?',
        options: ['פעם אחת', 'פעמיים', '3 פעמים', 'לא קבוע — לפי הצורך'],
      },
      {
        key: 'session_duration',
        type: 'select',
        label: 'משך כל שיעור',
        options: ['45 דקות', 'שעה', 'שעה וחצי'],
      },
      {
        key: 'format',
        type: 'select',
        label: 'פרונטלי או אונליין?',
        options: ['פרונטלי — בבית', 'פרונטלי — אצל המורה', 'זום / אונליין', 'גמיש'],
      },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['subject', 'grade_level', 'frequency', 'format'],
  },

  // ── 💻 מחשבים ──────────────────────────────────────────────────────────────
  it_support: {
    label: '💻 מחשבים',
    keywords: ['מחשב', 'רשת', 'תמיכה טכנית', 'תוכנה', 'חומרה', 'אינטרנט', 'ווייפיי', 'wifi', 'התקנת תוכנה', 'וירוס', 'טלפון תקוע', 'אפליקציה', 'לפטופ', 'האטה'],
    priceRange: { min: 150, max: 400 },
    extraFields: [
      {
        key: 'issue_type',
        type: 'select',
        label: 'מה הבעיה? 💻',
        options: [
          'מחשב איטי מאוד',
          'מחשב לא נדלק',
          'וירוס / תוכנה זדונית',
          'בעיית אינטרנט / WiFi',
          'התקנת תוכנה / Windows',
          'גיבוי נתונים / שחזור',
          'בעיית מסך / מקלדת / עכבר',
          'הגדרת אימייל / חשבון',
          'אחר',
        ],
      },
      {
        key: 'device_type',
        type: 'select',
        label: 'סוג מכשיר',
        options: ['מחשב נייח', 'לפטופ (נייד)', 'טאבלט', 'סמארטפון', 'ראוטר / רשת', 'כמה מכשירים'],
      },
      {
        key: 'visit_type',
        type: 'select',
        label: 'איך מועדף?',
        options: ['ביקור בית / עסק', 'מרחוק (remote)', 'גמיש'],
      },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['issue_type', 'device_type', 'visit_type'],
  },

  // ── 🔨 הנדימן / תיקונים ────────────────────────────────────────────────────
  handyman: {
    label: '🔨 הנדימן / תיקונים',
    keywords: ['תליית טלוויזיה', 'תליית מדף', 'מדף', 'לתלות', 'וילון', 'ידית', 'תיקון קטן', 'הנדימן', 'הרכבה', 'בורג', 'מסמר', 'תיקון', 'תלייה', 'קיר', 'גבס'],
    priceRange: { min: 100, max: 400 },
    extraFields: [
      {
        key: 'work_type',
        type: 'select',
        label: 'מה צריך לעשות? 🔨',
        options: [
          'תליית טלוויזיה על קיר',
          'תליית מדף / תמונה',
          'התקנת וילון / בלינד',
          'החלפת ידית / מנגנון',
          'תיקון ריהוט שבור',
          'הרכבת ריהוט מקופסה',
          'איטום / גבס קטן',
          'כמה עבודות קטנות',
          'אחר',
        ],
      },
      {
        key: 'items_count',
        type: 'select',
        label: 'כמה פריטים / עבודות?',
        options: ['עבודה אחת', '2–3 עבודות', '4 ומעלה'],
      },
      { key: 'has_tools', type: 'toggle', label: 'יש כלים בבית (מקדחה, פטיש...)' },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: טלוויזיה 65 אינץ\', קיר בטון...' },
    ],
    suggestedExtras: ['experience', 'drill'],
    chatQuestionOrder: ['work_type', 'items_count', 'has_tools'],
  },

  // ── 💪 עזרה פיזית ───────────────────────────────────────────────────────────
  heavy_lifting: {
    label: '💪 עזרה פיזית',
    keywords: ['להעלות', 'להוריד', 'לסחוב', 'לשאת', 'מקרר', 'ספה', 'ארגזים', 'עזרה פיזית', 'ידיים', 'זוג ידיים', 'עזרה במעבר', 'פריקה', 'טעינה', 'להזיז', 'פריקת משאית'],
    priceRange: { min: 80, max: 300 },
    extraFields: [
      {
        key: 'task_type',
        type: 'select',
        label: 'מה צריך? 💪',
        options: [
          'להעלות / להוריד פריט כבד',
          'לסחוב ארגזים / קרטונים',
          'פריקת משאית / ואן',
          'עזרה בהזזת ריהוט בתוך הבית',
          'עזרה במעבר דירה (ללא נהג)',
          'אחר',
        ],
      },
      {
        key: 'item_description',
        type: 'text',
        label: 'מה מזיזים?',
        placeholder: 'למשל: מקרר אמריקאי, 10 ארגזים...',
      },
      {
        key: 'floor',
        type: 'select',
        label: 'קומה (אם רלוונטי)',
        options: ['קרקע', 'קומה 1', 'קומה 2', 'קומה 3+', 'יש מעלית'],
      },
      {
        key: 'helpers_needed',
        type: 'select',
        label: 'כמה עוזרים צריך?',
        options: ['אחד מספיק', 'שניים', 'שלושה ומעלה'],
      },
    ],
    suggestedExtras: ['two_people', 'heavy_lifting'],
    chatQuestionOrder: ['task_type', 'item_description', 'floor', 'helpers_needed'],
  },

  // ── 🏠 תחזוקת בית ──────────────────────────────────────────────────────────
  home_maintenance: {
    label: '🏠 תחזוקת בית',
    keywords: ['ניקוי מרזבים', 'ניקוי מחסן', 'סידור מחסן', 'ארגון בית', 'תחזוקה', 'פינוי', 'סידור', 'ארגון', 'גג', 'מרזב', 'פסולת', 'פינוי ציוד'],
    priceRange: { min: 100, max: 500 },
    extraFields: [
      {
        key: 'work_type',
        type: 'select',
        label: 'מה צריך? 🏠',
        options: [
          'ניקוי / פינוי מחסן',
          'סידור וארגון מחסן',
          'ניקוי מרזבים / גג',
          'פינוי פסולת / ריהוט ישן',
          'ניקוי מרפסת / חצר',
          'ארגון בית כללי',
          'אחר',
        ],
      },
      {
        key: 'size',
        type: 'select',
        label: 'גודל השטח',
        options: ['קטן — עד שעה', 'בינוני — 2–3 שעות', 'גדול — חצי יום', 'גדול מאוד — יום שלם'],
      },
      { key: 'needs_disposal', type: 'toggle', label: 'צריך לפנות / להשליך ציוד' },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: מחסן מלא ריהוט ישן, צריך לסדר לפני...' },
    ],
    suggestedExtras: ['two_people', 'vehicle'],
    chatQuestionOrder: ['work_type', 'size', 'needs_disposal'],
  },

  // ── 🚗 הסעות וטרמפים ────────────────────────────────────────────────────────
  transportation: {
    label: '🚗 הסעות וטרמפים',
    keywords: ['הסעה', 'טרמפ', 'נסיעה', 'לשדה תעופה', 'נהג', 'נהג פרטי', 'הסעת ילדים', 'לקחת', 'להסיע', 'מונית', 'לנמל תעופה', 'אירוע', 'לקחת מ', 'נסיעה ל'],
    priceRange: { min: 50, max: 300 },
    extraFields: [
      {
        key: 'ride_type',
        type: 'select',
        label: 'איזה סוג נסיעה? 🚗',
        options: [
          'נסיעה לשדה התעופה / ממנו',
          'הסעה לאירוע',
          'הסעת ילדים (גן / בית ספר / חוגים)',
          'טרמפ לעבודה / עיר אחרת',
          'נהג פרטי לכמה שעות',
          'נסיעה לבית חולים / קופת חולים',
          'אחר',
        ],
      },
      { key: 'to_address', type: 'address', label: 'לאן נוסעים? *', placeholder: 'כתובת יעד...' },
      {
        key: 'passengers',
        type: 'select',
        label: 'כמה נוסעים?',
        options: ['1', '2', '3', '4', '5+'],
      },
      {
        key: 'pickup_time',
        type: 'text',
        label: 'מתי? (שעה / תאריך)',
        placeholder: 'למשל: היום ב-18:00, מחר בבוקר...',
      },
      { key: 'luggage', type: 'toggle', label: 'יש כבודה גדולה / מזוודות' },
      { key: 'child_seat', type: 'toggle', label: 'צריך כיסא בטיחות לילד' },
    ],
    suggestedExtras: ['driver', 'vehicle'],
    chatQuestionOrder: ['ride_type', 'to_address', 'passengers', 'pickup_time'],
  },

  // ── 🐶 בעלי חיים ────────────────────────────────────────────────────────────
  pets: {
    label: '🐶 בעלי חיים',
    keywords: ['כלב', 'חתול', 'טיול כלב', 'האכלה', 'שמירה על כלב', 'ווטרינר', 'וטרינר', 'כלובים', 'חיות מחמד', 'פנסיון', 'בעל חיים', 'דגים', 'ציפור'],
    priceRange: { min: 50, max: 250 },
    extraFields: [
      {
        key: 'service_type',
        type: 'select',
        label: 'מה צריך? 🐶',
        options: [
          'טיול עם הכלב',
          'שמירה בזמן חופשה (כמה ימים)',
          'האכלה / השקיה יומית',
          'הסעה לוטרינר',
          'ניקוי כלוב / חיפוש',
          'אילוף / אימון',
          'אחר',
        ],
      },
      {
        key: 'animal_type',
        type: 'select',
        label: 'איזה חיה?',
        options: ['כלב', 'חתול', 'ציפור', 'דגים', 'כמה חיות', 'אחר'],
      },
      {
        key: 'animal_size',
        type: 'select',
        label: 'גודל החיה (אם כלב)',
        options: ['קטן — עד 10 ק"ג', 'בינוני — 10–25 ק"ג', 'גדול — מעל 25 ק"ג', 'לא רלוונטי'],
      },
      {
        key: 'duration',
        type: 'select',
        label: 'כמה זמן / כמה פעמים?',
        options: ['פעם אחת', 'כמה ימים', 'שבוע', 'שוטף — כל יום'],
      },
      { key: 'notes', type: 'text', label: 'פרטים מיוחדים', placeholder: 'למשל: כלב עצבני, אלרגיה, תרופות...' },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['service_type', 'animal_type', 'duration'],
  },

  // ── 👵 סיוע לקשישים ─────────────────────────────────────────────────────────
  elderly_care: {
    label: '👵 סיוע לקשישים',
    keywords: ['קשיש', 'סבא', 'סבתא', 'ליווי', 'קופת חולים', 'רופא', 'תרופות', 'עזרה לזקן', 'חברה', 'ביקור', 'לקחת לרופא', 'לעזור לקשיש'],
    priceRange: { min: 60, max: 200 },
    extraFields: [
      {
        key: 'service_type',
        type: 'select',
        label: 'מה צריך? 👵',
        options: [
          'ליווי לרופא / קופת חולים',
          'ליווי לבית מרקחת',
          'קניות עבור קשיש',
          'עזרה בבית (כביסה, ניקיון)',
          'חברה וביקור',
          'עזרה בטכנולוגיה (טלפון, מחשב)',
          'עזרה בנייר עבודה / ביורוקרטיה',
          'אחר',
        ],
      },
      {
        key: 'frequency',
        type: 'select',
        label: 'כמה פעמים?',
        options: ['פעם אחת', 'כמה פעמים בשבוע', 'שוטף', 'לא קבוע'],
      },
      { key: 'mobility', type: 'toggle', label: 'הקשיש זקוק לעזרה בהליכה' },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: בן 85, גר לבד, דורש סבלנות...' },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['service_type', 'frequency'],
  },

  // ── 🏋️ כושר וספורט ──────────────────────────────────────────────────────────
  fitness: {
    label: '🏋️ כושר וספורט',
    keywords: ['מאמן אישי', 'אימון', 'כושר', 'ריצה', 'יוגה', 'פילאטיס', 'חדר כושר', 'ספורט', 'אימון אישי', 'תזונה', 'אימון בבית'],
    priceRange: { min: 80, max: 200 },
    extraFields: [
      {
        key: 'training_type',
        type: 'select',
        label: 'איזה אימון? 🏋️',
        options: [
          'אימון כושר כללי',
          'ריצה / הכנה לריצה',
          'יוגה',
          'פילאטיס',
          'אימון בבית (ללא ציוד)',
          'אימון בחדר כושר',
          'שחייה',
          'אחר',
        ],
      },
      {
        key: 'level',
        type: 'select',
        label: 'רמת הכושר שלך',
        options: ['מתחיל לגמרי', 'בסיסי', 'בינוני', 'מתקדם'],
      },
      {
        key: 'frequency',
        type: 'select',
        label: 'כמה פעמים בשבוע?',
        options: ['פעם אחת', 'פעמיים', '3 פעמים', 'גמיש'],
      },
      {
        key: 'location',
        type: 'select',
        label: 'איפה?',
        options: ['בבית', 'בפארק / בחוץ', 'בחדר כושר', 'גמיש'],
      },
      { key: 'goal', type: 'text', label: 'מטרה (לא חובה)', placeholder: 'למשל: לרדת 5 קילו, להתכונן לריצת 10K...' },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['training_type', 'level', 'frequency', 'location'],
  },

  // ── 📸 צילום ותוכן ──────────────────────────────────────────────────────────
  photography: {
    label: '📸 צילום ותוכן',
    keywords: ['צילום', 'צלם', 'וידאו', 'עריכה', 'תוכן', 'רילס', 'טיקטוק', 'אינסטגרם', 'פרסום', 'קמפיין', 'מוצר', 'אירוע', 'בר מצווה', 'חתונה', 'תדמית'],
    priceRange: { min: 200, max: 1500 },
    extraFields: [
      {
        key: 'content_type',
        type: 'select',
        label: 'מה צריך? 📸',
        options: [
          'צילום עסק / חנות',
          'צילום מוצרים',
          'צילום אירוע (מסיבה / אירוע עסקי)',
          'צילום אישי / תדמית',
          'סרטון לרשתות חברתיות (רילס / טיקטוק)',
          'עריכת וידאו בלבד',
          'עריכת תמונות בלבד',
          'צילום נדל"ן / דירה',
          'אחר',
        ],
      },
      {
        key: 'duration',
        type: 'select',
        label: 'כמה זמן?',
        options: ['עד שעה', 'שעה-שעתיים', 'חצי יום', 'יום מלא'],
      },
      { key: 'needs_editing', type: 'toggle', label: 'צריך עריכה + תמונות מוגמרות' },
      { key: 'needs_drone', type: 'toggle', label: 'צריך צילום רחפן' },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: 50 תמונות, סגנון בהיר, לצורך אינסטגרם...' },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['content_type', 'duration', 'needs_editing'],
  },

  // ── 🎉 אירועים ──────────────────────────────────────────────────────────────
  events: {
    label: '🎉 אירועים',
    keywords: ['אירוע', 'מסיבה', 'חתונה', 'בר מצווה', 'מלצר', 'שף', 'ברמן', 'הפעלה', 'ילדים', 'קייטרינג', 'הקמה', 'פירוק', 'סדרן', 'ויתרנים'],
    priceRange: { min: 150, max: 1000 },
    extraFields: [
      {
        key: 'role_type',
        type: 'select',
        label: 'מה תפקיד נדרש? 🎉',
        options: [
          'מלצר / הגשה',
          'ברמן',
          'שף / טבח',
          'הפעלת ילדים / אנימציה',
          'עזרה בהקמה / פירוק',
          'סדרן / אבטחה',
          'צלם (ראה קטגוריה צילום)',
          'אחר',
        ],
      },
      {
        key: 'event_type',
        type: 'select',
        label: 'סוג האירוע',
        options: ['מסיבה פרטית', 'אירוע עסקי', 'חתונה / בר מצווה', 'אירוע ילדים', 'יום הולדת', 'אחר'],
      },
      {
        key: 'guests_count',
        type: 'select',
        label: 'כמה אורחים?',
        options: ['עד 20', '20–50', '50–100', '100–200', 'מעל 200'],
      },
      {
        key: 'event_date',
        type: 'text',
        label: 'תאריך האירוע',
        placeholder: 'למשל: 15/08/2024, שישי הקרוב...',
      },
      {
        key: 'hours',
        type: 'select',
        label: 'כמה שעות?',
        options: ['עד 3 שעות', '3–5 שעות', '5–8 שעות', 'יום מלא'],
      },
    ],
    suggestedExtras: ['experience', 'two_people'],
    chatQuestionOrder: ['role_type', 'event_type', 'guests_count', 'event_date'],
  },

  // ── 🤝 עזרה אישית ───────────────────────────────────────────────────────────
  personal_help: {
    label: '🤝 עזרה אישית',
    keywords: ['לחכות', 'לעמוד בתור', 'לאסוף', 'להחזיר', 'מסמך', 'מפתח', 'לבדוק דירה', 'לחכות לטכנאי', 'לטפל', 'שליחות', 'בירוקרטיה', 'עזרה', 'שליח אישי'],
    priceRange: { min: 50, max: 200 },
    extraFields: [
      {
        key: 'task_type',
        type: 'select',
        label: 'מה צריך? 🤝',
        options: [
          'לחכות לטכנאי / שליח בבית',
          'לעמוד בתור (עיריה, רופא...)',
          'לאסוף ילד מגן / בית ספר',
          'להעביר מפתח / מסמך',
          'להחזיר ציוד / פריט',
          'לבדוק / לצלם דירה',
          'עזרה בטפסים / ביורוקרטיה',
          'שליחות אישית',
          'אחר',
        ],
      },
      {
        key: 'duration',
        type: 'select',
        label: 'כמה זמן משוער?',
        options: ['עד חצי שעה', 'עד שעה', '1–3 שעות', 'חצי יום', 'לא ידוע'],
      },
      { key: 'notes', type: 'text', label: 'פרטים נוספים', placeholder: 'למשל: לחכות לפלאפל חשמל בין 14:00–18:00...' },
    ],
    suggestedExtras: ['vehicle', 'experience'],
    chatQuestionOrder: ['task_type', 'duration'],
  },

  // ── 📋 אחר ─────────────────────────────────────────────────────────────────
  other: {
    label: '📋 אחר',
    keywords: [],
    priceRange: { min: 100, max: 500 },
    extraFields: [],
    suggestedExtras: [],
    chatQuestionOrder: [],
  },
};

// ── Helper functions ──────────────────────────────────────────────────────────

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