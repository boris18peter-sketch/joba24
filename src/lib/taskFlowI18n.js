/**
 * taskFlowI18n.js — Translation overlay for taskFlowConfig.js
 *
 * taskFlowConfig stores field labels, options, and placeholders as Hebrew strings.
 * These Hebrew strings are the CANONICAL stored values (in task.category_details)
 * and are used in showWhen conditions. This module provides a DISPLAY-ONLY translation
 * layer: given a Hebrew string + language, returns the translated string, or falls
 * back to the Hebrew original if no translation exists.
 *
 * Usage:
 *   import { tTaskFlow } from '@/lib/taskFlowI18n';
 *   tTaskFlow('מה הבעיה? 🔧', 'en')  // → "What is the problem? 🔧"
 *   tTaskFlow('מה הבעיה? 🔧', 'he')  // → "מה הבעיה? 🔧" (Hebrew original)
 */

// ── English translations (primary LTR language) ──
const en = {
  // ── Category labels ──
  '🔧 אינסטלציה': '🔧 Plumbing',
  '⚡ חשמלאות': '⚡ Electricity',
  '🌿 גינון': '🌿 Gardening',
  '🧹 ניקיון': '🧹 Cleaning',
  '🚛 הובלה': '🚛 Moving',
  '🎨 צביעה': '🎨 Painting',
  '🪵 נגרות': '🪵 Carpentry',
  '❄️ מזגנים': '❄️ AC',
  '🔐 מנעולן': '🔐 Locksmith',
  '🛒 קניות': '🛒 Shopping',
  '📦 משלוח': '📦 Delivery',
  '👶 בייביסיטר': '👶 Babysitting',
  '📚 שיעורים פרטיים': '📚 Tutoring',
  '💻 מחשבים': '💻 IT Support',
  '🔨 הנדימן / תיקונים': '🔨 Handyman',
  '💪 עזרה פיזית': '💪 Heavy Lifting',
  '🏠 תחזוקת בית': '🏠 Home Maintenance',
  '🚗 הסעות וטרמפים': '🚗 Transportation',
  '🐶 בעלי חיים': '🐶 Pets',
  '👵 סיוע לקשישים': '👵 Elderly Care',
  '🏋️ כושר וספורט': '🏋️ Fitness',
  '📸 צילום ותוכן': '📸 Photography',
  '🎉 אירועים': '🎉 Events',
  '🤝 עזרה אישית': '🤝 Personal Help',
  '🚗 רכב': '🚗 Car',
  '📋 אחר': '📋 Other',

  // ── Field labels — Plumbing ──
  'מה הבעיה? 🔧 (ניתן לבחור יותר מאחת)': 'What is the problem? 🔧 (select multiple)',
  'איפה בבית? (ניתן לבחור כמה)': 'Where in the house? (select multiple)',
  '🚨 יש זרימת מים פעילה עכשיו (נזק מתרחש)': '🚨 Active water flow right now (damage occurring)',
  'יודע איפה ברז המים הראשי': 'Knows where the main water valve is',

  // ── Field labels — Electricity ──
  'מה צריך? ⚡ (ניתן לבחור יותר מאחת)': 'What do you need? ⚡ (select multiple)',
  '🚨 אין חשמל עכשיו בכל הבית / בחלקו': '🚨 No electricity right now in the whole house / partially',
  'אילו חדרים מושפעים?': 'Which rooms are affected?',
  'לוח החשמל מעודכן ובעל היתר': 'Electrical panel is updated and certified',

  // ── Field labels — Gardening ──
  'מה צריך לעשות? 🌿 (ניתן לבחור יותר מאחת)': 'What needs to be done? 🌿 (select multiple)',
  'גודל הגינה': 'Garden size',
  'איזה סוג גינה?': 'What type of garden?',
  'צריך לפנות פסולת / ענפים': 'Need to dispose of waste / branches',
  'יש ציוד בבית (מקצרה, מסור, גזם...)': 'Have equipment at home (mower, saw, pruner...)',
  'חד-פעמי או טיפול שוטף?': 'One-time or ongoing care?',

  // ── Field labels — Cleaning ──
  'איזה סוג ניקיון? 🧹 (ניתן לבחור יותר מאחת)': 'What type of cleaning? 🧹 (select multiple)',
  'מה מנקים?': 'What are we cleaning?',
  'כמה חדרים? (לא כולל מטבח ושירותים)': 'How many rooms? (excluding kitchen and bathroom)',
  'כמה חדרי אמבטיה / שירותים?': 'How many bathrooms / toilets?',
  'יש חומרי ניקוי בבית': 'Have cleaning supplies at home',
  'יש ציוד (שואב אבק, מגב...)': 'Have equipment (vacuum, mop...)',
  'חד-פעמי או קבוע?': 'One-time or regular?',
  'מתי להגיע? 📅': 'When to arrive? 📅',

  // ── Field labels — Moving ──
  'כתובת יעד — לאן מובילים? *': 'Destination address — where to? *',
  'מה מובילים?': 'What are we moving?',
  'קומה במוצא': 'Floor at origin',
  'קומה ביעד': 'Floor at destination',
  'יש מעלית במוצא': 'Elevator at origin',
  'יש מעלית ביעד': 'Elevator at destination',
  'איזה רכב צריך?': 'What vehicle is needed?',
  'צריך עזרה באריזה': 'Need packing help',
  'צריך לפרק ולהרכיב רהיטים': 'Need to disassemble and assemble furniture',
  'תיאור הפריטים (לא חובה)': 'Item description (optional)',

  // ── Field labels — Painting ──
  'מה צריך לצבוע? (ניתן לבחור יותר מאחד)': 'What needs painting? (select multiple)',
  'כמה חדרים / קירות?': 'How many rooms / walls?',
  'שטח משוער (מ"ר)': 'Estimated area (m²)',
  'יש צבע (לא צריך להביא)': 'Have paint (no need to bring)',
  'צריך הכנה — טיח / גבס / סתימת סדקים': 'Need prep work — plaster / drywall / crack filling',
  'מצב הקירות': 'Wall condition',
  'איזה הכנה צריך?': 'What prep is needed?',

  // ── Field labels — Carpentry ──
  'מה צריך? 🪵 (ניתן לבחור יותר מאחת)': 'What do you need? 🪵 (select multiple)',
  'כמה פריטים?': 'How many items?',
  'מותג הריהוט (אם רלוונטי)': 'Furniture brand (if relevant)',
  'יש כלים בבית (מקדחה, פטיש...)': 'Have tools at home (drill, hammer...)',
  'יש הוראות הרכבה / שרטוט': 'Have assembly instructions / drawing',

  // ── Field labels — AC ──
  'מה צריך? ❄️': 'What do you need? ❄️',
  'כמה יחידות?': 'How many units?',
  'סוג מזגן': 'AC type',
  'גיל המזגן': 'AC age',
  'צריך הרכבה על הקיר (תליית יחידה פנימית)': 'Need wall mounting (indoor unit)',
  'גישה ליחידה החיצונית': 'Access to outdoor unit',

  // ── Field labels — Locksmith ──
  'מה הבעיה? 🔐': 'What is the problem? 🔐',
  '🚨 ננעלתי בחוץ כרגע — זה דחוף מאוד': '🚨 Locked out right now — very urgent',
  'סוג הדלת': 'Door type',
  'סוג המנעול (אם ידוע)': 'Lock type (if known)',

  // ── Field labels — Shopping ──
  'מה קונים? 🛒 (ניתן לבחור יותר מאחד)': 'What are we buying? 🛒 (select multiple)',
  'שם החנות / מיקום': 'Store name / location',
  'תקציב הקנייה (₪) משוער': 'Estimated shopping budget (₪)',
  'רשימת קניות': 'Shopping list',
  'צריך להביא קבלה': 'Need to bring a receipt',
  'איך נשלם על הקנייה?': 'How do we pay for the shopping?',

  // ── Field labels — Delivery ──
  'כתובת מסירה — לאן? *': 'Delivery address — where to? *',
  'מה מוסרים?': 'What are we delivering?',
  'מתי צריך להגיע?': 'When does it need to arrive?',
  'שם המקבל (לא חובה)': 'Recipient name (optional)',
  'טלפון המקבל (לא חובה)': 'Recipient phone (optional)',
  'שביר — יש לטפל בזהירות': 'Fragile — handle with care',
  'צריך שמירה על קור (קירור)': 'Need cold chain (refrigeration)',

  // ── Field labels — Babysitting ──
  'כמה ילדים?': 'How many children?',
  'גילאי הילדים': 'Children\'s ages',
  'מתי נדרשת הבייביסיטר? 📅 (תאריך ושעות מדויקים)': 'When is the babysitter needed? 📅 (exact date and hours)',
  'איפה?': 'Where?',
  'מה נדרש לעשות? (ניתן לבחור כמה)': 'What needs to be done? (select multiple)',
  'צרכים מיוחדים / אלרגיות / מידע חשוב': 'Special needs / allergies / important info',
  'יש חיות מחמד בבית': 'Have pets at home',
  'פרטי חיות המחמד': 'Pet details',
  'נדרש ניסיון בעזרה ראשונה / החייאה': 'First aid / CPR experience required',
  'מעשנים בבית': 'Smoking at home',

  // ── Field labels — Tutoring ──
  'איזה מקצוע? 📚': 'What subject? 📚',
  'כיתה / רמה': 'Grade / level',
  'מתי נדרש השיעור? 📅 (תאריך ושעות מדויקים)': 'When is the lesson needed? 📅 (exact date and hours)',
  'פרונטלי או אונליין?': 'In-person or online?',
  'מטרה / תיאור (לא חובה)': 'Goal / description (optional)',
  'יש לקות למידה / ADHD (נדרשת התאמה)': 'Learning disability / ADHD (accommodation needed)',

  // ── Field labels — IT Support ──
  'מה הבעיה? 💻 (ניתן לבחור יותר מאחת)': 'What is the problem? 💻 (select multiple)',
  'איזה מכשיר?': 'Which device?',
  'מערכת הפעלה (אם ידוע)': 'Operating system (if known)',
  'איך מועדף?': 'How is it preferred?',
  '⚠️ יש נתונים חשובים שעלולים לאבד': '⚠️ Important data at risk of loss',

  // ── Field labels — Handyman ──
  'מה צריך לעשות? 🔨 (ניתן לבחור יותר מאחת)': 'What needs to be done? 🔨 (select multiple)',
  'סוג הקיר (אם רלוונטי)': 'Wall type (if relevant)',
  'כמה עבודות / פריטים?': 'How many jobs / items?',

  // ── Field labels — Heavy Lifting ──
  'מה צריך? 💪': 'What do you need? 💪',
  'מה מזיזים?': 'What are we moving?',
  'משקל משוער לפריט': 'Estimated weight per item',
  'קומה (אם רלוונטי)': 'Floor (if relevant)',
  'כמה עוזרים צריך?': 'How many helpers needed?',

  // ── Field labels — Home Maintenance ──
  'מה צריך? 🏠 (ניתן לבחור יותר מאחת)': 'What do you need? 🏠 (select multiple)',
  'גודל השטח / היקף העבודה': 'Area size / scope of work',
  'צריך לפנות / להשליך ציוד': 'Need to dispose / discard equipment',
  'מה מפנים?': 'What are we disposing?',

  // ── Field labels — Transportation ──
  'איזה סוג נסיעה? 🚗': 'What type of ride? 🚗',
  'לאן נוסעים? *': 'Where to? *',
  'כמה נוסעים?': 'How many passengers?',
  'יש כבודה גדולה / מזוודות': 'Have large luggage / suitcases',
  'כמה מזוודות?': 'How many suitcases?',
  'צריך כיסא בטיחות לילד': 'Need child safety seat',
  'כמה כיסאות בטיחות?': 'How many safety seats?',

  // ── Field labels — Pets ──
  'מה צריך? 🐶': 'What do you need? 🐶',
  'איזה חיה?': 'Which animal?',
  'גודל הכלב': 'Dog size',
  'גזע הכלב (אם ידוע)': 'Dog breed (if known)',
  'גיל הכלב': 'Dog age',
  'אופי הכלב — ניתן לבחור כמה': 'Dog temperament — select multiple',
  'הכלב מסתדר עם כלבים אחרים?': 'Does the dog get along with other dogs?',
  'מחוסן ומעודכן': 'Vaccinated and up to date',
  'מסורס / מעוקר': 'Neutered / spayed',
  'בית עם ילדים': 'Home with children',
  'בית עם חתולים': 'Home with cats',
  'חתול ביתי (לא יוצא החוצה)': 'Indoor cat (doesn\'t go outside)',
  'צריך החלפת חול / ניקוי ארגז': 'Need litter change / box cleaning',
  'מתי נדרש השירות? 📅 (תאריך ושעות מדויקים)': 'When is the service needed? 📅 (exact date and hours)',
  'הוראות האכלה / תרופות': 'Feeding / medication instructions',
  'צרכים מיוחדים / מצב רפואי': 'Special needs / medical condition',
  'העובד יקבל מפתח לבית': 'Worker will receive house key',

  // ── Field labels — Elderly Care ──
  'מה צריך? 👵 (ניתן לבחור יותר מאחת)': 'What do you need? 👵 (select multiple)',
  'מתי נדרש הסיוע? 📅 (תאריך ושעות מדויקים)': 'When is assistance needed? 📅 (exact date and hours)',
  'מצב הניידות של הקשיש': 'Elderly person\'s mobility status',
  'הקשיש צריך הסעה (יש רכב משלו או שצריך רכב של העובד)': 'Elderly needs transport (has own car or needs worker\'s car)',
  'לקשיש יש רכב משלו': 'Elderly has own car',
  'מצב קוגניטיבי (אם רלוונטי)': 'Cognitive state (if relevant)',
  'נדרש תזכורת / עזרה בנטילת תרופות': 'Medication reminder / assistance required',
  'שפה מועדפת (אם רלוונטי)': 'Preferred language (if relevant)',

  // ── Field labels — Fitness ──
  'איזה אימון? 🏋️ (ניתן לבחור יותר מאחד)': 'What training? 🏋️ (select multiple)',
  'רמת הכושר שלך': 'Your fitness level',
  'מתי נדרש האימון? 📅 (תאריך ושעות מדויקים)': 'When is training needed? 📅 (exact date and hours)',
  'מטרה (לא חובה)': 'Goal (optional)',
  'מגבלות רפואיות / פציעות (לא חובה)': 'Medical limitations / injuries (optional)',
  'יש ציוד בבית (משקולות, מזרון...)': 'Have equipment at home (weights, mat...)',

  // ── Field labels — Photography ──
  'מה צריך? 📸 (ניתן לבחור יותר מאחד)': 'What do you need? 📸 (select multiple)',
  'כמה זמן?': 'How long?',
  'צריך עריכה + תמונות/סרטונים מוגמרים': 'Need editing + finished photos/videos',
  'איזה עריכה?': 'What kind of editing?',
  'צריך צילום רחפן': 'Need drone photography',
  'כמה תמונות / סרטונים סופיים צריך?': 'How many final photos / videos needed?',

  // ── Field labels — Events ──
  'איזה תפקיד נדרש? 🎉 (ניתן לבחור יותר מאחד)': 'What role is needed? 🎉 (select multiple)',
  'סוג האירוע': 'Event type',
  'כמה אורחים?': 'How many guests?',
  'כמה שעות?': 'How many hours?',
  'נדרש מדים / תלבושת אחידה': 'Uniform / dress code required',

  // ── Field labels — Personal Help ──
  'מה צריך? 🤝 (ניתן לבחור יותר מאחד)': 'What do you need? 🤝 (select multiple)',
  'מתי נדרשת העזרה? 📅 (תאריך ושעות מדויקים)': 'When is help needed? 📅 (exact date and hours)',
  'צריך רכב משל העובד': 'Need worker\'s own vehicle',
  'מערב ילדים (איסוף / הסעה)': 'Involves children (pickup / transport)',

  // ── Field labels — Car ──
  'מה צריך? 🚗 (ניתן לבחור יותר מאחת)': 'What do you need? 🚗 (select multiple)',
  'איזו תקלה? (אם יש)': 'What issue? (if any)',
  'יצרן הרכב': 'Car manufacturer',
  'שנתון הרכב': 'Car year',
  'איפה הרכב כעת?': 'Where is the car now?',
  '🚨 צריך גרירה / הובלת הרכב': '🚨 Need towing / car transport',
  'יש חלקי חילוף (לא צריך להביא)': 'Have spare parts (no need to bring)',
  'הערות נוספות (לא חובה)': 'Additional notes (optional)',

  // ── Options — Plumbing ──
  'נזילה ממקור מסוים': 'Leak from a specific source',
  'סתימה בכיור / אמבטיה / שירותים': 'Clog in sink / bathtub / toilet',
  'החלפת ברז': 'Faucet replacement',
  'אסלה שלא מפסיקה לזרום': 'Toilet that won\'t stop running',
  'דוד שמש / בוילר': 'Solar water heater / boiler',
  'התקנת מכשיר חדש (מדיח, מכונת כביסה)': 'New appliance installation (dishwasher, washing machine)',
  'ריח / ביוב עולה': 'Sewage smell / backing up',
  'בדיקה כללית': 'General inspection',
  'מטבח': 'Kitchen',
  'חדר אמבטיה': 'Bathroom',
  'שירותים': 'Toilet',
  'מרפסת': 'Balcony',
  'מחוץ לבית': 'Outside the house',

  // ── Options — Electricity ──
  'שקע / מפסק לא עובד': 'Outlet / switch not working',
  'נפילת חשמל (מפסק קפץ)': 'Power outage (breaker tripped)',
  'התקנת שקע חדש': 'New outlet installation',
  'החלפת נורה / גוף תאורה': 'Bulb / light fixture replacement',
  'בדיקת לוח חשמל': 'Electrical panel inspection',
  'חיווט לחדר / מקום חדש': 'Wiring for room / new space',
  'התקנת מאוורר תקרה': 'Ceiling fan installation',
  'חיווט לדוד / למזגן': 'Wiring for boiler / AC',
  'סלון': 'Living room',
  'חדר שינה': 'Bedroom',
  'כל הבית': 'Whole house',

  // ── Options — Gardening ──
  'כיסוח דשא': 'Lawn mowing',
  'גיזום עצים / שיחים': 'Tree / shrub pruning',
  'עישוב (ניכוש עשבים)': 'Weeding',
  'ניקוי וסידור הגינה': 'Garden cleaning and organizing',
  'פינוי ענפים / גזם': 'Branch / debris removal',
  'שתילה / הקמת ערוגה': 'Planting / creating a bed',
  'תכנון והקמת גינה חדשה': 'New garden design and setup',
  'תיקון מערכת השקיה': 'Irrigation system repair',
  'קטנה — עד 20 מ"ר': 'Small — up to 20 m²',
  'בינונית — 20–60 מ"ר': 'Medium — 20–60 m²',
  'גדולה — 60–150 מ"ר': 'Large — 60–150 m²',
  'גדולה מאוד — מעל 150 מ"ר': 'Very large — over 150 m²',
  'גינה פרטית בבית': 'Private home garden',
  'גינת בניין משותף': 'Shared building garden',
  'מרפסת / גג': 'Balcony / roof',
  'שטח ציבורי / עסקי': 'Public / commercial space',
  'חד-פעמי': 'One-time',
  'שבועי': 'Weekly',
  'דו-שבועי': 'Bi-weekly',
  'חודשי': 'Monthly',

  // ── Options — Cleaning ──
  'ניקיון שוטף (שבועי / דו-שבועי)': 'Regular cleaning (weekly / bi-weekly)',
  'ניקוי עומק (אחת לחודש)': 'Deep cleaning (monthly)',
  'ניקיון לפני / אחרי מעבר דירה': 'Pre / post move cleaning',
  'ניקיון לאחר שיפוץ': 'Post-renovation cleaning',
  'ניקוי חלונות': 'Window cleaning',
  'ניקוי שטיחים / ריפוד': 'Carpet / upholstery cleaning',
  'ניקוי מטבח / תנור': 'Kitchen / oven cleaning',
  'ניקוי משרד / עסק': 'Office / business cleaning',
  'דירה': 'Apartment',
  'בית פרטי': 'Private house',
  'משרד': 'Office',
  'מחסן / חדר': 'Storage / room',

  // ── Options — Moving ──
  'מעבר דירה מלא': 'Full apartment move',
  'כמה פריטים / ארגזים': 'A few items / boxes',
  'רהיט בודד (ספה, מיטה, ארון)': 'Single furniture (sofa, bed, closet)',
  'ציוד / מכשיר גדול': 'Equipment / large appliance',
  'טנדר / סטיישן מספיק': 'Pickup / station wagon is enough',
  'ואן בינוני': 'Medium van',
  'משאית קטנה': 'Small truck',
  'משאית גדולה': 'Large truck',
  'לא בטוח': 'Not sure',

  // ── Options — Painting ──
  'קירות פנים (חדר / דירה)': 'Interior walls (room / apartment)',
  'תקרה': 'Ceiling',
  'קירות חוץ': 'Exterior walls',
  'גדר / קיר חיצוני': 'Fence / exterior wall',
  'דלת / חלון': 'Door / window',
  'ריהוט עץ': 'Wood furniture',
  'מדרגות': 'Stairs',
  'חדש — רק צבע': 'New — just paint',
  'תקין — צריך שכבה': 'OK — needs a coat',
  'דורש תיקון קל': 'Needs minor repair',
  'דורש שיפוץ מקדים': 'Needs prior renovation',
  'טיח / מריחת גבס': 'Plaster / drywall',
  'סתימת סדקים': 'Crack filling',
  'הסרת טפט ישן': 'Old wallpaper removal',
  'שיוף קיר ישן': 'Old wall sanding',
  'תיקון רטיבות': 'Moisture repair',

  // ── Options — Carpentry ──
  'הרכבת ריהוט מקופסה (IKEA וכד\')': 'Boxed furniture assembly (IKEA etc.)',
  'תיקון / חיזוק רהיט שבור': 'Broken furniture repair / reinforcement',
  'בניית מדף / ארון מותאם': 'Custom shelf / closet building',
  'החלפת / תיקון דלת': 'Door replacement / repair',
  'התקנת מטבח / ארונות': 'Kitchen / cabinet installation',
  'עבודת עץ מותאמת אישית': 'Custom woodworking',
  'פירוק רהיטים': 'Furniture disassembly',
  'פריט אחד': 'One item',
  '2–3 פריטים': '2–3 items',
  '4–6 פריטים': '4–6 items',
  'יותר מ-6': 'More than 6',
  'הום סנטר': 'Home Center',
  'אייס': 'Ace',
  'לא רלוונטי': 'Not relevant',

  // ── Options — AC ──
  'התקנת מזגן חדש': 'New AC installation',
  'פירוק מזגן': 'AC removal',
  'ניקוי / שירות שנתי': 'Cleaning / annual service',
  'מזגן לא מקרר / לא מחמם': 'AC not cooling / not heating',
  'מזגן מטפטף מים': 'AC leaking water',
  'מזגן לא נדלק': 'AC won\'t turn on',
  'רעש / רטיט במזגן': 'Noise / vibration in AC',
  'מפוצל (split)': 'Split',
  'נייד': 'Portable',
  'מיני מרכזי': 'Mini central',
  'מרכזי / תעלות': 'Central / ducted',
  'לא יודע': 'Don\'t know',
  'חדש (עד שנתיים)': 'New (up to 2 years)',
  'מעל 7 שנים': 'Over 7 years',
  'מרפסת / גג נגיש': 'Accessible balcony / roof',
  'צריך סולם': 'Needs a ladder',
  'צריך בניין / סנפלינג': 'Needs scaffolding / rappelling',

  // ── Options — Locksmith ──
  '🚨 ננעלתי בחוץ — פריצת מנעול': '🚨 Locked out — lock picking',
  'החלפת מנעול': 'Lock replacement',
  'התקנת מנעול חדש / חיזוק': 'New lock installation / reinforcement',
  'שכפול מפתח': 'Key duplication',
  'תיקון / ידית דלת': 'Door handle repair / replacement',
  'כספת — פתיחה / התקנה': 'Safe — opening / installation',
  'צילינדר חסום / מפתח שבור בפנים': 'Blocked cylinder / broken key inside',
  'דלת דירה': 'Apartment door',
  'דלת בית פרטי': 'Private house door',
  'דלת מחסן / חניה': 'Storage / garage door',
  'דלת משרד': 'Office door',
  'מכונית': 'Car',
  'צילינדר רגיל': 'Standard cylinder',
  'מולטילוק': 'Mul-T-Lock',
  'מנעול חכם / קוד': 'Smart lock / code',
  'בריח': 'Deadbolt',

  // ── Options — Shopping ──
  'מזון (סופר / מכולת)': 'Food (supermarket / grocery)',
  'תרופות / בית מרקחת': 'Pharmacy / medication',
  'פירות וירקות (שוק)': 'Fruits and vegetables (market)',
  'ציוד / חנות ספציפית': 'Equipment / specific store',
  'אלכוהול': 'Alcohol',
  'קניות כלליות — יסופק רשימה': 'General shopping — list will be provided',
  'מזומן בחזרה': 'Cash back',
  'העברה בביט': 'Bit transfer',
  'אשראי': 'Credit card',

  // ── Options — Delivery ──
  'מסמכים / מעטפה': 'Documents / envelope',
  'חבילה קטנה (כמו נעליים)': 'Small package (like shoes)',
  'חבילה בינונית (כמו מזוודה)': 'Medium package (like a suitcase)',
  'חבילה גדולה / כבדה': 'Large / heavy package',
  'אוכל / מזון': 'Food',
  'תרופות': 'Medication',
  '🔴 מיידי — תוך שעה': '🔴 Immediate — within an hour',
  'היום עד שעה מסוימת': 'Today by a specific time',
  'היום — גמיש': 'Today — flexible',
  'מחר': 'Tomorrow',
  'גמיש לחלוטין': 'Fully flexible',

  // ── Options — Babysitting ──
  'בבית שלנו': 'At our home',
  'בבית הבייביסיטר': 'At the babysitter\'s home',
  'גמיש': 'Flexible',
  'שמירה בלבד': 'Supervision only',
  'הכנת ארוחה': 'Meal preparation',
  'השכבה לשינה': 'Bedtime',
  'עזרה בשיעורים': 'Homework help',
  'אמבטיה': 'Bath',
  'הסעה / איסוף מגן': 'Transport / pickup from daycare',
  'משחק ופעילות': 'Play and activities',

  // ── Options — Tutoring ──
  'כיתה א-ו (יסודי)': 'Grades 1-6 (elementary)',
  'כיתה ז-ט (חטיבה)': 'Grades 7-9 (middle school)',
  'כיתה י-יב (תיכון)': 'Grades 10-12 (high school)',
  'הכנה לבגרות': 'Bagrut (matriculation) prep',
  'אקדמיה / אוניברסיטה': 'Academy / university',
  'מבוגר': 'Adult',
  'פרונטלי — בבית': 'In-person — at home',
  'פרונטלי — אצל המורה': 'In-person — at teacher\'s',
  'זום / אונליין': 'Zoom / online',

  // ── Options — IT Support ──
  'מחשב איטי מאוד': 'Very slow computer',
  'מחשב לא נדלק': 'Computer won\'t turn on',
  'וירוס / תוכנה זדונית': 'Virus / malware',
  'בעיית אינטרנט / WiFi': 'Internet / WiFi issue',
  'התקנת תוכנה / Windows': 'Software / Windows installation',
  'גיבוי נתונים / שחזור': 'Data backup / recovery',
  'בעיית מסך / מקלדת / עכבר': 'Screen / keyboard / mouse issue',
  'הגדרת אימייל / חשבון': 'Email / account setup',
  'התקנת מדפסת': 'Printer installation',
  'מחשב נייח': 'Desktop computer',
  'לפטופ (נייד)': 'Laptop',
  'טאבלט': 'Tablet',
  'סמארטפון': 'Smartphone',
  'ראוטר / רשת': 'Router / network',
  'מדפסת': 'Printer',
  'כמה מכשירים': 'Multiple devices',
  'ביקור בית / עסק': 'Home / business visit',
  'מרחוק (remote)': 'Remote',

  // ── Options — Handyman ──
  'תליית טלוויזיה על קיר': 'Wall-mounting TV',
  'תליית מדף / תמונה': 'Hanging shelf / picture',
  'התקנת וילון / בלינד': 'Curtain / blind installation',
  'החלפת ידית / מנגנון': 'Handle / mechanism replacement',
  'תיקון ריהוט שבור': 'Broken furniture repair',
  'הרכבת ריהוט מקופסה': 'Boxed furniture assembly',
  'איטום / גבס קטן': 'Sealing / small drywall',
  'התקנת מנורה / גוף תאורה': 'Light fixture installation',
  'תיקון דלת / ציר': 'Door / hinge repair',
  'בטון / בלוק': 'Concrete / block',
  'גבס': 'Drywall',
  'עבודה אחת': 'One job',
  '2–3 עבודות': '2–3 jobs',
  '4 ומעלה': '4 and up',

  // ── Options — Heavy Lifting ──
  'להעלות / להוריד פריט כבד': 'Lift / lower heavy item',
  'לסחוב ארגזים / קרטונים': 'Carry boxes / cartons',
  'פריקת משאית / ואן': 'Unloading truck / van',
  'עזרה בהזזת ריהוט בתוך הבית': 'Help moving furniture within the house',
  'עזרה במעבר דירה (ללא נהג)': 'Help with moving (no driver)',
  'טעינת פריטים לרכב': 'Loading items into vehicle',
  'עד 15 ק"ג': 'Up to 15 kg',
  '15–30 ק"ג': '15–30 kg',
  '30–60 ק"ג': '30–60 kg',
  'מעל 60 ק"ג': 'Over 60 kg',
  'ארגזים רבים': 'Many boxes',
  'קרקע': 'Ground floor',
  'קומה 1': 'Floor 1',
  'קומה 2': 'Floor 2',
  'קומה 3+': 'Floor 3+',
  'יש מעלית': 'Has elevator',
  'אחד מספיק': 'One is enough',
  'שניים': 'Two',
  'שלושה ומעלה': 'Three and up',

  // ── Options — Home Maintenance ──
  'ניקוי / פינוי מחסן': 'Storage cleaning / clearing',
  'סידור וארגון מחסן': 'Storage organizing',
  'ניקוי מרזבים / גג': 'Gutter / roof cleaning',
  'פינוי פסולת / ריהוט ישן': 'Waste / old furniture disposal',
  'ניקוי מרפסת / חצר': 'Balcony / yard cleaning',
  'ארגון בית כללי': 'General home organizing',
  'תיקונים קטנים בבית': 'Small home repairs',
  'קטן — עד שעה': 'Small — up to an hour',
  'בינוני — 2–3 שעות': 'Medium — 2–3 hours',
  'גדול — חצי יום': 'Large — half day',
  'גדול מאוד — יום שלם': 'Very large — full day',
  'ריהוט ישן': 'Old furniture',
  'פסולת בניין': 'Construction waste',
  'קרטונים': 'Cardboard boxes',
  'גזם / ענפים': 'Prunings / branches',
  'ציוד חשמלי': 'Electrical equipment',
  'אשפה כללית': 'General waste',

  // ── Options — Transportation ──
  'נסיעה לשדה התעופה / ממנו': 'Airport ride',
  'הסעה לאירוע': 'Event transport',
  'הסעת ילדים (גן / בית ספר / חוגים)': 'Children transport (school / activities)',
  'טרמפ לעבודה / עיר אחרת': 'Ride to work / another city',
  'נהג פרטי לכמה שעות': 'Private driver for a few hours',
  'נסיעה לבית חולים / קופת חולים': 'Hospital / clinic ride',
  'הסעת קשיש': 'Elderly transport',
  '1': '1', '2': '2', '3': '3', '4': '4', '5+': '5+',
  '1–2': '1–2', '3–4': '3–4',

  // ── Options — Pets ──
  'טיול עם הכלב': 'Dog walking',
  'שמירה / פנסיון בבית המטפל': 'Boarding at caregiver\'s home',
  'ביקור יומי (האכלה / השקיה / טיול קצר)': 'Daily visit (feeding / watering / short walk)',
  'הסעה לוטרינר / טיפוח': 'Vet / grooming transport',
  'אילוף / אימון': 'Training',
  'טיפוח / גזיזה / אמבטיה': 'Grooming / trimming / bath',
  'כלב': 'Dog',
  'חתול': 'Cat',
  'ארנב / מכרסם': 'Rabbit / rodent',
  'ציפור': 'Bird',
  'זוחל': 'Reptile',
  'דגים': 'Fish',
  'כמה חיות': 'Multiple animals',
  'קטן — עד 10 ק"ג': 'Small — up to 10 kg',
  'בינוני — 10–25 ק"ג': 'Medium — 10–25 kg',
  'גדול — 25–45 ק"ג': 'Large — 25–45 kg',
  'ענק — מעל 45 ק"ג': 'Giant — over 45 kg',
  'גור (עד שנה)': 'Puppy (up to 1 year)',
  'צעיר (1–3 שנים)': 'Young (1–3 years)',
  'בוגר (3–7 שנים)': 'Adult (3–7 years)',
  'מבוגר (מעל 7)': 'Senior (over 7)',
  'ידידותי': 'Friendly',
  'רגוע': 'Calm',
  'אנרגטי': 'Energetic',
  'חרדתי': 'Anxious',
  'תקיף / תוקפני': 'Aggressive',
  'מושך ברצועה': 'Pulls on leash',
  'בורח לפעמים': 'Sometimes runs away',
  'כן, ידידותי': 'Yes, friendly',
  'בסדר עם היכרות': 'OK with introduction',
  'מסתייג': 'Reserved',

  // ── Options — Elderly Care ──
  'ליווי לרופא / קופת חולים': 'Accompaniment to doctor / clinic',
  'ליווי לבית מרקחת / קניות': 'Accompaniment to pharmacy / shopping',
  'קניות עבור הקשיש': 'Shopping for the elderly',
  'עזרה בבית (כביסה, ניקיון קל)': 'Household help (laundry, light cleaning)',
  'חברה וביקור (שיחה, הליכה)': 'Companionship and visits',
  'עזרה בטכנולוגיה (טלפון, מחשב)': 'Technology help (phone, computer)',
  'עזרה בטפסים / ביורוקרטיה': 'Help with forms / bureaucracy',
  'הכנת ארוחה': 'Meal preparation',
  'הולך באופן עצמאי': 'Walks independently',
  'זקוק לעזרה בהליכה / תמיכה': 'Needs walking assistance / support',
  'מרותק לכיסא גלגלים': 'Wheelchair-bound',
  'מרותק למיטה': 'Bedridden',
  'צלול ועצמאי': 'Lucid and independent',
  'זיכרון ירוד קל': 'Mild memory decline',
  'דמנציה / אלצהיימר': 'Dementia / Alzheimer\'s',

  // ── Options — Fitness ──
  'אימון כושר כללי': 'General fitness training',
  'ריצה / הכנה לריצה': 'Running / run prep',
  'יוגה': 'Yoga',
  'פילאטיס': 'Pilates',
  'אימון כוח / הרמת משקולות': 'Strength / weight training',
  'אימון בית (ללא ציוד)': 'Home training (no equipment)',
  'אימון בחדר כושר': 'Gym training',
  'שחייה': 'Swimming',
  'אימון תפקודי / שיקום': 'Functional / rehab training',
  'מתחיל לגמרי': 'Complete beginner',
  'בסיסי': 'Basic',
  'בינוני': 'Intermediate',
  'מתקדם': 'Advanced',
  'בבית': 'At home',
  'בפארק / בחוץ': 'Park / outdoors',
  'בחדר כושר': 'At the gym',

  // ── Options — Photography ──
  'צילום עסק / חנות': 'Business / store photography',
  'צילום מוצרים': 'Product photography',
  'צילום אירוע (מסיבה / אירוע עסקי)': 'Event photography',
  'צילום אישי / תדמית': 'Personal / branding photography',
  'סרטון לרשתות (רילס / טיקטוק)': 'Social media video (Reels / TikTok)',
  'עריכת וידאו בלבד': 'Video editing only',
  'עריכת תמונות בלבד': 'Photo editing only',
  'צילום נדל"ן / דירה': 'Real estate / apartment photography',
  'עד שעה': 'Up to an hour',
  'שעה-שעתיים': '1-2 hours',
  'חצי יום': 'Half day',
  'יום מלא': 'Full day',
  'צבע והתאמה': 'Color correction',
  'הסרת רקע': 'Background removal',
  'טקסט / כותרות': 'Text / titles',
  'מוזיקה': 'Music',
  'כתוביות': 'Subtitles',
  'קיצור ומעברים': 'Trimming and transitions',

  // ── Options — Events ──
  'מלצר / הגשה': 'Waiter / serving',
  'ברמן': 'Bartender',
  'שף / טבח': 'Chef / cook',
  'הפעלת ילדים / אנימציה': 'Children\'s entertainment / animation',
  'עזרה בהקמה / פירוק': 'Setup / teardown help',
  'סדרן / אבטחה': 'Security',
  'DJ / מוזיקה': 'DJ / music',
  'צלם (ראה קטגוריה צילום)': 'Photographer (see photography category)',
  'מסיבה פרטית': 'Private party',
  'אירוע עסקי': 'Business event',
  'חתונה / בר מצווה': 'Wedding / Bar Mitzvah',
  'אירוע ילדים': 'Children\'s event',
  'יום הולדת': 'Birthday',
  'עד 20': 'Up to 20',
  '20–50': '20–50',
  '50–100': '50–100',
  '100–200': '100–200',
  'מעל 200': 'Over 200',
  'עד 3 שעות': 'Up to 3 hours',
  '5–8 שעות': '5–8 hours',

  // ── Options — Personal Help ──
  'לחכות לטכנאי / שליח בבית': 'Wait for technician / delivery at home',
  'לעמוד בתור (עיריה, רופא, דואר)': 'Wait in line (city hall, doctor, post office)',
  'לאסוף / להחזיר ילד מגן / בית ספר': 'Pick up / drop off child from school',
  'להעביר מפתח / מסמך': 'Deliver key / document',
  'להחזיר ציוד / פריט לחנות': 'Return equipment / item to store',
  'לבדוק / לצלם דירה': 'Check / photograph apartment',
  'עזרה בטפסים / ביורוקרטיה': 'Help with forms / bureaucracy',
  'שליחות אישית': 'Personal errands',

  // ── Options — Car ──
  'טיפול ותחזוקה שוטפת': 'Regular maintenance',
  'תיקון תקלה / אבחון': 'Issue repair / diagnosis',
  'החלפת מצבר': 'Battery replacement',
  'החלפת בלמים / רפידות': 'Brake / pad replacement',
  'החלפת שמן + פילטרים': 'Oil + filter change',
  'החלפת צמיגים / גלגלים': 'Tire / wheel replacement',
  'בדיקת מחשב (דיאגנוסטיקה)': 'Computer diagnostics',
  'טיפול מוסך מלא': 'Full garage service',
  'הזנקה (פנצר / כבלים)': 'Jump start (cables)',
  'שטיפת רכב / ניקוי': 'Car wash / cleaning',
  'מזגן רכב': 'Car AC',
  'הרכב לא מתניע': 'Car won\'t start',
  'רעשים מהמנוע': 'Engine noises',
  'אור אזהרה דולק בלוח': 'Warning light on dash',
  'בלמים לא תקינים / רעש': 'Brakes faulty / noisy',
  'בעיית הילוכים': 'Transmission issue',
  'דליפת נוזל / שמן': 'Fluid / oil leak',
  'מזגן לא עובד': 'AC not working',
  'חשמל / אלקטרוניקה': 'Electrical / electronics',
  'אין תקלה — טיפול שוטף': 'No issue — regular maintenance',
  'טויוטה': 'Toyota',
  'מאזדה': 'Mazda',
  'הונדה': 'Honda',
  'יונדאי': 'Hyundai',
  'קיה': 'Kia',
  'סקודה': 'Skoda',
  'פולקסווגן': 'Volkswagen',
  'מרצדס': 'Mercedes',
  'אאודי': 'Audi',
  'רנו': 'Renault',
  'ניסאן': 'Nissan',
  'מיצובישי': 'Mitsubishi',
  'סובארו': 'Subaru',
  'וולבו': 'Volvo',
  'טסלה': 'Tesla',
  'פורד': 'Ford',
  'שברולט': 'Chevrolet',
  'בבית / ברחוב': 'At home / on the street',
  'במוסך': 'At the garage',
  'בצד הדרך (תקוע)': 'On the roadside (stuck)',
  'צריך גרירה למוסך': 'Need towing to garage',
  'הטכנאי מגיע אליי': 'Technician comes to me',
  'אני מגיע למוסך': 'I go to the garage',

  // ── Common/shared options ──
  'אחר': 'Other',
  'Windows': 'Windows',
  'Mac / macOS': 'Mac / macOS',
  'Linux': 'Linux',
  'iOS / iPad': 'iOS / iPad',
  'Android': 'Android',
  'IKEA': 'IKEA',
  'KARE': 'KARE',
  'PayBox': 'PayBox',
  'BMW': 'BMW',

  // ── Placeholders ──
  'למשל: 3': 'e.g. 3',
  'למשל: 2': 'e.g. 2',
  'למשל: 50': 'e.g. 50',
  'למשל: 2018': 'e.g. 2018',
  'למשל: 20': 'e.g. 20',
  '0 = קרקע': '0 = ground',
  'עיר, רחוב...': 'City, street...',
  'עיר, רחוב, מספר...': 'City, street, number...',
  'כתובת יעד...': 'Destination address...',
  'למשל: סופר רמי לוי, רחוב הרצל...': 'e.g. Rami Levi, Herzl St...',
  'למשל: 200': 'e.g. 200',
  'חלב, לחם, עגבניות, ביצים...': 'Milk, bread, tomatoes, eggs...',
  'למשל: דוד כהן': 'e.g. David Cohen',
  'למשל: 050-1234567': 'e.g. 050-1234567',
  'למשל: ספה גדולה, 3 ארגזים, מקרר...': 'e.g. Large sofa, 3 boxes, fridge...',
  'למשל: מקרר אמריקאי, 10 ארגזים...': 'e.g. American fridge, 10 boxes...',
  'למשל: מתמטיקה, אנגלית, פיזיקה...': 'e.g. Math, English, Physics...',
  'למשל: הכנה למבחן בגרות, צמצום פערים...': 'e.g. Bagrut prep, closing gaps...',
  'למשל: 1.5 שנים, 4, 7': 'e.g. 1.5 years, 4, 7',
  'למשל: לברדור, פודל, מעורב...': 'e.g. Labrador, Poodle, mixed...',
  'למשל: 2 פעמים ביום, תרופה בבוקר...': 'e.g. Twice a day, morning medication...',
  'למשל: סכרת, אפילפסיה, אלרגיות...': 'e.g. Diabetes, epilepsy, allergies...',
  'למשל: אלרגיה לבוטנים, ילד עם אוטיזם, תרופות...': 'e.g. Peanut allergy, autistic child, medications...',
  'למשל: כלב ידידותי, חתול...': 'e.g. Friendly dog, cat...',
  'למשל: רוסית, רומנית, ערבית...': 'e.g. Russian, Romanian, Arabic...',
  'למשל: לרדת 5 קילו, להתכונן לריצת 10K...': 'e.g. Lose 5 kg, train for 10K run...',
  'למשל: בעיות גב, ברך פגועה, לחץ דם...': 'e.g. Back issues, bad knee, blood pressure...',
  'למשל: הרכב מתניע אבל משמיע רעש מוזר, נראה שהמצבר...': 'e.g. Car starts but makes a weird noise, seems like the battery...',
  'למשל: עבודה אחת': 'e.g. one job',
};

// ── Other language dictionaries can be added here (they fall back to Hebrew) ──
const ar = {};
const es = {};
const fr = {};
const ru = {};
const fil = {};
const hi = {};
const zh = {};

const DICTS = { en, ar, es, fr, ru, fil, hi, zh };

/**
 * Translate a taskFlowConfig string (field label, option, placeholder) to the target language.
 * Falls back to the original Hebrew string if no translation exists.
 * @param {string} text - The Hebrew string from taskFlowConfig
 * @param {string} lang - Target language code (e.g. 'en', 'ar', 'he')
 * @returns {string} - Translated string or the original Hebrew
 */
export function tTaskFlow(text, lang) {
  if (!text || lang === 'he') return text;
  const dict = DICTS[lang];
  if (dict && dict[text]) return dict[text];
  return text; // fallback to Hebrew
}

/**
 * Translate an array of option strings (used for multi-select display).
 * @param {string[]} options - Array of Hebrew option strings
 * @param {string} lang - Target language code
 * @returns {string[]} - Array of translated strings
 */
export function tTaskFlowOptions(options, lang) {
  if (!Array.isArray(options)) return options;
  return options.map(opt => tTaskFlow(opt, lang));
}