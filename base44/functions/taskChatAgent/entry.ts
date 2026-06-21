import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are Joba24's Task Publishing AI. You are NOT a chatbot. You are NOT customer support. You are NOT a conversational assistant.

YOUR ONLY PURPOSE: Collect all required task fields as fast as possible and publish the task.

## CORE RULES — NEVER BREAK THESE
1. Every single response MUST move the task closer to publication. Nothing else.
2. Never say "I understand", "Great!", "That sounds interesting", "I'm here to help" or any filler.
3. Never ask a question about a field already filled in current_state.
4. Never ask more than ONE question at a time.
5. Keep responses 1-2 sentences MAX unless it's the final summary.
6. Auto-generate the title from the description — NEVER ask for it.
7. Auto-detect category from keywords — NEVER ask for it.
8. Default payment_method = "Cash" silently if user never specifies — do NOT ask unless other fields are done.

## CONVERSATION STATE MACHINE
CRITICAL: Only collect ONE field at a time. Never jump ahead.

Field states:
- EMPTY: not yet asked
- COLLECTING: actively collecting (keep asking same field until valid)
- VALIDATING: checking if valid
- COMPLETE: field successfully collected

Rules:
- current_field_state tells you which field to collect
- Only ask about current_field_state.field_name
- Do NOT ask about any other field until current_field is COMPLETE
- If validation fails: respond with error + retry current field
- If validation succeeds: set field_state to COMPLETE, return next_field to collect
- Never queue multiple questions ahead

## EXTRACTION RULES
Extract as much as possible from every single message. A message like "צריך מישהו לנקות דירה 4 חדרים בתל אביב מחר ב-200 שקל" extracts:
- description: "ניקיון דירה 4 חדרים" (the user's ACTUAL request — what they need help with)
- category: "cleaning" (detected separately, NEVER used as description)
- city/location: "תל אביב"
- price: 200
- urgency_tag: "few_hours" (מחר)

CRITICAL — DESCRIPTION RULES:
- description MUST be the user's actual request text — what they need help with.
- NEVER use the category name (אינסטלציה, ניקיון, חשמלאות, הובלה, צביעה, etc.) as the description.
- Example: user says "סתימה באסלה בשירותים" → description: "תיקון סתימה באסלה בשירותים", category: "plumbing"
- WRONG: description: "אינסטלציה" ← this is the category, NOT the description!
- title = short 2-5 word summary of the actual task, derived from description.
- Example: description "תיקון סתימה באסלה בשירותים" → title: "תיקון סתימה באסלה"
- NEVER use the category name as the title.

## STRUCTURED DATA — NOT WORD COUNT
CRITICAL: NEVER evaluate description quality by length or word count.
NEVER say "תאר ביותר פירוט", "תוסיף עוד מילים", "תיאור ארוך יותר", "describe in more detail".
A description is COMPLETE the moment you can extract: what needs to be done + category.
Example: "צריך טרמפ מתל אביב לאילת היום ב-13:00" is FULLY sufficient — extract category, origin, destination, time. Do NOT ask for more text.
Only ask a question when a STRUCTURED FIELD is actually missing (price, location, payment, etc).
Goal: collect DATA, not words.

## REQUIRED FIELDS ORDER
Collect in this order. Skip any already in current_state.
Step 1: description (extract what needs to be done — sufficient once intent + category are clear)
Step 2: category-specific fields (see below) — ask ONE question per turn
Step 3: price
Step 4: location_name (must be a real address, not just a city)
Step 5: payment_method (Cash / Bit / PayBox)
Step 6: estimated_time + urgency_tag (combine into one turn)
Step 7: requirements (optional — show card, let user pick)
Step 8: features (Story / AutoBump) — show when all mandatory done
Step 9: PUBLISH

## CATEGORY-SPECIFIC QUESTIONS (ask ONLY these, in order, after description)
CRITICAL: Extract category-specific answers into extracted_data.category_details object using these EXACT field keys:
moving: ask in order — 1) items (מה מובילים? — השאלה הכי חשובה, תמיד ראשונה!) 2) to_address (כתובת יעד)
delivery: 1) to_address (כתובת מסירה) 2) item_size (גודל החבילה)
cleaning: 1) rooms (מספר חדרים) 2) cleaning_type (סוג ניקוי: שוטף/אחרי שיפוץ/לפני מעבר/חלונות/שטיחים) 3) has_materials (יש חומרי ניקוי?)
plumbing: 1) issue_type (נזילה/סתימה/התקנת ברז/הרחבת צנרת/בדיקה/אחר) — also set urgency_tag from answer
electricity: 1) issue_type (תיקון תקלה/התקנת שקע/לוח חשמל/חיווט/בדיקה/אחר) 2) urgency (מיידי/היום/גמיש)
ac: 1) issue_type (התקנה/תיקון/ניקוי/פירוק/אחר) 2) units (כמה יחידות?)
painting: 1) rooms (כמה חדרים/קירות) 2) area (שטח במ"ר) 3) has_paint (יש צבע?)
carpentry: 1) issue_type (הרכבת רהיטים/תיקון/ייצור/פירוק/אחר)
locksmith: 1) issue_type (פריצה/החלפת מנעול/התקנת מנעול/כספת/שכפול מפתח/אחר)
shopping: 1) store (איפה לקנות) 2) items (רשימת קניות)
babysitting: 1) kids_count (כמה ילדים) 2) kids_ages (גילאי הילדים) 3) has_pets (יש חיות מחמד?)
tutoring: 1) subject (איזה מקצוע) 2) grade_level (יסודי/חטיבת ביניים/תיכון/בגרויות/אקדמיה/אחר) 3) session_duration (45 דקות/שעה/שעה וחצי/2 שעות)
it_support: 1) issue_type (מחשב איטי/וירוס/בעיית רשת/התקנת תוכנה/גיבוי/אחר) 2) device_type (מחשב נייח/לפטופ/טאבלט/סמארטפון/מספר מכשירים)
gardening: 1) garden_type (גינה פרטית/גינת בניין/מרפסת/שטח ציבורי) 2) work_type (גיזום/כיסוח דשא/עישוב/השקיה/פינוי פסולת/תכנון גינה)
other: skip category-specific, go straight to price

## EDIT MODE
If current_state contains an existing task (isEditMode=true or current_state has title+description+price already set):
- The user is EDITING an existing task, not creating a new one.
- current_state already reflects their published task — do NOT re-ask about fields that already have values.
- Only update fields the user EXPLICITLY mentions changing.
- If user says "שנה את המחיר ל-300" → only update price, leave everything else as-is.
- If user says "ערוך את הכתובת" → show address input, only update location.
- Do NOT ask about fields that already have a value unless the user says to change them.
- Start by acknowledging what they want to change, then make the change and confirm.

## SHOW_QUICK_REPLIES — CRITICAL
Always return quick_replies for these situations:
- After detecting category → suggest price range: ["{min}", "{mid}", "{max}", "אחר"]
- Asking urgency: ["עכשיו 🔥", "היום", "מחר", "גמיש"]
- Asking estimated_time: ["15 דקות", "שעה", "2 שעות", "יום שלם"]
- Asking payment: ["מזומן", "Bit", "PayBox"]
- Asking cleaning type: ["שוטף", "אחרי שיפוץ", "לפני מעבר", "חלונות"]
- Asking AC: ["התקנה", "תיקון", "ניקוי"]
- Asking plumbing issue: ["נזילה", "סתימה", "התקנה", "אחר"]
- Before publish: ["✅ פרסם עכשיו", "ערוך פרטים"]

## PRICE SUGGESTIONS BY CATEGORY
Use when asking about price:
cleaning: 150-400 | plumbing: 200-600 | electricity: 200-500 | moving: 300-800 | painting: 300-1000 | ac: 300-700 | carpentry: 200-600 | delivery: 80-200 | shopping: 60-150 | babysitting: 50-120 (per hour) | tutoring: 80-150 (per hour) | it_support: 150-400 | gardening: 200-500 | locksmith: 200-500 | other: 100-500

## COMPLETENESS SCORE
description filled: +20%
price filled: +15%
location_name filled: +15%
payment_method filled: +10%
category not 'other': +10%
estimated_time filled: +10%
category-specific fields filled (category_details.to_address for moving/delivery, category_details.rooms for cleaning, etc): +10%
urgency_tag filled: +5%
images or video: +5%

## MARKETPLACE INSIGHTS (only when publish_ready=true)
Estimate workers based on category:
plumbing:45 electricity:38 cleaning:62 moving:28 painting:22 gardening:18 ac:34 carpentry:20 locksmith:15 delivery:55 shopping:12 babysitting:30 tutoring:25 it_support:40 other:50
Return as marketplace_insight string, e.g: "👥 45 אינסטלטורים פעילים · 20 באזורך"

## FINAL SUMMARY FORMAT (when publish_ready=true)
Return 4-line Hebrew summary as "summary" field:
Line 1: 📋 Task title in bold
Line 2: 📍 Location
Line 3: 💰 Price + Payment method
Line 4: ⚡ Urgency

## RESPONSE JSON FORMAT — ALWAYS VALID JSON:
{
  "response": "Hebrew message — max 2 sentences, no filler, direct and actionable",
  "extracted_data": { "field": "value" },
  "category_detected": "plumbing",
  "missing_mandatory": ["price", "location_name"],
  "all_mandatory_filled": false,
  "publish_ready": false,
  "show_requirements": false,
  "show_features": false,
  "show_address_input": null,
  "next_question": "...",
  "completeness_pct": 35,
  "marketplace_insight": null,
  "summary": null,
  "media_suggested": false,
  "quick_replies": [],
  "current_field_state": { "field_name": "location_name", "state": "COLLECTING", "validation_error": null },
  "next_field_state": { "field_name": "price", "state": "EMPTY" }
}

## FIELD RULES
- extracted_data: include EVERY field extractable from this message. price is always a number. Never include empty values.
- category_detected: detect from Hebrew keywords. Map: אינסטלטור/נזילה/סתימה/ברז→plumbing, חשמל/שקע/מפסק→electricity, ניקיון/לנקות→cleaning, הובלה/להעביר/מעבר דירה→moving, צבע/לצבוע→painting, נגר/ארון/מדף/רהיט→carpentry, מזגן/מיזוג→ac, מנעולן/מפתח/פריצה→locksmith, גינה/גינון→gardening, משלוח/שליחות→delivery, קניות/סופרמרקט→shopping, שמרטף/בייביסיטר→babysitting, שיעורים/מורה→tutoring, מחשב/תוכנה/חומרה→it_support
- show_requirements: true when all mandatory + timing + category-specific done. NEVER before.
- show_features: true when show_requirements was shown OR user explicitly skipped requirements.
- show_address_input: {"type":"origin","label":"📍 כתובת המשימה"} when location empty | {"type":"destination","label":"📍 כתובת יעד"} for moving/delivery without category_details.to_address | null otherwise
- publish_ready: description + price + location_name + payment_method + category filled. category_details.to_address required for moving/delivery.
- quick_replies: array of short button labels the user can tap as shortcuts. Max 4 items. Empty array if no obvious shortcuts.
- summary: 4-line Hebrew summary ONLY when publish_ready=true
- media_suggested: true after you suggest photos (moving/plumbing/electricity/painting/carpentry/ac/locksmith). Don't suggest twice.

## CRITICAL — WHAT NOT TO DO
- NEVER say "אשמח לעזור", "נשמע מעולה", "מבין", "רק רגע"
- NEVER ask "מה השם שלך"
- NEVER ask "מה הקטגוריה"
- NEVER ask "מה כותרת המשימה"
- NEVER repeat a question from previous turns
- NEVER ask two questions at once
- If user says "לא יודע" on price → suggest a range based on category
- If user is vague → ask ONE clarifying question about the most important missing field`;

// ── Server-side category detection (keyword matching) ──
// Same keywords as frontend — ensures category is ALWAYS detected correctly
const CATEGORY_KEYWORDS = {
  plumbing: ['סתימה', 'נזילה', 'אינסטלטור', 'ברז', 'צנרת', 'שירותים', 'כיור', 'מים', 'צנרת', 'ביוב'],
  electricity: ['חשמל', 'שקע', 'מפסק', 'תקלה', 'לוח', 'חיווט', 'דוד', 'מתחשמל', 'קצר'],
  cleaning: ['ניקיון', 'לנקות', 'נקי', 'אבק', 'שטיח', 'שוטף', 'אחרי שיפוץ', 'לפני מעבר'],
  moving: ['הובלה', 'להעביר', 'מעבר דירה', 'הובלות', 'מוביל', 'ארגזים', 'הובלת'],
  painting: ['צבע', 'לצבוע', 'צביעה', 'קיר', 'צבעי'],
  carpentry: ['נגר', 'ארון', 'מדף', 'רהיט', 'מטבח', 'נגרות', 'הרכבת רהיט'],
  ac: ['מזגן', 'מיזוג', 'מזגנים', 'מזגנ'],
  locksmith: ['מנעולן', 'מפתח', 'פריצה', 'מנעול', 'כספת', 'שכפול'],
  gardening: ['גינה', 'גינון', 'דשא', 'גיזום', 'עישוב', 'צמחים'],
  delivery: ['משלוח', 'שליחות', 'לשלוח', 'חבילה', 'שליח'],
  shopping: ['קניות', 'סופרמרקט', 'קניון', 'לקנות', 'סופר'],
  babysitting: ['שמרטף', 'בייביסיטר', 'ילדים', 'תינוק', 'שמרטף'],
  tutoring: ['שיעורים', 'מורה', 'לימודים', 'בגרות', 'שיעור'],
  it_support: ['מחשב', 'תוכנה', 'חומרה', 'וירוס', 'לפטופ', 'מחשב נייד', 'רשת'],
};

function autoDetectCategory(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  let bestCat = null;
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }
  return bestScore >= 1 ? bestCat : null;
}

// ── Deterministic question generator for each field ──
// Used to override LLM responses when the LLM asks about the wrong field
function getFieldQuestion(field, category) {
  switch (field) {
    case 'description':
      return 'מה צריך לעשות? 🚀 תאר בכמה מילים ואני אדאג לכל השאר.';
    case 'category_details.items':
      return 'מה מובילים? 📦';
    case 'category_details.to_address':
      if (category === 'moving') return 'לאן מובילים? 📍 מה כתובת היעד?';
      if (category === 'delivery') return 'לאן לשלוח? 📍 מה כתובת המסירה?';
      return 'מה כתובת היעד? 📍';
    case 'category_details.rooms':
      return 'כמה חדרים מדובר?';
    case 'category_details.issue_type':
      if (category === 'plumbing') return 'איזה סוג תיקון? נזילה, סתימה, התקנה או אחר?';
      if (category === 'electricity') return 'איזה סוג תקלה? תיקון, התקנת שקע, לוח חשמל או אחר?';
      if (category === 'ac') return 'איזה סוג עבודה? התקנה, תיקון, ניקוי או אחר?';
      if (category === 'carpentry') return 'איזה סוג עבודה? הרכבת רהיטים, תיקון, ייצור או אחר?';
      if (category === 'locksmith') return 'איזה סוג עבודה? פריצה, החלפת מנעול, התקנה או אחר?';
      if (category === 'it_support') return 'איזה סוג תקלה? מחשב איטי, וירוס, בעיית רשת או אחר?';
      return 'איזה סוג עבודה?';
    case 'category_details.store':
      return 'מאיפה לקנות? איזו חנות/סופרמרקט?';
    case 'category_details.kids_count':
      return 'כמה ילדים?';
    case 'category_details.subject':
      return 'איזה מקצוע?';
    case 'category_details.garden_type':
      return 'איזה סוג גינה? פרטית, גינת בניין, מרפסת?';
    case 'price':
      return 'כמה תרצה לשלם? 💰';
    case 'location_name':
      return 'איפה המשימה? 📍 שתף את הכתובת';
    case 'payment_method':
      return 'איך תשלם? 💳';
    case 'urgency_tag':
      return 'מתי דרוש העובד? ⏰';
    case 'estimated_time':
      return 'כמה זמן זה ייקח? ⏱️';
    case 'expiry_duration_hours':
      return 'תוקף המשימה? ⏰';
    default:
      return null;
  }
}

// ── Price ranges by category (for suggestions only — NEVER reject a valid price) ──
const PRICE_RANGES = {
  cleaning: [150, 400], plumbing: [200, 600], electricity: [200, 500],
  moving: [300, 800], painting: [300, 1000], ac: [300, 700],
  carpentry: [200, 600], delivery: [80, 200], shopping: [60, 150],
  babysitting: [50, 120], tutoring: [80, 150], it_support: [150, 400],
  gardening: [200, 500], locksmith: [200, 500], other: [100, 500],
};

// ── Deterministic quick replies based on current field ──
function getQuickReplies(field, category) {
  const range = PRICE_RANGES[category] || PRICE_RANGES.other;
  switch (field) {
    case 'price':
      return [String(range[0]), String(Math.round((range[0] + range[1]) / 2)), String(range[1]), 'אחר'];
    case 'urgency_tag':
      return ['עכשיו 🔥', 'היום', 'מחר', 'גמיש'];
    case 'estimated_time':
      return ['15 דקות', 'חצי שעה', 'שעה', '2 שעות'];
    case 'payment_method':
      return ['מזומן', 'Bit', 'PayBox', 'אחר'];
    case 'category_details.issue_type':
      if (category === 'plumbing') return ['נזילה', 'סתימה', 'התקנה', 'אחר'];
      if (category === 'electricity') return ['תיקון', 'התקנת שקע', 'לוח חשמל', 'אחר'];
      if (category === 'ac') return ['התקנה', 'תיקון', 'ניקוי', 'אחר'];
      if (category === 'carpentry') return ['הרכבה', 'תיקון', 'ייצור', 'אחר'];
      if (category === 'locksmith') return ['פריצה', 'החלפת מנעול', 'שכפול', 'אחר'];
      if (category === 'it_support') return ['מחשב איטי', 'וירוס', 'רשת', 'אחר'];
      return [];
    case 'category_details.rooms':
      return ['1', '2', '3', '4+'];
    case 'expiry_duration_hours':
      return ['שעה', '4 שעות', 'יום', 'ללא תוקף'];
    default:
      return [];
  }
}

// ── Server-side extraction helpers ──
function extractPrice(text) {
  if (!text) return null;
  const match = text.match(/\b(\d{2,5})\b/);
  if (match) {
    const price = parseInt(match[1]);
    if (price > 0 && price < 50000) return price;
  }
  return null;
}

function extractUrgencyAndTime(text) {
  if (!text) return {};
  const result = {};
  const lower = text.toLowerCase();
  if (lower.includes('עכשיו') || lower.includes('דחוף') || lower.includes('מיידי') || lower.includes('🔥')) result.urgency_tag = 'immediate';
  else if (lower.includes('היום') || lower.includes('שעות הקרובות')) result.urgency_tag = 'few_hours';
  else if (lower.includes('ערב') || lower.includes('לערב')) result.urgency_tag = 'evening';
  else if (lower.includes('גמיש') || lower.includes('לא לחוץ') || lower.includes('לא דחוף')) result.urgency_tag = 'flexible';

  if (lower.includes('15 דק') || lower.includes('רבע שעה')) result.estimated_time = '15m';
  else if (lower.includes('חצי שעה') || lower.includes('30 דק')) result.estimated_time = '30m';
  else if (lower.includes('שעה') && !lower.includes('שעתיים') && !lower.includes('2 שעות')) result.estimated_time = '1h';
  else if (lower.includes('שעתיים') || lower.includes('2 שעות')) result.estimated_time = '2h';
  return result;
}

function extractExpiry(text) {
  if (!text) return undefined;
  const msg = text.trim();
  if (msg === 'שעה' || msg === '1 שעה') return 1;
  if (msg === '4 שעות') return 4;
  if (msg === '2 שעות') return 2;
  if (msg === 'יום' || msg === '24 שעות') return 24;
  if (msg === 'ללא תוקף' || msg === 'בלי תוקף' || msg === 'ללא') return null;
  const m = msg.match(/(\d+(?:\.\d+)?)\s*(שעה|שעות|דק|דקות|יום|ימים|שבוע)?/);
  if (m) {
    let val = parseFloat(m[1]);
    const unit = m[2];
    if (unit === 'יום' || unit === 'ימים') val *= 24;
    else if (unit === 'שבוע') val *= 168;
    else if (unit === 'דק' || unit === 'דקות') val /= 60;
    if (val > 0) return val;
  }
  return undefined;
}

// ── Generate a clean, short title from the description ──
// Truncates at ~40 chars at a word boundary, never mid-word
function generateTitle(description) {
  if (!description) return 'משימה חדשה';
  if (description.length <= 40) return description;
  const truncated = description.substring(0, 40);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 15) return truncated.substring(0, lastSpace);
  return truncated;
}

// Field completion order (step by step, one at a time)
const FIELD_ORDER = [
  'description',
  'category_specific', // varies by category
  'price',
  'location_name',
  'payment_method',
  'urgency_tag',
  'estimated_time',
  'requirements',
  'media',
  'features',
];

// Determine which field is currently missing and should be collected.
// NOTE: We evaluate structured DATA presence — never text length / word count.
function findCurrentField(taskState, category) {
  // 1. Description present? (any non-empty description with a detected category is enough)
  if (!taskState.description || !taskState.description.trim()) {
    return { field: 'description', state: 'COLLECTING' };
  }
  // 2. Category-specific (varies) — only ask if the structured field is truly missing
  const cd = taskState.category_details || {};
  if (!category || category === 'other') {
    // no category-specific for 'other'
  } else if (category === 'moving') {
    if (!cd.items) return { field: 'category_details.items', state: 'COLLECTING' };
    if (!cd.to_address) return { field: 'category_details.to_address', state: 'COLLECTING' };
  } else if (category === 'delivery') {
    if (!cd.to_address) return { field: 'category_details.to_address', state: 'COLLECTING' };
  } else if (category === 'cleaning') {
    if (!cd.rooms) return { field: 'category_details.rooms', state: 'COLLECTING' };
  } else if (category === 'plumbing' || category === 'electricity' || category === 'ac' ||
             category === 'carpentry' || category === 'locksmith' || category === 'it_support') {
    if (!cd.issue_type) return { field: 'category_details.issue_type', state: 'COLLECTING' };
  } else if (category === 'painting') {
    if (!cd.rooms) return { field: 'category_details.rooms', state: 'COLLECTING' };
  } else if (category === 'shopping') {
    if (!cd.store) return { field: 'category_details.store', state: 'COLLECTING' };
  } else if (category === 'babysitting') {
    if (!cd.kids_count) return { field: 'category_details.kids_count', state: 'COLLECTING' };
  } else if (category === 'tutoring') {
    if (!cd.subject) return { field: 'category_details.subject', state: 'COLLECTING' };
  } else if (category === 'gardening') {
    if (!cd.garden_type) return { field: 'category_details.garden_type', state: 'COLLECTING' };
  }
  // 3. Price?
  if (!taskState.price || taskState.price <= 0) {
    return { field: 'price', state: 'COLLECTING' };
  }
  // 4. Location?
  if (!taskState.location_name) {
    return { field: 'location_name', state: 'COLLECTING' };
  }
  // 5. Payment method?
  if (!taskState.payment_method) {
    return { field: 'payment_method', state: 'COLLECTING' };
  }
  // 6. When is the worker needed?
  if (!taskState.urgency_tag) {
    return { field: 'urgency_tag', state: 'COLLECTING' };
  }
  // 7. How long will it take?
  if (!taskState.estimated_time) {
    return { field: 'estimated_time', state: 'COLLECTING' };
  }
  // 7. Expiry?
  if (taskState.expiry_duration_hours === undefined) {
    return { field: 'expiry_duration_hours', state: 'COLLECTING' };
  }
  // All mandatory done
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { current_state, user_message, conversation_history, current_field_state } = await req.json();

    const stateJson = current_state ? JSON.stringify(current_state, null, 2) : '{}';
    const currentField = findCurrentField(current_state, current_state.category);
    const currentFieldStr = current_field_state?.field_name || currentField?.field || 'none';

    // Build conversation array for LLM
    const historyLines = (conversation_history || []).slice(-10).map(m =>
      `${m.role === 'agent' ? 'assistant' : 'user'}: ${m.content}`
    ).join('\n\n');

    const prompt = `${SYSTEM_PROMPT}

---
CURRENT TASK STATE (already collected — do NOT ask about these again):
${stateJson}

CURRENT FIELD BEING COLLECTED:
${currentFieldStr}

STAY FOCUSED: Only ask about "${currentFieldStr}" until it is COMPLETE.
Do NOT ask about other fields.
Do NOT move forward until this field is valid.

CONVERSATION SO FAR:
${historyLines}

USER MESSAGE: ${user_message}

---
Return ONLY valid JSON, no markdown, no backticks, no extra text:
{"response":"...","extracted_data":{},"category_detected":null,"missing_mandatory":[],"all_mandatory_filled":false,"publish_ready":false,"show_requirements":false,"show_features":false,"show_address_input":null,"next_question":"","completeness_pct":0,"marketplace_insight":null,"summary":null,"media_suggested":false,"quick_replies":[],"current_field_state":{"field_name":"${currentFieldStr}","state":"COLLECTING","validation_error":null},"next_field_state":null}`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });

    let parsed;
    if (typeof result === 'string') {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || result.match(/(\{[\s\S]*\})/);
      try {
        parsed = jsonMatch ? JSON.parse((jsonMatch[1] || jsonMatch[0]).trim()) : JSON.parse(result.trim());
      } catch {
        parsed = {
          response: result,
          extracted_data: {}, missing_mandatory: [], all_mandatory_filled: false,
          category_detected: null, next_question: null, publish_ready: false,
          show_requirements: false, show_features: false, show_address_input: null,
          completeness_pct: 0, marketplace_insight: null, summary: null,
          media_suggested: false, quick_replies: [],
          current_field_state: { field_name: currentFieldStr, state: 'COLLECTING', validation_error: null },
          next_field_state: null,
        };
      }
    } else {
      parsed = result;
      if (!parsed.quick_replies) parsed.quick_replies = [];
      if (!parsed.current_field_state) parsed.current_field_state = { field_name: currentFieldStr, state: 'COLLECTING', validation_error: null };
    }

    // ── Server-side category detection fallback ──
    if (!parsed.category_detected && user_message) {
      const detected = autoDetectCategory(user_message);
      if (detected) {
        parsed.category_detected = detected;
        if (!parsed.extracted_data) parsed.extracted_data = {};
        if (!parsed.extracted_data.category) parsed.extracted_data.category = detected;
      }
    }

    // ── Server-side description extraction ──
    // Category labels (without emojis) — NEVER allowed as description or title
    const CATEGORY_LABELS = ['אינסטלציה', 'חשמלאות', 'גינון', 'ניקיון', 'הובלה', 'צביעה', 'נגרות', 'מזגנים', 'מנעולן', 'קניות', 'משלוח', 'בייביסיטר', 'שיעורים פרטיים', 'מחשבים', 'אחר'];

    // If description is empty and we're collecting it, use the user's message directly
    if (!current_state.description && !parsed.extracted_data?.description && user_message && currentFieldStr === 'description') {
      const cleanMsg = user_message.replace(/\n\[(.*?)\]/g, '').trim(); // remove media annotations
      if (cleanMsg.length >= 3) {
        if (!parsed.extracted_data) parsed.extracted_data = {};
        parsed.extracted_data.description = cleanMsg;
      }
    }

    // ── Prevent category names from being used as description or title ──
    if (parsed.extracted_data?.description && CATEGORY_LABELS.includes(parsed.extracted_data.description.trim())) {
      // LLM used category name as description — override with user's original message
      const cleanMsg = user_message?.replace(/\n\[(.*?)\]/g, '').trim();
      if (cleanMsg && cleanMsg.length >= 3) {
        parsed.extracted_data.description = cleanMsg;
      }
    }
    if (parsed.extracted_data?.title && CATEGORY_LABELS.includes(parsed.extracted_data.title.trim())) {
      delete parsed.extracted_data.title;
    }

    // ── Server-side issue_type extraction for plumbing/electricity/etc ──
    if (currentFieldStr === 'category_details.issue_type' && user_message) {
      const msg = user_message.trim();
      const issueMap = {
        'נזילה': 'נזילה', 'סתימה': 'סתימה', 'התקנה': 'התקנה', 'התקנת': 'התקנה',
        'תיקון': 'תיקון', 'פריצה': 'פריצה', 'וירוס': 'וירוס', 'מחשב איטי': 'מחשב איטי',
      };
      for (const [key, val] of Object.entries(issueMap)) {
        if (msg.includes(key)) {
          if (!parsed.extracted_data) parsed.extracted_data = {};
          if (!parsed.extracted_data.category_details) parsed.extracted_data.category_details = {};
          parsed.extracted_data.category_details.issue_type = val;
          break;
        }
      }
    }

    // ── Server-side price extraction (accept ANY positive number) ──
    if (currentFieldStr === 'price' && user_message) {
      const price = extractPrice(user_message);
      if (price && !parsed.extracted_data?.price) {
        if (!parsed.extracted_data) parsed.extracted_data = {};
        parsed.extracted_data.price = price;
      }
    }

    // ── Server-side items extraction for moving ──
    if (currentFieldStr === 'category_details.items' && user_message) {
      const cleanMsg = user_message.replace(/\n\[(.*?)\]/g, '').trim();
      if (cleanMsg.length >= 2) {
        if (!parsed.extracted_data) parsed.extracted_data = {};
        if (!parsed.extracted_data.category_details) parsed.extracted_data.category_details = {};
        parsed.extracted_data.category_details.items = cleanMsg;
      }
    }

    // ── Server-side urgency extraction ──
    if (currentFieldStr === 'urgency_tag' && user_message) {
      const timing = extractUrgencyAndTime(user_message);
      if (timing.urgency_tag) {
        if (!parsed.extracted_data) parsed.extracted_data = {};
        parsed.extracted_data.urgency_tag = timing.urgency_tag;
      }
    }

    // ── Server-side estimated_time extraction ──
    if (currentFieldStr === 'estimated_time' && user_message) {
      const timing = extractUrgencyAndTime(user_message);
      if (timing.estimated_time) {
        if (!parsed.extracted_data) parsed.extracted_data = {};
        parsed.extracted_data.estimated_time = timing.estimated_time;
      }
    }

    // ── Server-side expiry extraction ──
    if (currentFieldStr === 'expiry_duration_hours' && user_message) {
      const expiry = extractExpiry(user_message);
      if (expiry !== undefined) {
        if (!parsed.extracted_data) parsed.extracted_data = {};
        parsed.extracted_data.expiry_duration_hours = expiry;
      }
    }

    // ── Merge state (deep-merge category_details) ──
    const mergedState = { ...current_state, ...parsed.extracted_data };
    if (parsed.extracted_data?.category_details) {
      mergedState.category_details = {
        ...(current_state.category_details || {}),
        ...parsed.extracted_data.category_details,
      };
    }
    const mergedCategory = parsed.category_detected || current_state.category;

    // ── Auto-generate title from description ──
    if (!mergedState.title && mergedState.description) {
      const title = generateTitle(mergedState.description);
      mergedState.title = title;
      if (!parsed.extracted_data) parsed.extracted_data = {};
      parsed.extracted_data.title = title;
    }

    // ── Recompute current field from ACTUAL merged data ──
    const recomputedField = findCurrentField(mergedState, mergedCategory);

    // ── FULLY DETERMINISTIC FLOW CONTROL ──
    // The LLM is used ONLY for extraction. The backend controls all flow.
    if (recomputedField) {
      // Still collecting mandatory fields
      parsed.current_field_state = { field_name: recomputedField.field, state: 'COLLECTING', validation_error: null };
      parsed.next_field_state = null;
      parsed.publish_ready = false;
      parsed.all_mandatory_filled = false;
      parsed.show_requirements = false;
      parsed.show_features = false;

      // Override response with deterministic question
      const detQuestion = getFieldQuestion(recomputedField.field, mergedCategory);
      if (detQuestion) {
        parsed.response = detQuestion;
      }

      // Server-side quick replies
      parsed.quick_replies = getQuickReplies(recomputedField.field, mergedCategory);

      // Server-side address input
      if (recomputedField.field === 'location_name') {
        parsed.show_address_input = { type: 'origin', label: '📍 כתובת המשימה' };
      } else if (recomputedField.field === 'category_details.to_address') {
        parsed.show_address_input = { type: 'destination', label: '📍 כתובת יעד' };
      } else {
        parsed.show_address_input = null;
      }

      // Server-side media suggestion (when transitioning to price, after category-specific)
      if (recomputedField.field === 'price' && !current_state.media_suggested) {
        const mediaCats = ['plumbing', 'electricity', 'moving', 'painting', 'carpentry', 'ac', 'locksmith'];
        if (mediaCats.includes(mergedCategory)) {
          parsed.media_suggested = true;
          if (!parsed.extracted_data) parsed.extracted_data = {};
          parsed.extracted_data.media_suggested = true;
          parsed.response += '\n\n💡 רוצה לצרף תמונות? לחץ על אייקון המצלמה — זה יעזור לעובד להבין את הבעיה.';
        }
      }

    } else {
      // All mandatory fields done — transition: requirements → features → publish
      parsed.current_field_state = { field_name: 'complete', state: 'COMPLETE', validation_error: null };
      parsed.next_field_state = null;
      parsed.all_mandatory_filled = true;

      const flowStage = current_state.flow_stage;

      if (!flowStage || flowStage === 'collecting') {
        // Just finished mandatory — show requirements
        parsed.show_requirements = true;
        parsed.show_features = false;
        parsed.publish_ready = false;
        parsed.response = 'כל הפרטים החיוניים הושלמו! 🎉\nרוצה להוסיף דרישות מהעובד? (אופציונלי)';
        parsed.quick_replies = [];
      } else if (flowStage === 'requirements') {
        // Requirements done — show features
        parsed.show_requirements = false;
        parsed.show_features = true;
        parsed.publish_ready = false;
        parsed.response = 'מעולה! 🚀\nרוצה להעלות את המשימה כ-Story או להפעיל העלאת מחיר אוטומטית?';
        parsed.quick_replies = [];
      } else if (flowStage === 'features') {
        // Features done — ready to publish
        parsed.show_requirements = false;
        parsed.show_features = false;
        parsed.publish_ready = true;

        // Generate summary
        const urgencyLabel = mergedState.urgency_tag === 'immediate' ? 'דחוף 🔥'
          : mergedState.urgency_tag === 'few_hours' ? 'שעות קרובות'
          : mergedState.urgency_tag === 'evening' ? 'ערב'
          : 'גמיש';
        parsed.summary = [
          '📋 ' + (mergedState.title || 'משימה'),
          '📍 ' + (mergedState.location_name || 'לא צוין'),
          '💰 ₪' + mergedState.price + ' · ' + (mergedState.payment_method || 'מזומן'),
          '⚡ ' + urgencyLabel,
        ].join('\n');
        parsed.response = 'הכל מוכן! ✅\nלחץ על "פרסם משימה" כדי לפרסם לפיד.';
        parsed.quick_replies = ['ערוך מחיר', 'ערוך כתובת', 'ערוך תיאור'];
      }
    }

    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});