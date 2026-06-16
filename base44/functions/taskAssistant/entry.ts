import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORY_CONFIG = {
  moving: {
    label: 'הובלה', emoji: '🚛',
    fields: [
      { key: 'to_address', type: 'address', label: 'כתובת יעד — לאן מובילים?' },
      { key: 'from_floor', type: 'number', label: 'קומת מוצא' },
      { key: 'to_floor', type: 'number', label: 'קומת יעד' },
      { key: 'elevator_from', type: 'toggle', label: 'יש מעלית במוצא' },
      { key: 'elevator_to', type: 'toggle', label: 'יש מעלית ביעד' },
      { key: 'needs_truck', type: 'toggle', label: 'דרושה משאית' },
      { key: 'items', type: 'text', label: 'מה מובילים?' },
    ],
  },
  delivery: {
    label: 'משלוח', emoji: '📦',
    fields: [
      { key: 'to_address', type: 'address', label: 'כתובת מסירה' },
      { key: 'item_size', type: 'select', label: 'גודל הפריט', options: ['קטן', 'בינוני', 'גדול', 'ענק'] },
    ],
  },
  cleaning: {
    label: 'ניקיון', emoji: '🧹',
    fields: [
      { key: 'rooms', type: 'number', label: 'מספר חדרים' },
      { key: 'area', type: 'number', label: 'שטח במ"ר' },
      { key: 'has_materials', type: 'toggle', label: 'יש חומרי ניקוי' },
      { key: 'cleaning_type', type: 'select', label: 'סוג ניקוי', options: ['ניקיון שוטף', 'לאחר שיפוץ', 'לפני מעבר', 'חלונות', 'שטיחים'] },
    ],
  },
  babysitting: {
    label: 'שמרטפות', emoji: '👶',
    fields: [
      { key: 'kids_count', type: 'number', label: 'כמה ילדים?' },
      { key: 'kids_ages', type: 'text', label: 'גילאי הילדים' },
      { key: 'has_pets', type: 'toggle', label: 'יש חיות מחמד' },
    ],
  },
  plumbing: {
    label: 'אינסטלציה', emoji: '🔧',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג הבעיה', options: ['נזילה', 'סתימה', 'התקנה', 'בדיקה', 'אחר'] },
      { key: 'urgency', type: 'select', label: 'דחיפות', options: ['מיידי', 'היום', 'גמיש'] },
    ],
  },
  electricity: {
    label: 'חשמל', emoji: '⚡',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['תיקון תקלה', 'התקנה', 'לוח חשמל', 'חיווט', 'בדיקה', 'אחר'] },
      { key: 'urgency', type: 'select', label: 'דחיפות', options: ['מיידי', 'היום', 'גמיש'] },
    ],
  },
  ac: {
    label: 'מזגנים', emoji: '❄️',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['התקנה', 'תיקון', 'ניקוי', 'פירוק', 'אחר'] },
      { key: 'units', type: 'number', label: 'כמה יחידות?' },
    ],
  },
  carpentry: {
    label: 'נגרות', emoji: '🪚',
    fields: [
      { key: 'issue_type', type: 'select', label: 'סוג העבודה', options: ['הרכבת רהיטים', 'תיקון', 'ייצור', 'פירוק', 'אחר'] },
    ],
  },
  painting: {
    label: 'צביעה', emoji: '🎨',
    fields: [
      { key: 'rooms', type: 'number', label: 'כמה חדרים/קירות?' },
      { key: 'area', type: 'number', label: 'שטח משוער במ"ר' },
      { key: 'has_paint', type: 'toggle', label: 'יש צבע' },
    ],
  },
  shopping: {
    label: 'קניות', emoji: '🛒',
    fields: [
      { key: 'store', type: 'text', label: 'איפה לקנות?' },
      { key: 'items', type: 'text', label: 'רשימת קניות' },
    ],
  },
};

const CATEGORIES_LIST = [
  { value: 'plumbing', label: 'אינסטלציה' },
  { value: 'electricity', label: 'חשמלאות' },
  { value: 'gardening', label: 'גינון' },
  { value: 'cleaning', label: 'ניקיון' },
  { value: 'moving', label: 'הובלה' },
  { value: 'painting', label: 'צביעה' },
  { value: 'carpentry', label: 'נגרות' },
  { value: 'ac', label: 'מזגנים' },
  { value: 'locksmith', label: 'מנעולן' },
  { value: 'shopping', label: 'קניות' },
  { value: 'delivery', label: 'משלוח' },
  { value: 'babysitting', label: 'בייביסיטר' },
  { value: 'tutoring', label: 'שיעורים פרטיים' },
  { value: 'it_support', label: 'מחשבים' },
  { value: 'other', label: 'אחר' },
];

const PAYMENT_METHODS = ['Cash', 'Bit', 'PayBox', 'Other'];
const TIME_OPTIONS = ['15m', '30m', '1h', '2h', '3h', '4h', '6h', 'day', 'week', 'custom'];
const URGENCY_TAGS = [
  { value: 'immediate', label: 'צריך עובד דחוף' },
  { value: 'few_hours', label: 'עובד לשעות הקרובות' },
  { value: 'evening', label: 'עובד לקראת הערב' },
  { value: 'flexible', label: 'לא לחוץ בזמן' },
];

function buildSystemPrompt() {
  const catConfigStr = Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
    const fields = cfg.fields.map(f => {
      if (f.type === 'select') return `  - ${f.label} (${f.type}, options: ${f.options.join(', ')})`;
      return `  - ${f.label} (${f.type})`;
    }).join('\n');
    return `**${cfg.emoji} ${cfg.label}** (${key}):\n${fields}`;
  }).join('\n\n');

  const categoriesStr = CATEGORIES_LIST.map(c => `${c.value} = ${c.label}`).join(', ');

  return `אתה עוזר אישי חכם לפלטפורמת Joba24 לפרסום משימות. המשימה שלך: לעזור למשתמש לפרסם משימה דרך שיחה טבעית בעברית.

## שדות חובה (חייבים לאסוף לפני פרסום):
1. **title** — כותרת קצרה (מה צריך לעשות)
2. **description** — תיאור מפורט של המשימה
3. **price** — מחיר בשקלים (מספר בלבד, ללא סימן ₪)
4. **location_name** — כתובת מלאה (רחוב, מספר, עיר)
5. **payment_method** — אמצעי תשלום: Cash, Bit, PayBox, Other

## קטגוריות אפשריות:
${categoriesStr}

## שדות אופציונליים (הצע רק אחרי שכל שדות החובה מולאו):
- **category** — אחת מהקטגוריות למעלה
- **estimated_time** — זמן ביצוע משוער: ${TIME_OPTIONS.join(', ')}
- **urgency_tag** — דחיפות: ${URGENCY_TAGS.map(t => t.value + '=' + t.label).join(', ')}
- **expiry_duration_hours** — תוקף המשימה בשעות (null = ללא תוקף)
- **auto_bump_enabled** — העלאת מחיר אוטומטית (true/false)
- **max_price** — מחיר מקסימלי להעלאה אוטומטית (רלוונטי רק אם auto_bump_enabled=true)
- **is_story** — פרסום כ-Story לחשיפה מוגברת (עולה 10 קרדיטים)
- **requires_invoice** — דורש חשבונית מס (true/false)
- **address_building, address_floor, address_apartment, address_notes** — פרטי כתובת נוספים

## שאלות לפי קטגוריה (רק כשהקטגוריה ידועה):
${catConfigStr}

## סגנון שיחה:
- דבר בעברית טבעית, ידידותית ויעילה
- הייה תמציתי — אל תציף את המשתמש ביותר מדי שאלות בבת אחת
- אחרי כל הודעה של המשתמש, חלץ את כל המידע שאתה יכול לזהות
- אם חסרים שדות חובה, שאל עליהם באופן טבעי — שאלה אחת או שתיים בכל פעם
- כשכל שדות החובה מולאו, הצע בקצרה 1-2 פיצ'רים אופציונליים רלוונטיים (סטורי, העלאת מחיר אוטומטית)
- לעולם אל תמציא ערכים — אם אתה לא בטוח, שאל
- אם המשתמש לא בטוח לגבי מחיר, תן טווח מחירים סביר לפי סוג המשימה
- אם אתה מזהה קטגוריה, עדכן את השדה category ב-extractedData
- זהה כתובות גם אם המשתמש כותב אותן בשפה חופשית (למשל "ברחוב הרצל 10 בתל אביב")
- עבור location_name, שמור את הכתובת כמו שהמשתמש כתב אותה

## פורמט תשובה:
החזר JSON בפורמט המדויק הבא:
{
  "assistantMessage": "ההודעה שלך למשתמש בעברית",
  "extractedDataJson": "{\\"title\\":\\"הכותרת\\",\\"price\\":150}",
  "missingMandatoryFields": ["price"],
  "suggestedFeatures": ["סטורי"],
  "isReadyToPublish": false
}

הערות:
- extractedDataJson הוא מחרוזת JSON תקינה — כל השדות שזיהית, כמחרוזת JSON
- missingMandatoryFields מכיל רק שדות חובה שעדיין חסרים (title, description, price, location_name, payment_method)
- suggestedFeatures — ריק אם עדיין חסרים שדות חובה, אחרת הצע 1-2 פיצ'רים רלוונטיים
- isReadyToPublish — true רק כשכל חמשת שדות החובה מולאו`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messages = [], currentData = {} } = body;

    const systemPrompt = buildSystemPrompt();

    // Build conversation for LLM
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    // Add current extracted data as context
    if (Object.keys(currentData).length > 0) {
      conversationMessages.push({
        role: 'system',
        content: `המידע שכבר נאסף עד כה (JSON): ${JSON.stringify(currentData, null, 2)}`,
      });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: conversationMessages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      response_json_schema: {
        type: 'object',
        properties: {
          assistantMessage: { type: 'string' },
          extractedDataJson: { type: 'string', description: 'JSON string of all extracted fields from the conversation' },
          missingMandatoryFields: { type: 'array', items: { type: 'string' } },
          suggestedFeatures: { type: 'array', items: { type: 'string' } },
          isReadyToPublish: { type: 'boolean' },
        },
        required: ['assistantMessage', 'extractedDataJson', 'missingMandatoryFields', 'suggestedFeatures', 'isReadyToPublish'],
      },
    });

    // Parse extractedDataJson back to object for easier frontend use
    let extractedData = {};
    try {
      extractedData = typeof result.extractedDataJson === 'string' ? JSON.parse(result.extractedDataJson) : (result.extractedDataJson || {});
    } catch (_) {
      extractedData = {};
    }

    return Response.json({
      assistantMessage: result.assistantMessage,
      extractedData,
      missingMandatoryFields: result.missingMandatoryFields || [],
      suggestedFeatures: result.suggestedFeatures || [],
      isReadyToPublish: result.isReadyToPublish || false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});