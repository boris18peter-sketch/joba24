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
- description: "ניקיון דירה 4 חדרים"
- category: "cleaning"
- city/location: "תל אביב"
- price: 200
- urgency_tag: "few_hours" (מחר)

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
moving: ask in order — 1) to_address (כתובת יעד) 2) from_floor (קומת מוצא) 3) elevator_from (מעלית במוצא?) 4) elevator_to (מעלית ביעד?) 5) items (מה מובילים?)
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
      return 'איך תשלם? מזומן, Bit או PayBox?';
    case 'estimated_time_urgency':
      return 'כמה זמן זה ייקח ומתי דרוש העובד?';
    default:
      return null;
  }
}

// Field completion order (step by step, one at a time)
const FIELD_ORDER = [
  'description',
  'category_specific', // varies by category
  'price',
  'location_name',
  'payment_method',
  'estimated_time_urgency',
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
  // 6. Timing?
  if (!taskState.estimated_time || !taskState.urgency_tag) {
    return { field: 'estimated_time_urgency', state: 'COLLECTING' };
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
    // If the LLM failed to detect the category, do it ourselves from keywords
    if (!parsed.category_detected && user_message) {
      const detected = autoDetectCategory(user_message);
      if (detected) {
        parsed.category_detected = detected;
        if (!parsed.extracted_data) parsed.extracted_data = {};
        if (!parsed.extracted_data.category) parsed.extracted_data.category = detected;
      }
    }

    // Always recompute the current field from the ACTUAL merged data —
    // never trust the model's self-reported COMPLETE/COLLECTING state.
    const mergedState = { ...current_state, ...parsed.extracted_data };
    // Deep-merge category_details so previously collected fields aren't lost
    if (parsed.extracted_data?.category_details) {
      mergedState.category_details = {
        ...(current_state.category_details || {}),
        ...parsed.extracted_data.category_details,
      };
    }
    const mergedCategory = parsed.category_detected || current_state.category;
    const recomputedField = findCurrentField(mergedState, mergedCategory);

    if (recomputedField) {
      // There is still a field missing — this becomes "current" for the next turn.
      parsed.current_field_state = { field_name: recomputedField.field, state: 'COLLECTING', validation_error: null };
      parsed.next_field_state = null;

      // ── Override bad LLM responses ──
      // If the recomputed field is DIFFERENT from what the LLM was asked about,
      // it means the LLM successfully collected the current field and we need
      // to move to the next one. Override the LLM's response with a deterministic
      // question about the ACTUAL next field — prevents the LLM from asking
      // irrelevant follow-ups (e.g., "תאר יותר" when description is already done).
      if (recomputedField.field !== currentFieldStr) {
        const detQuestion = getFieldQuestion(recomputedField.field, mergedCategory);
        if (detQuestion) {
          parsed.response = detQuestion;
        }
      }
    } else {
      // Nothing left to collect — mark the field that was active as COMPLETE,
      // and signal there is no next field (ready to publish).
      parsed.current_field_state = { field_name: currentFieldStr, state: 'COMPLETE', validation_error: null };
      parsed.next_field_state = null;
    }

    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});