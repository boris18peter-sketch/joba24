/**
 * phrasing.js — the VOCABULARY of the automatic description.
 *
 * One place that answers two questions about every dynamic field:
 *
 *   WHAT IS THIS FIELD?            → its ROLE (the job, where, how long, how
 *                                    many, a style, an existing fault, the
 *                                    equipment, a floor, a yes/no statement).
 *   HOW DOES IT SOUND IN A SENTENCE? → its phrasing — preposition, gender,
 *                                    singular/plural, number words.
 *
 * ── ROLES COME FROM THE KEY, NOT THE LABEL ──────────────────────────────────
 * `item_count`, `issue_duration`, `location_in_home`, `leak_source` are stable
 * identifiers the form and the server agree on. The LABEL is only a fallback,
 * for a question an admin added under a key we do not know — so a reworded
 * question keeps working and a brand-new one still contributes something
 * sensible instead of being dropped.
 *
 * ── WHY SO MUCH CARE ABOUT GRAMMAR ──────────────────────────────────────────
 * A sentence that concatenates what was tapped reads as a transcript, not as a
 * person ("אני צריך נזילה", "פריט אחד פריטים", "כמה ימים הבעיה קיימת"). Every
 * helper below exists to remove one of those: a preposition that agrees with the
 * word before it, a count that knows its singular from its plural, a duration
 * that becomes "שעתיים" instead of "2 שעות", and a negation that turns an
 * answered NO into the fact a worker actually needs ("יש מעלית" → "אין מעלית").
 *
 * Nothing here fetches, stores or invents: every value it prints came from the
 * publisher's own answer.
 */

// ── Fields that never belong in the description ─────────────────────────────
// An address is shown on a map, a schedule on a calendar, a price on its own
// row. Repeating them in the text is exactly the duplication this replaces.
export const SKIP_TYPES = new Set(['address', 'schedule', 'date', 'time']);

// A price, a person or a system identifier is not a description of the work.
const SKIP_LABEL_RE = /מחיר|עלות|תשלום|תקציב|טלפון|נייד|אימייל|דוא|מזהה|קוד|הנחה/;

// An answer that carries no information a reader can use. Deliberately NOT
// including a number like 0 — on a floor question 0 means "ground floor".
const EMPTY_VALUES = new Set([
  'אחר', 'אחרת', 'אחרים', 'אחרות',
  'לא רלוונטי', 'לא ידוע', 'לא בטוח', 'לא יודע',
  '—', '-', '--', '?',
]);

/**
 * A label is written for a FORM — with an emoji, a question mark and often a
 * fill-in instruction. Inside a sentence only the words survive.
 */
export function cleanLabel(label) {
  if (!label) return '';
  return String(label)
    // Emoji and pictographs
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, ' ')
    // Fill-in instructions in parentheses or brackets
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[*_#]/g, ' ')
    .replace(/[?!.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A chosen OPTION is also written for a form: "קירות פנים (חדר / דירה)". */
export function stripParens(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*$/, '')
    .trim();
}

/**
 * One option out of several written into a single value ("דוד / בוילר").
 * The first is the one the publisher picked first and reads best in a sentence.
 */
export function firstOption(value) {
  return stripParens(String(value).split('/')[0] || '');
}

/** A single answer as readable text, or '' when it says nothing. */
export function cleanValue(raw) {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'boolean') return raw ? 'כן' : 'לא';
  const text = String(raw).trim();
  if (!text) return '';
  return EMPTY_VALUES.has(text) ? '' : text;
}

/** A multi-select becomes "א, ב ו-ג". */
export function valueText(raw) {
  if (Array.isArray(raw)) {
    const list = raw.map(cleanValue).filter(Boolean);
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + joinGlue(list[list.length - 1]) + list[list.length - 1];
  }
  return cleanValue(raw);
}

/** Hebrew attaches "ו" to a Hebrew word ("וספה") but takes a hyphen before a
 *  numeral or a Latin word ("ו־3", "ו־IKEA"). */
function joinGlue(last) {
  return /^[0-9A-Za-z]/.test(last) ? ' ו־' : ' ו';
}

/** Join clauses into "א, ב ו-ג". */
export function joinHe(items) {
  const list = items.filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + joinGlue(list[list.length - 1]) + list[list.length - 1];
}

// ════════════════════════════════════════════════════════════════════════════
// IS THIS AN ANSWER AT ALL?
// ════════════════════════════════════════════════════════════════════════════

/**
 * The distinction the whole feature rests on: something the publisher ACTUALLY
 * chose, versus a placeholder, a field label, or a value the component merely
 * displays.
 *
 *   · A toggle counts only when it holds a real true/false. `undefined` means
 *     it was never touched, and "never touched" is not "answered no".
 *   · An empty string is not an answer, so a field the form rendered and left
 *     blank contributes nothing.
 *   · `placeholder` is never read — it is a hint printed inside an empty input,
 *     and reading it would write a value nobody chose.
 */
export function isRealAnswer(field, value) {
  if (!field || !field.key) return false;
  if (SKIP_TYPES.has(field.type)) return false;
  if (SKIP_LABEL_RE.test(cleanLabel(field.label || ''))) return false;
  if (field.type === 'boolean' || field.type === 'toggle') {
    return value === true || value === false;
  }
  if (Array.isArray(value)) return value.some((v) => cleanValue(v) !== '');
  return cleanValue(value) !== '';
}

// ════════════════════════════════════════════════════════════════════════════
// ROLES
// ════════════════════════════════════════════════════════════════════════════

/**
 * The stable keys, grouped by what they mean. A key that is missing from this
 * map is not an error — it falls through to the label patterns below.
 */
const ROLE_BY_KEY = {
  // The job itself — what has to be done.
  work_type: 'subject',
  service_needed: 'subject',
  paint_type: 'subject',
  move_type: 'subject',
  install_type: 'subject',
  setup_type: 'subject',
  lighting_scope: 'subject',
  panel_issue: 'subject',
  content_type: 'subject',
  decoration_style: 'subject',
  production_scope: 'subject',
  // A fault that exists. Kept apart from `subject` on purpose: "a leak" is not
  // something anyone "needs", and phrasing it as a need is the bug this fixes.
  issue_type: 'fault',
  leak_source: 'problem',
  toilet_issue: 'problem',
  outlet_condition: 'problem',
  breaker_status: 'problem',
  pipe_location: 'problem',
  // Where the work happens.
  location_in_home: 'place',
  rooms_affected: 'place',
  venue_details: 'place',
  // How long.
  issue_duration: 'duration',
  hours: 'duration',
  // How many.
  item_count: 'count',
  guests_count: 'count',
  staff_count: 'count',
  faucet_count: 'count',
  outlet_count: 'count',
  deliverables_count: 'count',
  rooms: 'count',
  area: 'count',
  // Style and audience.
  music_style: 'style',
  event_type: 'audience',
  // Equipment, material, brand.
  sound_equipment: 'equipment',
  bar_equipment: 'equipment',
  equipment_details: 'equipment',
  vehicle_needed: 'vehicle',
  assembly_brand: 'brand',
  // Floors.
  from_floor: 'floor_from',
  to_floor: 'floor_to',
};

/** Only used when the key is unknown. Order matters — the first match wins. */
function roleFromLabel(label) {
  const text = cleanLabel(label);
  if (!text) return 'other';
  if (/נוספ|בנוסף|תוספת|כולל/.test(text)) return 'extra';
  if (/^מה (הבעיה|התקלה)|^מה קורה|^מה מצב|^מה הבעיה/.test(text)) return 'problem';
  if (/^מה /.test(text)) return 'subject';
  if (/^(איפה|היכן)/.test(text)) return 'place';
  if (/^כמה זמן|^כמה שעות|^כמה דקות/.test(text)) return 'duration';
  if (/^כמה /.test(text)) return 'count';
  if (/^איז[התו]/.test(text)) return 'style';
  return 'other';
}

/** The role of one field: its stable key first, its label only as a fallback. */
export function roleOfField(field) {
  if (!field) return 'other';
  // A toggle IS its own sentence, so its type decides before anything else.
  if (field.type === 'boolean' || field.type === 'toggle') return 'toggle';
  return ROLE_BY_KEY[field.key] || roleFromLabel(field.label);
}

// ════════════════════════════════════════════════════════════════════════════
// PREPOSITIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * A location is normally introduced by "ב". A value that already carries its own
 * preposition ("מחוץ לבית") must not get a second one.
 *
 * The guard is written `(\s|$)` and NOT `\b`: a word boundary in JavaScript is
 * defined against Latin letters and digits, so Hebrew letters are not "word"
 * characters and `\b` never matches between two of them — `^מחוץ\b` silently
 * failed and produced "במחוץ לבית".
 */
export function asPlace(value) {
  const v = stripParens(value);
  if (!v) return '';
  return /^(מחוץ|בחוץ|ליד|אצל|מעל|מתחת|בין|אחרי|ללא|על)(\s|$)/.test(v) ? v : `ב${v}`;
}

// ════════════════════════════════════════════════════════════════════════════
// YES / NO
// ════════════════════════════════════════════════════════════════════════════

/**
 * A toggle's LABEL is the sentence: the form wrote the statement, the answer is
 * only its polarity. Answering NO is information too — "יש מעלית" answered no is
 * exactly what a mover needs to know.
 *
 * The negation is pattern-based and returns '' when it cannot produce clean
 * Hebrew. A half-formed "לא לוח החשמל מעודכן" is worse than saying nothing, so
 * an unrecognised label is simply left out.
 */
export function toggleClause(label, value) {
  const text = cleanLabel(label);
  if (!text) return '';
  const alreadyNegative = /^(אין|לא)(\s|$)/.test(text);
  // A label that is itself a negative statement is only worth printing when it
  // is true ("אין חשמל עכשיו"); answered no it says nothing.
  if (alreadyNegative) return value === true ? text : '';
  if (value === true) return text;
  if (value !== false) return '';
  return negate(text);
}

function negate(text) {
  if (/^יש /.test(text)) return `אין ${text.slice(3)}`;
  if (/^רואים /.test(text)) return `לא רואים ${text.slice(6)}`;
  if (/^יודע /.test(text)) return `לא יודע ${text.slice(5)}`;
  if (/^צריך /.test(text)) return `לא צריך ${text.slice(5)}`;
  if (/^מעוניין /.test(text)) return `לא מעוניין ${text.slice(8)}`;
  // A requirement that is not required adds nothing to the description.
  if (/^(נדרש|נדרשים|נדרשת|דרוש|דרושים)/.test(text)) return '';
  // Anything else: say nothing rather than produce a broken sentence.
  return '';
}

// ════════════════════════════════════════════════════════════════════════════
// DURATION
// ════════════════════════════════════════════════════════════════════════════

/** "2" → "למשך שעתיים"; "1" → "למשך שעה"; "4" → "למשך 4 שעות". */
export function hoursPhrase(raw) {
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  if (!isFinite(n) || n <= 0) return '';
  if (n === 1) return 'למשך שעה';
  if (n === 2) return 'למשך שעתיים';
  return `למשך ${n} שעות`;
}

/**
 * How long the problem has existed. Each option already states the duration, so
 * the clause only has to introduce it — and it does so with the gender of the
 * thing it is about, falling back to naming the problem outright rather than
 * guessing an ending that would be wrong.
 */
const DURATION_TAIL = {
  'התחיל היום': 'התחיל היום',
  'כמה ימים': 'נמשך כבר כמה ימים',
  'שבוע או יותר': 'נמשך כבר שבוע או יותר',
  'בעיה חוזרת': 'חוזר שוב ושוב',
  'כמה שעות': 'נמשך כבר כמה שעות',
};

export function durationClause(key, raw, gender) {
  const value = cleanValue(raw);
  if (!value) return null;
  // A number of hours is a length of work, not a participle about the fault, so
  // it stands on its own ("למשך שעתיים") and never takes a relative "ש".
  if (key === 'hours') {
    const text = hoursPhrase(value);
    return text ? { text, relative: false } : null;
  }
  const tail = DURATION_TAIL[value] || value;
  if (gender === 'f') return { text: feminine(tail), relative: true };
  if (gender === 'm') return { text: tail, relative: true };
  // No confident gender: name the problem instead of agreeing with a word we
  // would have to guess. "הבעיה" is feminine, so that ending is the one forced.
  return { text: `הבעיה ${feminine(tail)}`, relative: true };
}

function feminine(tail) {
  return tail
    .replace(/^נמשך/, 'נמשכת')
    .replace(/^התחיל/, 'התחילה')
    .replace(/^חוזר/, 'חוזרת');
}

// ════════════════════════════════════════════════════════════════════════════
// COUNT
// ════════════════════════════════════════════════════════════════════════════

/**
 * The unit a count is counting. Where the label already names it ("כמה ברזים
 * להחליף?") the label is used, minus the question and the verb.
 */
const COUNT_UNIT = {
  guests_count: 'אורחים',
  staff_count: 'אנשי צוות',
  faucet_count: 'ברזים',
  outlet_count: 'שקעים',
  deliverables_count: 'תמונות / סרטונים',
  rooms: 'חדרים',
  area: 'מ"ר',
};

/**
 * "פריט אחד" is a count with the noun already inside it, so appending a unit
 * would produce "פריט אחד פריטים". Each option is replaced by the phrase a
 * person would write.
 */
function itemCountPhrase(value) {
  const v = stripParens(value);
  if (!v) return '';
  if (/^פריט אחד/.test(v)) return 'פריט ריהוט אחד';
  if (/^2–3|^2-3/.test(v)) return '2–3 פריטי ריהוט';
  if (/^4–6|^4-6/.test(v)) return '4–6 פריטי ריהוט';
  if (/יותר מ-?\s*6/.test(v)) return 'יותר מ-6 פריטי ריהוט';
  return v;
}

/**
 * @param prep  the preposition this frame wants in front of the number —
 *              "ל־" for an event ("ל־30 אורחים"), "ב־" for work inside a home
 *              ("ב־3 חדרים"), '' elsewhere.
 */
export function countClause(key, raw, prep = '', label = '') {
  const value = cleanValue(raw);
  if (!value) return '';
  if (key === 'item_count') return itemCountPhrase(value);
  const unit = COUNT_UNIT[key] || unitFromLabel(label);
  return unit ? `${prep}${value} ${unit}` : value;
}

/** "כמה ברזים להחליף?" → "ברזים" — the noun the question is counting. */
function unitFromLabel(label) {
  return cleanLabel(label)
    .replace(/^כמה\s*/, '')
    .replace(/\s*(להחליף|לצבוע|להרכיב|מושפעים|דרושים|נדרשים|סופיים)\s*$/, '')
    .replace(/\s*\/.*$/, '')
    .trim();
}

// ════════════════════════════════════════════════════════════════════════════
// FAULTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * A fault is phrased from the field's own meaning: where it comes from, what it
 * does, or where the pipe runs. `firstOption` is used because these options are
 * written as alternatives ("דוד / בוילר") and only the first belongs in a
 * sentence.
 */
export function problemClause(key, raw) {
  const value = firstOption(cleanValue(raw));
  if (!value) return '';
  switch (key) {
    // "ברז" → "מהברז": the leak comes FROM somewhere.
    case 'leak_source':
      return /^מה/.test(value) ? value : `מה${value}`;
    // These options describe what the fixture does, so the sentence needs the
    // fixture named in front of them.
    case 'toilet_issue':
      return `האסלה ${value}`;
    case 'outlet_condition':
      return `השקע ${value}`;
    // "המפסק נפל" already names its subject — adding one would repeat it.
    case 'breaker_status':
      return value;
    // Where the pipe runs is a location, so it takes a location's preposition.
    case 'pipe_location':
      return asPlace(value);
    default:
      return value;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// STYLE · AUDIENCE · EQUIPMENT · BRAND · FLOOR
// ════════════════════════════════════════════════════════════════════════════

export function styleClause(key, raw) {
  const value = cleanValue(raw);
  if (!value) return '';
  if (key === 'music_style') return `לסגנון מוזיקת ${value}`;
  return `בסגנון ${value}`;
}

/** "יום הולדת" → "ליום הולדת"; "חתונה / בר מצווה" → "לחתונה". */
export function audienceClause(raw) {
  const value = firstOption(cleanValue(raw));
  if (!value) return '';
  return /^ל/.test(value) ? value : `ל${value}`;
}

/** The lead-in each equipment field needs; the answer is appended after it. */
const EQUIPMENT_LEAD = {
  sound_equipment: 'צריך ציוד הגברה ותאורה',
  bar_equipment: 'צריך ציוד בר',
  equipment_details: 'צריך להקים / לפרק',
};

export function equipmentClause(key, raw) {
  const value = cleanValue(raw);
  if (key === 'vehicle_needed') return value ? `צריך ${value}` : '';
  const lead = EQUIPMENT_LEAD[key];
  if (lead) return value ? `${lead}: ${value}` : lead;
  if (!value) return '';
  return value;
}

/** "IKEA" → ", כמו רהיט של IKEA" — only for flat-pack assembly. */
export function brandTail(raw) {
  const value = cleanValue(raw);
  if (!value) return '';
  return `, כמו רהיט של ${value}`;
}

export function floorClause(key, raw) {
  const n = Number(raw);
  if (!isFinite(n)) return '';
  const tail = key === 'from_floor' ? ' במוצא' : ' ביעד';
  if (n === 0) return `קומת קרקע${tail}`;
  return `קומה ${n}${tail}`;
}

// ════════════════════════════════════════════════════════════════════════════
// GENDER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Hebrew agrees in gender, and a wrong ending is the most audible mistake in the
 * whole sentence. The known services are listed outright — they are the ones
 * that open a sentence — and anything else falls back to the ending test, then
 * to a gender-free wording.
 */
const GENDER_BY_CATEGORY = {
  plumbing_leak: 'f',
  plumbing_clog: 'f',
  plumbing_faucet: 'm',
  plumbing_toilet: 'f',
  plumbing_pipe: 'f',
  plumbing: 'f',
  elec_outage: 'f',
  elec_short: 'm',
  elec_outlet: 'm',
  elec_lighting: 'f',
  elec_panel: 'm',
  elec_install: 'f',
  electricity: 'm',
};

/** Words that end in ה or ת are overwhelmingly feminine in Hebrew. */
export function genderOfWord(word) {
  const w = String(word || '').trim();
  if (!w) return '';
  if (/(ה|ת|ית|ות)$/.test(w)) return 'f';
  return 'm';
}

export function genderOfCategory(key, label) {
  if (key && GENDER_BY_CATEGORY[key]) return GENDER_BY_CATEGORY[key];
  return genderOfWord(cleanLabel(label).split(' ')[0]);
}

/** "בה" / "בו" / "בזה" — the pronoun that can never be wrong. */
export function aboutPronoun(gender) {
  if (gender === 'f') return 'בה';
  if (gender === 'm') return 'בו';
  return 'בזה';
}