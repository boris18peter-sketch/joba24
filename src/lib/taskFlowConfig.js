/**
 * taskFlowConfig.js — Single source of truth for all task publish/edit/activation flows.
 * Each category form is modeled on professional platforms (Rover, UrbanSitter, TaskRabbit).
 * Supports: select, multi, toggle, number, text, textarea, address, schedule.
 * Conditional logic via showWhen: { field, equals | notEquals | in | notIn }.
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
        type: 'multi',
        label: 'מה הבעיה? 🔧 (ניתן לבחור יותר מאחת)',
        options: [
          'נזילה ממקור מסוים',
          'סתימה בכיור / אמבטיה / שירותים',
          'החלפת ברז',
          'אסלה שלא מפסיקה לזרום',
          'דוד שמש / בוילר',
          'התקנת מכשיר חדש (מדיח, מכונת כביסה)',
          'ריח / ביוב עולה',
          'בדיקה כללית',
          'אחר',
        ],
      },
      {
        key: 'location_in_home',
        type: 'multi',
        label: 'איפה בבית? (ניתן לבחור כמה)',
        options: ['מטבח', 'חדר אמבטיה', 'שירותים', 'מרפסת', 'מחוץ לבית', 'אחר'],
      },
      {
        key: 'water_flow',
        type: 'toggle',
        label: '🚨 יש זרימת מים פעילה עכשיו (נזק מתרחש)',
        showWhen: { field: 'issue_type', in: ['נזילה ממקור מסוים', 'אסלה שלא מפסיקה לזרום', 'ריח / ביוב עולה'] },
      },
      {
        key: 'main_valve_access',
        type: 'toggle',
        label: 'יודע איפה ברז המים הראשי',
        showWhen: { field: 'water_flow', equals: true },
      },
    ],
    suggestedExtras: ['plumber', 'certified'],
    chatQuestionOrder: ['issue_type', 'location_in_home'],
  },

  // ── ⚡ חשמלאות ──────────────────────────────────────────────────────────────
  electricity: {
    label: '⚡ חשמלאות',
    keywords: ['חשמל', 'חשמלאי', 'שקע', 'מתג', 'לוח חשמל', 'נורה', 'חיווט', 'מפסק', 'תקע', 'חוט חשמל', 'התקנת שקע', 'לוח ראשי', 'מפל מתח'],
    priceRange: { min: 200, max: 500 },
    extraFields: [
      {
        key: 'issue_type',
        type: 'multi',
        label: 'מה צריך? ⚡ (ניתן לבחור יותר מאחת)',
        options: [
          'שקע / מפסק לא עובד',
          'נפילת חשמל (מפסק קפץ)',
          'התקנת שקע חדש',
          'החלפת נורה / גוף תאורה',
          'בדיקת לוח חשמל',
          'חיווט לחדר / מקום חדש',
          'התקנת מאוורר תקרה',
          'חיווט לדוד / למזגן',
          'אחר',
        ],
      },
      {
        key: 'power_out',
        type: 'toggle',
        label: '🚨 אין חשמל עכשיו בכל הבית / בחלקו',
        showWhen: { field: 'issue_type', in: ['נפילת חשמל (מפסק קפץ)', 'שקע / מפסק לא עובד'] },
      },
      {
        key: 'rooms_affected',
        type: 'multi',
        label: 'אילו חדרים מושפעים?',
        options: ['מטבח', 'סלון', 'חדר שינה', 'חדר אמבטיה', 'מחוץ לבית', 'כל הבית'],
        showWhen: { field: 'issue_type', in: ['התקנת שקע חדש', 'חיווט לחדר / מקום חדש', 'החלפת נורה / גוף תאורה'] },
      },
      {
        key: 'has_certified_panel',
        type: 'toggle',
        label: 'לוח החשמל מעודכן ובעל היתר',
      },
    ],
    suggestedExtras: ['electrician', 'certified'],
    chatQuestionOrder: ['issue_type', 'power_out'],
  },

  // ── 🌿 גינון ────────────────────────────────────────────────────────────────
  gardening: {
    label: '🌿 גינון',
    keywords: ['גינה', 'גינון', 'צמחים', 'עשב', 'גזם', 'גיזום', 'שיח', 'עשבייה', 'השקיה', 'דשא', 'זבל גינה', 'ערוגה', 'עץ', 'עצים', 'גינת'],
    priceRange: { min: 200, max: 500 },
    extraFields: [
      {
        key: 'work_type',
        type: 'multi',
        label: 'מה צריך לעשות? 🌿 (ניתן לבחור יותר מאחת)',
        options: [
          'כיסוח דשא',
          'גיזום עצים / שיחים',
          'עישוב (ניכוש עשבים)',
          'ניקוי וסידור הגינה',
          'פינוי ענפים / גזם',
          'שתילה / הקמת ערוגה',
          'תכנון והקמת גינה חדשה',
          'תיקון מערכת השקיה',
          'אחר',
        ],
      },
      {
        key: 'garden_size',
        type: 'select',
        label: 'גודל הגינה',
        options: ['קטנה — עד 20 מ"ר', 'בינונית — 20–60 מ"ר', 'גדולה — 60–150 מ"ר', 'גדולה מאוד — מעל 150 מ"ר'],
      },
      {
        key: 'garden_type',
        type: 'select',
        label: 'איזה סוג גינה?',
        options: ['גינה פרטית בבית', 'גינת בניין משותף', 'מרפסת / גג', 'שטח ציבורי / עסקי'],
      },
      {
        key: 'needs_disposal',
        type: 'toggle',
        label: 'צריך לפנות פסולת / ענפים',
      },
      {
        key: 'has_tools',
        type: 'toggle',
        label: 'יש ציוד בבית (מקצרה, מסור, גזם...)',
      },
      {
        key: 'recurring',
        type: 'select',
        label: 'חד-פעמי או טיפול שוטף?',
        options: ['חד-פעמי', 'שבועי', 'דו-שבועי', 'חודשי'],
      },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['work_type', 'garden_size', 'garden_type'],
  },

  // ── 🧹 ניקיון ───────────────────────────────────────────────────────────────
  cleaning: {
    label: '🧹 ניקיון',
    keywords: ['ניקיון', 'לנקות', 'ניקוי', 'שואב אבק', 'מגב', 'חלונות', 'ניקוי עומק', 'ניקוי בית', 'ניקוי משרד', 'ניקוי דירה', 'מגבון', 'אבק', 'רצפה'],
    priceRange: { min: 150, max: 400 },
    extraFields: [
      {
        key: 'cleaning_type',
        type: 'multi',
        label: 'איזה סוג ניקיון? 🧹 (ניתן לבחור יותר מאחת)',
        options: [
          'ניקיון שוטף (שבועי / דו-שבועי)',
          'ניקוי עומק (אחת לחודש)',
          'ניקיון לפני / אחרי מעבר דירה',
          'ניקיון לאחר שיפוץ',
          'ניקוי חלונות',
          'ניקוי שטיחים / ריפוד',
          'ניקוי מטבח / תנור',
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
      { key: 'bathrooms', type: 'number', label: 'כמה חדרי אמבטיה / שירותים?', placeholder: 'למשל: 2' },
      { key: 'has_materials', type: 'toggle', label: 'יש חומרי ניקוי בבית' },
      { key: 'has_equipment', type: 'toggle', label: 'יש ציוד (שואב אבק, מגב...)' },
      {
        key: 'recurring',
        type: 'select',
        label: 'חד-פעמי או קבוע?',
        options: ['חד-פעמי', 'שבועי', 'דו-שבועי', 'חודשי'],
      },
      {
        key: 'schedule',
        type: 'schedule',
        label: 'מתי להגיע? 📅',
        showWhen: { field: 'recurring', in: ['שבועי', 'דו-שבועי', 'חודשי'] },
      },
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
          'רהיט בודד (ספה, מיטה, ארון)',
          'ציוד / מכשיר גדול',
          'אחר',
        ],
      },
      { key: 'from_floor', type: 'number', label: 'קומה במוצא', placeholder: '0 = קרקע' },
      { key: 'to_floor', type: 'number', label: 'קומה ביעד', placeholder: '0 = קרקע' },
      { key: 'elevator_from', type: 'toggle', label: 'יש מעלית במוצא' },
      { key: 'elevator_to', type: 'toggle', label: 'יש מעלית ביעד' },
      {
        key: 'vehicle_needed',
        type: 'select',
        label: 'איזה רכב צריך?',
        options: ['טנדר / סטיישן מספיק', 'ואן בינוני', 'משאית קטנה', 'משאית גדולה', 'לא בטוח'],
      },
      { key: 'needs_packing', type: 'toggle', label: 'צריך עזרה באריזה' },
      { key: 'needs_disassembly', type: 'toggle', label: 'צריך לפרק ולהרכיב רהיטים' },
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
        type: 'multi',
        label: 'מה צריך לצבוע? (ניתן לבחור יותר מאחד)',
        options: [
          'קירות פנים (חדר / דירה)',
          'תקרה',
          'קירות חוץ',
          'גדר / קיר חיצוני',
          'דלת / חלון',
          'ריהוט עץ',
          'מדרגות',
          'אחר',
        ],
      },
      { key: 'rooms', type: 'number', label: 'כמה חדרים / קירות?', placeholder: 'למשל: 2' },
      { key: 'area', type: 'number', label: 'שטח משוער (מ"ר)', placeholder: 'למשל: 50' },
      { key: 'has_paint', type: 'toggle', label: 'יש צבע (לא צריך להביא)' },
      {
        key: 'needs_prep',
        type: 'toggle',
        label: 'צריך הכנה — טיח / גבס / סתימת סדקים',
      },
      {
        key: 'wall_condition',
        type: 'select',
        label: 'מצב הקירות',
        options: ['חדש — רק צבע', 'תקין — צריך שכבה', 'דורש תיקון קל', 'דורש שיפוץ מקדים'],
        showWhen: { field: 'needs_prep', notEquals: true },
      },
      {
        key: 'prep_details',
        type: 'multi',
        label: 'איזה הכנה צריך?',
        options: ['טיח / מריחת גבס', 'סתימת סדקים', 'הסרת טפט ישן', 'שיוף קיר ישן', 'תיקון רטיבות'],
        showWhen: { field: 'needs_prep', equals: true },
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
        type: 'multi',
        label: 'מה צריך? 🪵 (ניתן לבחור יותר מאחת)',
        options: [
          'הרכבת ריהוט מקופסה (IKEA וכד\')',
          'תיקון / חיזוק רהיט שבור',
          'בניית מדף / ארון מותאם',
          'החלפת / תיקון דלת',
          'התקנת מטבח / ארונות',
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
      {
        key: 'assembly_brand',
        type: 'select',
        label: 'מותג הריהוט (אם רלוונטי)',
        options: ['IKEA', 'הום סנטר', 'אייס', 'KARE', 'אחר', 'לא רלוונטי'],
        showWhen: { field: 'work_type', in: ['הרכבת ריהוט מקופסה (IKEA וכד\')', 'פירוק רהיטים'] },
      },
      { key: 'has_tools', type: 'toggle', label: 'יש כלים בבית (מקדחה, פטיש...)' },
      { key: 'has_instructions', type: 'toggle', label: 'יש הוראות הרכבה / שרטוט', showWhen: { field: 'work_type', in: ['הרכבת ריהוט מקופסה (IKEA וכד\')', 'בניית מדף / ארון מותאם'] } },
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
          'מזגן מטפטף מים',
          'מזגן לא נדלק',
          'רעש / רטיט במזגן',
          'אחר',
        ],
      },
      { key: 'units', type: 'number', label: 'כמה יחידות?', placeholder: 'למשל: 2' },
      {
        key: 'ac_type',
        type: 'select',
        label: 'סוג מזגן',
        options: ['מפוצל (split)', 'נייד', 'מיני מרכזי', 'מרכזי / תעלות', 'לא יודע'],
      },
      {
        key: 'ac_age',
        type: 'select',
        label: 'גיל המזגן',
        options: ['חדש (עד שנתיים)', '3–7 שנים', 'מעל 7 שנים', 'לא יודע'],
        showWhen: { field: 'work_type', in: ['מזגן לא מקרר / לא מחמם', 'מזגן מטפטף מים', 'מזגן לא נדלק', 'רעש / רטיט במזגן'] },
      },
      {
        key: 'needs_wall_mounting',
        type: 'toggle',
        label: 'צריך הרכבה על הקיר (תליית יחידה פנימית)',
        showWhen: { field: 'work_type', equals: 'התקנת מזגן חדש' },
      },
      {
        key: 'outdoor_access',
        type: 'select',
        label: 'גישה ליחידה החיצונית',
        options: ['מרפסת / גג נגיש', 'צריך סולם', 'צריך בניין / סנפלינג', 'לא רלוונטי'],
        showWhen: { field: 'work_type', in: ['התקנת מזגן חדש', 'פירוק מזגן', 'ניקוי / שירות שנתי'] },
      },
    ],
    suggestedExtras: ['certified', 'ladder'],
    chatQuestionOrder: ['work_type', 'units', 'ac_type'],
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
          'צילינדר חסום / מפתח שבור בפנים',
          'אחר',
        ],
      },
      {
        key: 'locked_out_now',
        type: 'toggle',
        label: '🚨 ננעלתי בחוץ כרגע — זה דחוף מאוד',
        showWhen: { field: 'issue_type', equals: '🚨 ננעלתי בחוץ — פריצת מנעול' },
      },
      {
        key: 'door_type',
        type: 'select',
        label: 'סוג הדלת',
        options: ['דלת דירה', 'דלת בית פרטי', 'דלת מחסן / חניה', 'דלת משרד', 'מכונית', 'אחר'],
      },
      {
        key: 'lock_type',
        type: 'select',
        label: 'סוג המנעול (אם ידוע)',
        options: ['צילינדר רגיל', 'מולטילוק', 'מנעול חכם / קוד', 'בריח', 'לא יודע'],
      },
    ],
    suggestedExtras: ['certified', 'experience'],
    chatQuestionOrder: ['issue_type', 'locked_out_now', 'door_type'],
  },

  // ── 🛒 קניות ────────────────────────────────────────────────────────────────
  shopping: {
    label: '🛒 קניות',
    keywords: ['קניות', 'לקנות', 'סופרמרקט', 'מוצרים', 'רשימת קניות', 'שליח קניות', 'רכישה', 'מכולת', 'קנייה', 'פארם', 'תרופות'],
    priceRange: { min: 50, max: 150 },
    extraFields: [
      {
        key: 'shopping_type',
        type: 'multi',
        label: 'מה קונים? 🛒 (ניתן לבחור יותר מאחד)',
        options: [
          'מזון (סופר / מכולת)',
          'תרופות / בית מרקחת',
          'פירות וירקות (שוק)',
          'ציוד / חנות ספציפית',
          'אלכוהול',
          'קניות כלליות — יסופק רשימה',
        ],
      },
      { key: 'store', type: 'text', label: 'שם החנות / מיקום', placeholder: 'למשל: סופר רמי לוי, רחוב הרצל...' },
      { key: 'budget', type: 'number', label: 'תקציב הקנייה (₪) משוער', placeholder: 'למשל: 200' },
      { key: 'items', type: 'textarea', label: 'רשימת קניות', placeholder: 'חלב, לחם, עגבניות, ביצים...' },
      { key: 'needs_receipt', type: 'toggle', label: 'צריך להביא קבלה' },
      {
        key: 'payment_handling',
        type: 'select',
        label: 'איך נשלם על הקנייה?',
        options: ['מזומן בחזרה', 'העברה בביט', 'PayBox', 'אשראי', 'אחר'],
      },
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
          'תרופות',
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
      { key: 'recipient_phone', type: 'text', label: 'טלפון המקבל (לא חובה)', placeholder: 'למשל: 050-1234567' },
      { key: 'fragile', type: 'toggle', label: 'שביר — יש לטפל בזהירות' },
      { key: 'cold_chain', type: 'toggle', label: 'צריך שמירה על קור (קירור)', showWhen: { field: 'item_type', in: ['אוכל / מזון', 'תרופות'] } },
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
        key: 'schedule',
        type: 'schedule',
        label: 'מתי נדרשת הבייביסיטר? 📅 (תאריך ושעות מדויקים)',
      },
      {
        key: 'location',
        type: 'select',
        label: 'איפה?',
        options: ['בבית שלנו', 'בבית הבייביסיטר', 'גמיש'],
      },
      {
        key: 'activities',
        type: 'multi',
        label: 'מה נדרש לעשות? (ניתן לבחור כמה)',
        options: [
          'שמירה בלבד',
          'הכנת ארוחה',
          'השכבה לשינה',
          'עזרה בשיעורים',
          'אמבטיה',
          'הסעה / איסוף מגן',
          'משחק ופעילות',
        ],
      },
      {
        key: 'special_needs',
        type: 'textarea',
        label: 'צרכים מיוחדים / אלרגיות / מידע חשוב',
        placeholder: 'למשל: אלרגיה לבוטנים, ילד עם אוטיזם, תרופות...',
      },
      { key: 'has_pets', type: 'toggle', label: 'יש חיות מחמד בבית' },
      {
        key: 'pet_details',
        type: 'text',
        label: 'פרטי חיות המחמד',
        placeholder: 'למשל: כלב ידידותי, חתול...',
        showWhen: { field: 'has_pets', equals: true },
      },
      {
        key: 'first_aid_required',
        type: 'toggle',
        label: 'נדרש ניסיון בעזרה ראשונה / החייאה',
      },
      { key: 'smoking_allowed', type: 'toggle', label: 'מעשנים בבית' },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['kids_count', 'kids_ages', 'schedule', 'location'],
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
        key: 'schedule',
        type: 'schedule',
        label: 'מתי נדרש השיעור? 📅 (תאריך ושעות מדויקים)',
      },
      {
        key: 'format',
        type: 'select',
        label: 'פרונטלי או אונליין?',
        options: ['פרונטלי — בבית', 'פרונטלי — אצל המורה', 'זום / אונליין', 'גמיש'],
      },
      {
        key: 'goal',
        type: 'text',
        label: 'מטרה / תיאור (לא חובה)',
        placeholder: 'למשל: הכנה למבחן בגרות, צמצום פערים...',
      },
      {
        key: 'learning_difficulty',
        type: 'toggle',
        label: 'יש לקות למידה / ADHD (נדרשת התאמה)',
      },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['subject', 'grade_level', 'schedule', 'format'],
  },

  // ── 💻 מחשבים ──────────────────────────────────────────────────────────────
  it_support: {
    label: '💻 מחשבים',
    keywords: ['מחשב', 'רשת', 'תמיכה טכנית', 'תוכנה', 'חומרה', 'אינטרנט', 'ווייפיי', 'wifi', 'התקנת תוכנה', 'וירוס', 'טלפון תקוע', 'אפליקציה', 'לפטופ', 'האטה'],
    priceRange: { min: 150, max: 400 },
    extraFields: [
      {
        key: 'issue_type',
        type: 'multi',
        label: 'מה הבעיה? 💻 (ניתן לבחור יותר מאחת)',
        options: [
          'מחשב איטי מאוד',
          'מחשב לא נדלק',
          'וירוס / תוכנה זדונית',
          'בעיית אינטרנט / WiFi',
          'התקנת תוכנה / Windows',
          'גיבוי נתונים / שחזור',
          'בעיית מסך / מקלדת / עכבר',
          'הגדרת אימייל / חשבון',
          'התקנת מדפסת',
          'אחר',
        ],
      },
      {
        key: 'device_type',
        type: 'multi',
        label: 'איזה מכשיר?',
        options: ['מחשב נייח', 'לפטופ (נייד)', 'טאבלט', 'סמארטפון', 'ראוטר / רשת', 'מדפסת', 'כמה מכשירים'],
      },
      {
        key: 'os_type',
        type: 'select',
        label: 'מערכת הפעלה (אם ידוע)',
        options: ['Windows', 'Mac / macOS', 'Linux', 'iOS / iPad', 'Android', 'לא יודע'],
        showWhen: { field: 'device_type', notIn: ['סמארטפון', 'ראוטר / רשת', 'מדפסת'] },
      },
      {
        key: 'visit_type',
        type: 'select',
        label: 'איך מועדף?',
        options: ['ביקור בית / עסק', 'מרחוק (remote)', 'גמיש'],
      },
      {
        key: 'data_at_risk',
        type: 'toggle',
        label: '⚠️ יש נתונים חשובים שעלולים לאבד',
        showWhen: { field: 'issue_type', in: ['מחשב לא נדלק', 'וירוס / תוכנה זדונית', 'גיבוי נתונים / שחזור'] },
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
        type: 'multi',
        label: 'מה צריך לעשות? 🔨 (ניתן לבחור יותר מאחת)',
        options: [
          'תליית טלוויזיה על קיר',
          'תליית מדף / תמונה',
          'התקנת וילון / בלינד',
          'החלפת ידית / מנגנון',
          'תיקון ריהוט שבור',
          'הרכבת ריהוט מקופסה',
          'איטום / גבס קטן',
          'התקנת מנורה / גוף תאורה',
          'תיקון דלת / ציר',
          'אחר',
        ],
      },
      {
        key: 'wall_type',
        type: 'select',
        label: 'סוג הקיר (אם רלוונטי)',
        options: ['בטון / בלוק', 'גבס', 'לא יודע', 'לא רלוונטי'],
        showWhen: { field: 'work_type', in: ['תליית טלוויזיה על קיר', 'תליית מדף / תמונה', 'התקנת וילון / בלינד'] },
      },
      {
        key: 'items_count',
        type: 'select',
        label: 'כמה עבודות / פריטים?',
        options: ['עבודה אחת', '2–3 עבודות', '4 ומעלה'],
      },
      { key: 'has_tools', type: 'toggle', label: 'יש כלים בבית (מקדחה, פטיש...)' },
    ],
    suggestedExtras: ['experience', 'drill'],
    chatQuestionOrder: ['work_type', 'wall_type', 'items_count', 'has_tools'],
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
          'טעינת פריטים לרכב',
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
        key: 'weight',
        type: 'select',
        label: 'משקל משוער לפריט',
        options: ['עד 15 ק"ג', '15–30 ק"ג', '30–60 ק"ג', 'מעל 60 ק"ג', 'ארגזים רבים'],
        showWhen: { field: 'task_type', in: ['להעלות / להוריד פריט כבד', 'לסחוב ארגזים / קרטונים', 'עזרה בהזזת ריהוט בתוך הבית'] },
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
        type: 'multi',
        label: 'מה צריך? 🏠 (ניתן לבחור יותר מאחת)',
        options: [
          'ניקוי / פינוי מחסן',
          'סידור וארגון מחסן',
          'ניקוי מרזבים / גג',
          'פינוי פסולת / ריהוט ישן',
          'ניקוי מרפסת / חצר',
          'ארגון בית כללי',
          'תיקונים קטנים בבית',
          'אחר',
        ],
      },
      {
        key: 'size',
        type: 'select',
        label: 'גודל השטח / היקף העבודה',
        options: ['קטן — עד שעה', 'בינוני — 2–3 שעות', 'גדול — חצי יום', 'גדול מאוד — יום שלם'],
      },
      { key: 'needs_disposal', type: 'toggle', label: 'צריך לפנות / להשליך ציוד' },
      {
        key: 'disposal_type',
        type: 'multi',
        label: 'מה מפנים?',
        options: ['ריהוט ישן', 'פסולת בניין', 'קרטונים', 'גזם / ענפים', 'ציוד חשמלי', 'אשפה כללית'],
        showWhen: { field: 'needs_disposal', equals: true },
      },
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
          'הסעת קשיש',
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
      { key: 'luggage', type: 'toggle', label: 'יש כבודה גדולה / מזוודות' },
      {
        key: 'luggage_count',
        type: 'select',
        label: 'כמה מזוודות?',
        options: ['1–2', '3–4', '5+'],
        showWhen: { field: 'luggage', equals: true },
      },
      { key: 'child_seat', type: 'toggle', label: 'צריך כיסא בטיחות לילד' },
      {
        key: 'child_seats_count',
        type: 'number',
        label: 'כמה כיסאות בטיחות?',
        placeholder: 'למשל: 2',
        showWhen: { field: 'child_seat', equals: true },
      },
    ],
    suggestedExtras: ['driver', 'vehicle'],
    chatQuestionOrder: ['ride_type', 'to_address', 'passengers'],
  },

  // ── 🐶 בעלי חיים (Rover-style) ────────────────────────────────────────────────
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
          'שמירה / פנסיון בבית המטפל',
          'ביקור יומי (האכלה / השקיה / טיול קצר)',
          'הסעה לוטרינר / טיפוח',
          'אילוף / אימון',
          'טיפוח / גזיזה / אמבטיה',
          'אחר',
        ],
      },
      {
        key: 'animal_type',
        type: 'select',
        label: 'איזה חיה?',
        options: ['כלב', 'חתול', 'ארנב / מכרסם', 'ציפור', 'זוחל', 'דגים', 'כמה חיות', 'אחר'],
        showWhen: { field: 'service_type', notEquals: 'טיול עם הכלב' },
      },
      // ── Dog-specific fields (Rover-style) ──
      {
        key: 'dog_size',
        type: 'select',
        label: 'גודל הכלב',
        options: ['קטן — עד 10 ק"ג', 'בינוני — 10–25 ק"ג', 'גדול — 25–45 ק"ג', 'ענק — מעל 45 ק"ג'],
        showWhen: { field: 'animal_type', equals: 'כלב' },
      },
      {
        key: 'dog_breed',
        type: 'text',
        label: 'גזע הכלב (אם ידוע)',
        placeholder: 'למשל: לברדור, פודל, מעורב...',
        showWhen: { field: 'animal_type', equals: 'כלב' },
      },
      {
        key: 'dog_age',
        type: 'select',
        label: 'גיל הכלב',
        options: ['גור (עד שנה)', 'צעיר (1–3 שנים)', 'בוגר (3–7 שנים)', 'מבוגר (מעל 7)'],
        showWhen: { field: 'animal_type', equals: 'כלב' },
      },
      {
        key: 'dog_temperament',
        type: 'multi',
        label: 'אופי הכלב — ניתן לבחור כמה',
        options: ['ידידותי', 'רגוע', 'אנרגטי', 'חרדתי', 'תקיף / תוקפני', 'מושך ברצועה', 'בורח לפעמים'],
        showWhen: { field: 'animal_type', equals: 'כלב' },
      },
      {
        key: 'dog_social',
        type: 'select',
        label: 'הכלב מסתדר עם כלבים אחרים?',
        options: ['כן, ידידותי', 'בסדר עם היכרות', 'מסתייג', 'לא יודע', 'לא רלוונטי'],
        showWhen: { field: 'animal_type', equals: 'כלב' },
      },
      { key: 'dog_vaccinated', type: 'toggle', label: 'מחוסן ומעודכן', showWhen: { field: 'animal_type', equals: 'כלב' } },
      { key: 'dog_neutered', type: 'toggle', label: 'מסורס / מעוקר', showWhen: { field: 'animal_type', equals: 'כלב' } },
      { key: 'dog_good_with_kids', type: 'toggle', label: 'בית עם ילדים', showWhen: { field: 'animal_type', equals: 'כלב' } },
      { key: 'dog_good_with_cats', type: 'toggle', label: 'בית עם חתולים', showWhen: { field: 'animal_type', equals: 'כלב' } },
      // ── Cat-specific fields ──
      { key: 'cat_indoor', type: 'toggle', label: 'חתול ביתי (לא יוצא החוצה)', showWhen: { field: 'animal_type', equals: 'חתול' } },
      {
        key: 'cat_litter',
        type: 'toggle',
        label: 'צריך החלפת חול / ניקוי ארגז',
        showWhen: { field: 'animal_type', equals: 'חתול' },
      },
      // ── Schedule for recurring services ──
      {
        key: 'schedule',
        type: 'schedule',
        label: 'מתי נדרש השירות? 📅 (תאריך ושעות מדויקים)',
      },
      // ── Care details ──
      {
        key: 'feeding_instructions',
        type: 'textarea',
        label: 'הוראות האכלה / תרופות',
        placeholder: 'למשל: 2 פעמים ביום, תרופה בבוקר...',
        showWhen: { field: 'service_type', in: ['שמירה / פנסיון בבית המטפל', 'ביקור יומי (האכלה / השקיה / טיול קצר)'] },
      },
      {
        key: 'special_care',
        type: 'textarea',
        label: 'צרכים מיוחדים / מצב רפואי',
        placeholder: 'למשל: סכרת, אפילפסיה, אלרגיות...',
      },
      { key: 'has_keys', type: 'toggle', label: 'העובד יקבל מפתח לבית', showWhen: { field: 'service_type', in: ['ביקור יומי (האכלה / השקיה / טיול קצר)', 'טיול עם הכלב'] } },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['service_type', 'animal_type', 'schedule'],
  },

  // ── 👵 סיוע לקשישים ─────────────────────────────────────────────────────────
  elderly_care: {
    label: '👵 סיוע לקשישים',
    keywords: ['קשיש', 'סבא', 'סבתא', 'ליווי', 'קופת חולים', 'רופא', 'תרופות', 'עזרה לזקן', 'חברה', 'ביקור', 'לקחת לרופא', 'לעזור לקשיש'],
    priceRange: { min: 60, max: 200 },
    extraFields: [
      {
        key: 'service_type',
        type: 'multi',
        label: 'מה צריך? 👵 (ניתן לבחור יותר מאחת)',
        options: [
          'ליווי לרופא / קופת חולים',
          'ליווי לבית מרקחת / קניות',
          'קניות עבור הקשיש',
          'עזרה בבית (כביסה, ניקיון קל)',
          'חברה וביקור (שיחה, הליכה)',
          'עזרה בטכנולוגיה (טלפון, מחשב)',
          'עזרה בטפסים / ביורוקרטיה',
          'הכנת ארוחה',
          'אחר',
        ],
      },
      {
        key: 'schedule',
        type: 'schedule',
        label: 'מתי נדרש הסיוע? 📅 (תאריך ושעות מדויקים)',
      },
      {
        key: 'mobility',
        type: 'select',
        label: 'מצב הניידות של הקשיש',
        options: ['הולך באופן עצמאי', 'זקוק לעזרה בהליכה / תמיכה', 'מרותק לכיסא גלגלים', 'מרותק למיטה'],
      },
      {
        key: 'needs_transport',
        type: 'toggle',
        label: 'הקשיש צריך הסעה (יש רכב משלו או שצריך רכב של העובד)',
        showWhen: { field: 'service_type', in: ['ליווי לרופא / קופת חולים', 'ליווי לבית מרקחת / קניות'] },
      },
      {
        key: 'has_car',
        type: 'toggle',
        label: 'לקשיש יש רכב משלו',
        showWhen: { field: 'needs_transport', equals: true },
      },
      {
        key: 'cognitive_state',
        type: 'select',
        label: 'מצב קוגניטיבי (אם רלוונטי)',
        options: ['צלול ועצמאי', 'זיכרון ירוד קל', 'דמנציה / אלצהיימר', 'לא רלוונטי'],
      },
      {
        key: 'medication_reminder',
        type: 'toggle',
        label: 'נדרש תזכורת / עזרה בנטילת תרופות',
      },
      {
        key: 'language_needed',
        type: 'text',
        label: 'שפה מועדפת (אם רלוונטי)',
        placeholder: 'למשל: רוסית, רומנית, ערבית...',
      },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['service_type', 'schedule', 'mobility'],
  },

  // ── 🏋️ כושר וספורט ──────────────────────────────────────────────────────────
  fitness: {
    label: '🏋️ כושר וספורט',
    keywords: ['מאמן אישי', 'אימון', 'כושר', 'ריצה', 'יוגה', 'פילאטיס', 'חדר כושר', 'ספורט', 'אימון אישי', 'תזונה', 'אימון בבית'],
    priceRange: { min: 80, max: 200 },
    extraFields: [
      {
        key: 'training_type',
        type: 'multi',
        label: 'איזה אימון? 🏋️ (ניתן לבחור יותר מאחד)',
        options: [
          'אימון כושר כללי',
          'ריצה / הכנה לריצה',
          'יוגה',
          'פילאטיס',
          'אימון כוח / הרמת משקולות',
          'אימון בית (ללא ציוד)',
          'אימון בחדר כושר',
          'שחייה',
          'אימון תפקודי / שיקום',
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
        key: 'schedule',
        type: 'schedule',
        label: 'מתי נדרש האימון? 📅 (תאריך ושעות מדויקים)',
      },
      {
        key: 'location',
        type: 'select',
        label: 'איפה?',
        options: ['בבית', 'בפארק / בחוץ', 'בחדר כושר', 'גמיש'],
      },
      { key: 'goal', type: 'text', label: 'מטרה (לא חובה)', placeholder: 'למשל: לרדת 5 קילו, להתכונן לריצת 10K...' },
      {
        key: 'health_issues',
        type: 'textarea',
        label: 'מגבלות רפואיות / פציעות (לא חובה)',
        placeholder: 'למשל: בעיות גב, ברך פגועה, לחץ דם...',
      },
      {
        key: 'has_equipment',
        type: 'toggle',
        label: 'יש ציוד בבית (משקולות, מזרון...)',
        showWhen: { field: 'location', in: ['בבית', 'בפארק / בחוץ'] },
      },
    ],
    suggestedExtras: ['experience', 'certified'],
    chatQuestionOrder: ['training_type', 'level', 'schedule', 'location'],
  },

  // ── 📸 צילום ותוכן ──────────────────────────────────────────────────────────
  photography: {
    label: '📸 צילום ותוכן',
    keywords: ['צילום', 'צלם', 'וידאו', 'עריכה', 'תוכן', 'רילס', 'טיקטוק', 'אינסטגרם', 'פרסום', 'קמפיין', 'מוצר', 'אירוע', 'בר מצווה', 'חתונה', 'תדמית'],
    priceRange: { min: 200, max: 1500 },
    extraFields: [
      {
        key: 'content_type',
        type: 'multi',
        label: 'מה צריך? 📸 (ניתן לבחור יותר מאחד)',
        options: [
          'צילום עסק / חנות',
          'צילום מוצרים',
          'צילום אירוע (מסיבה / אירוע עסקי)',
          'צילום אישי / תדמית',
          'סרטון לרשתות (רילס / טיקטוק)',
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
      { key: 'needs_editing', type: 'toggle', label: 'צריך עריכה + תמונות/סרטונים מוגמרים' },
      {
        key: 'editing_details',
        type: 'multi',
        label: 'איזה עריכה?',
        options: ['צבע והתאמה', 'הסרת רקע', 'טקסט / כותרות', 'מוזיקה', 'כתוביות', 'קיצור ומעברים'],
        showWhen: { field: 'needs_editing', equals: true },
      },
      { key: 'needs_drone', type: 'toggle', label: 'צריך צילום רחפן' },
      {
        key: 'deliverables_count',
        type: 'number',
        label: 'כמה תמונות / סרטונים סופיים צריך?',
        placeholder: 'למשל: 20',
        showWhen: { field: 'needs_editing', equals: true },
      },
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
        type: 'multi',
        label: 'איזה תפקיד נדרש? 🎉 (ניתן לבחור יותר מאחד)',
        options: [
          'מלצר / הגשה',
          'ברמן',
          'שף / טבח',
          'הפעלת ילדים / אנימציה',
          'עזרה בהקמה / פירוק',
          'סדרן / אבטחה',
          'DJ / מוזיקה',
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
        key: 'hours',
        type: 'select',
        label: 'כמה שעות?',
        options: ['עד 3 שעות', '3–5 שעות', '5–8 שעות', 'יום מלא'],
      },
      {
        key: 'has_uniform',
        type: 'toggle',
        label: 'נדרש מדים / תלבושת אחידה',
        showWhen: { field: 'role_type', in: ['מלצר / הגשה', 'ברמן', 'שף / טבח', 'סדרן / אבטחה'] },
      },
    ],
    suggestedExtras: ['experience', 'two_people'],
    chatQuestionOrder: ['role_type', 'event_type', 'guests_count', 'hours'],
  },

  // ── 🤝 עזרה אישית ───────────────────────────────────────────────────────────
  personal_help: {
    label: '🤝 עזרה אישית',
    keywords: ['לחכות', 'לעמוד בתור', 'לאסוף', 'להחזיר', 'מסמך', 'מפתח', 'לבדוק דירה', 'לחכות לטכנאי', 'לטפל', 'שליחות', 'בירוקרטיה', 'עזרה', 'שליח אישי'],
    priceRange: { min: 50, max: 200 },
    extraFields: [
      {
        key: 'task_type',
        type: 'multi',
        label: 'מה צריך? 🤝 (ניתן לבחור יותר מאחד)',
        options: [
          'לחכות לטכנאי / שליח בבית',
          'לעמוד בתור (עיריה, רופא, דואר)',
          'לאסוף / להחזיר ילד מגן / בית ספר',
          'להעביר מפתח / מסמך',
          'להחזיר ציוד / פריט לחנות',
          'לבדוק / לצלם דירה',
          'עזרה בטפסים / ביורוקרטיה',
          'שליחות אישית',
          'אחר',
        ],
      },
      {
        key: 'schedule',
        type: 'schedule',
        label: 'מתי נדרשת העזרה? 📅 (תאריך ושעות מדויקים)',
      },
      {
        key: 'needs_vehicle',
        type: 'toggle',
        label: 'צריך רכב משל העובד',
      },
      {
        key: 'has_child',
        type: 'toggle',
        label: 'מערב ילדים (איסוף / הסעה)',
        showWhen: { field: 'task_type', in: ['לאסוף / להחזיר ילד מגן / בית ספר'] },
      },
    ],
    suggestedExtras: ['vehicle', 'experience'],
    chatQuestionOrder: ['task_type', 'schedule'],
  },

  // ── 🚗 רכב ──────────────────────────────────────────────────────────────────
  car: {
    label: '🚗 רכב',
    keywords: ['רכב', 'מכונית', 'אוטו', 'טכנאי רכב', 'מוסך', 'דיאגנוסטיקה', 'בלמים', 'שמן', 'פילטר', 'מצבר', 'גלגל', 'צמיג', 'מנוע', 'תיבת הילוכים', 'הזנקה', 'פנצר', 'התנעה', 'חשמל רכב', 'מזגן רכב', 'שמן מנוע', 'בלם'],
    priceRange: { min: 150, max: 800 },
    extraFields: [
      {
        key: 'service_type',
        type: 'multi',
        label: 'מה צריך? 🚗 (ניתן לבחור יותר מאחת)',
        options: [
          'טיפול ותחזוקה שוטפת',
          'תיקון תקלה / אבחון',
          'החלפת מצבר',
          'החלפת בלמים / רפידות',
          'החלפת שמן + פילטרים',
          'החלפת צמיגים / גלגלים',
          'בדיקת מחשב (דיאגנוסטיקה)',
          'טיפול מוסך מלא',
          'הזנקה (פנצר / כבלים)',
          'שטיפת רכב / ניקוי',
          'מזגן רכב',
          'אחר',
        ],
      },
      {
        key: 'car_issue',
        type: 'multi',
        label: 'איזו תקלה? (אם יש)',
        options: [
          'הרכב לא מתניע',
          'רעשים מהמנוע',
          'אור אזהרה דולק בלוח',
          'בלמים לא תקינים / רעש',
          'בעיית הילוכים',
          'דליפת נוזל / שמן',
          'מזגן לא עובד',
          'חשמל / אלקטרוניקה',
          'אין תקלה — טיפול שוטף',
        ],
        showWhen: { field: 'service_type', in: ['תיקון תקלה / אבחון', 'בדיקת מחשב (דיאגנוסטיקה)'] },
      },
      {
        key: 'car_brand',
        type: 'select',
        label: 'יצרן הרכב',
        options: ['טויוטה', 'מאזדה', 'הונדה', 'יונדאי', 'קיה', 'סקודה', 'פולקסווגן', 'BMW', 'מרצדס', 'אאודי', 'רנו', "פיג'ו", 'סיטרואן', 'ניסאן', 'מיצובישי', 'סובארו', 'וולבו', 'טסלה', 'פורד', 'שברולט', 'אחר'],
      },
      { key: 'car_year', type: 'number', label: 'שנתון הרכב', placeholder: 'למשל: 2018' },
      {
        key: 'car_location',
        type: 'select',
        label: 'איפה הרכב כעת?',
        options: ['בבית / ברחוב', 'במוסך', 'בצד הדרך (תקוע)', 'צריך גרירה למוסך', 'אחר'],
      },
      {
        key: 'needs_tow',
        type: 'toggle',
        label: '🚨 צריך גרירה / הובלת הרכב',
        showWhen: { field: 'car_location', in: ['בבית / ברחוב', 'בצד הדרך (תקוע)'] },
      },
      { key: 'has_parts', type: 'toggle', label: 'יש חלקי חילוף (לא צריך להביא)' },
      {
        key: 'visit_type',
        type: 'select',
        label: 'איך מועדף?',
        options: ['הטכנאי מגיע אליי', 'אני מגיע למוסך', 'גמיש'],
      },
      {
        key: 'car_notes',
        type: 'textarea',
        label: 'הערות נוספות (לא חובה)',
        placeholder: 'למשל: הרכב מתניע אבל משמיע רעש מוזר, נראה שהמצבר...',
      },
    ],
    suggestedExtras: ['experience', 'vehicle'],
    chatQuestionOrder: ['service_type', 'car_brand', 'car_location', 'visit_type'],
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
    } else if (f.type === 'schedule') {
      if (Array.isArray(v) && v.length > 0) {
        const slotsText = v.map(s => `${s.date} ${s.start}–${s.end}`).join('; ');
        lines.push(`${f.label}: ${slotsText}`);
      }
    } else if (Array.isArray(v)) {
      if (v.length > 0) lines.push(`${f.label}: ${v.join(', ')}`);
    } else {
      lines.push(`${f.label}: ${v}`);
    }
  });
  return lines.join('\n');
};