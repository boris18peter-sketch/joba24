/**
 * taskDescriptionBuilder.js — turns the answers a publisher already gave in the
 * category form into ONE natural Hebrew sentence.
 *
 * ── WHY THIS IS NOT AI ──────────────────────────────────────────────────────
 * The information is already in the form. Sending it to a model to have it
 * written back as a sentence would cost a round trip, cost money, and could
 * invent a detail the publisher never chose. This is a local, synchronous
 * composition over data that is already in memory: no network, no server write,
 * no state of its own.
 *
 * ── THE HARD PART, AND HOW IT IS HANDLED ────────────────────────────────────
 * "What should be painted? → walls" and "Where at home? → living room" must not
 * come out as "What should be painted: walls. Where at home: living room." — the
 * point is a sentence, not a transcript of the form. So a field is not copied;
 * it is given a ROLE, read from the way its label is written, and each role has
 * its own way of entering a sentence:
 *
 *   מה צריך לצבוע?  → "walls"          → head:   "אני צריך צביעה של קירות"
 *   איפה בבית?      → "living room"    → clause: "בסלון"
 *   עבודה נוספת     → "filler repairs" → clause: "כולל תיקוני שפכטל"
 *
 * A toggle reads as a statement, and answering it NO is information too — the
 * absence is exactly what the worker needs ("יש מעלית" answered no → "אין מעלית").
 *
 * A field whose label matches no role still contributes: it is phrased by its
 * TYPE (a multi-select becomes a list, a number keeps its label as a unit, free
 * text is used as written). Nothing is dropped, and nothing is invented.
 *
 * ── WHAT IS DELIBERATELY LEFT OUT ───────────────────────────────────────────
 * Address and schedule fields, and anything about a price, a phone number or a
 * system id: they are shown on their own, and repeating them in the description
 * is exactly the duplication this replaces.
 *
 * Adding a better phrasing for a new category is a matter of adding a rule to
 * RULES — the composer itself never needs to change.
 */

// Fields that never belong in the description: shown on their own elsewhere.
const SKIP_TYPES = new Set(['address', 'schedule']);

// A price, a person or a system identifier is not a description of the work.
const SKIP_LABEL_RE = /מחיר|עלות|תשלום|תקציב|טלפון|נייד|אימייל|דוא|מזהה|קוד|הנחה/;

// An answer of "other" adds nothing a reader can use.
const EMPTY_VALUES = new Set(['אחר', 'אחרת', 'אחרים', 'אחרות', 'לא רלוונטי']);

/**
 * A label is written for a FORM (with an emoji, a question mark and often a
 * fill-in instruction). Inside a sentence only the words survive.
 */
function cleanLabel(label) {
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

/** "מה צריך לצבוע" → "לצבוע"; used only to name the role, never printed. */
function roleOf(label) {
  if (/^מה (הבעיה|התקלה|לא עובד|שבור)/.test(label)) return 'problem';
  if (/^מה /.test(label)) return 'what';
  if (/^(איפה|היכן)/.test(label)) return 'where';
  if (/^כמה /.test(label)) return 'amount';
  if (/^איז[התו]/.test(label)) return 'kind';
  if (/^מתי/.test(label)) return 'when';
  if (/נוספ|נוסף|כולל|בנוסף|תוספת/.test(label)) return 'extra';
  if (/^קומה/.test(label)) return 'floor';
  return 'other';
}

/** A location is normally introduced by "ב". A value that already carries its own
 *  preposition ("מחוץ לבית") must not get a second one.
 *
 *  The guard is written `(\s|$)` and NOT `\b`: a word boundary in JavaScript is
 *  defined against Latin letters and digits, so Hebrew letters are not "word"
 *  characters and `\b` never matches between two of them — `^מחוץ\b` silently
 *  failed and produced "במחוץ לבית". */
function asPlace(value) {
  return /^(מחוץ|בחוץ|ליד|אצל|מעל|מתחת|בין|אחרי|ללא|על)(\s|$)/.test(value) ? value : `ב${value}`;
}

/** "כמה חדרים" → "חדרים": the unit the number is counting. */
function unitOf(label) {
  return label.replace(/^כמה\s*/, '').trim();
}

/** "קומה במוצא" → "במוצא": the part that qualifies the floor, kept. */
function floorTail(label) {
  const rest = label.replace(/^קומה\s*/, '').trim();
  return rest ? ` ${rest}` : '';
}

/** Turns one answered field into the clause it contributes to the sentence. */
function clauseFor(role, value, label) {
  switch (role) {
    case 'problem': return `יש ${value}`;
    case 'where': return asPlace(value);
    case 'amount': {
      const unit = unitOf(label);
      return unit ? `${value} ${unit}` : value;
    }
    case 'kind': return value;
    case 'when': return value;
    case 'extra': return `כולל ${value}`;
    case 'floor': return `קומה ${value}${floorTail(label)}`;
    default: return value;
  }
}

/** One answer as readable text — a multi-select becomes "א, ב ו-ג". */
function valueText(raw) {
  const one = (v) => String(v).trim();
  if (Array.isArray(raw)) {
    const list = raw.map(one).filter((v) => v && !EMPTY_VALUES.has(v));
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' ו' + list[list.length - 1];
  }
  if (raw === undefined || raw === null) return '';
  const text = one(raw);
  return EMPTY_VALUES.has(text) ? '' : text;
}

/** Hebrew list joining: "א, ב ו-ג". */
function joinHe(items) {
  const list = items.filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  const last = list[list.length - 1];
  // Hebrew attaches "ו" to a Hebrew word directly ("וספה") but takes a hyphen
  // before a numeral or a Latin word ("ו־3").
  const glue = /^[0-9A-Za-z]/.test(last) ? ' ו־' : ' ו';
  return list.slice(0, -1).join(', ') + glue + last;
}

/**
 * @param {object}   args
 * @param {string}   args.categoryLabel  e.g. "🎨 צביעה"
 * @param {Array}    args.fields         the category's resolved dynamic fields
 * @param {object}   args.values         the answers the publisher has given
 * @returns {string} a sentence, or '' when there is nothing worth saying yet
 */
export function buildTaskDescription({ categoryLabel, fields, values }) {
  if (!Array.isArray(fields) || !fields.length) return '';
  if (!values || typeof values !== 'object') return '';

  const parts = { what: [], problem: [], where: [], floor: [], amount: [], kind: [], when: [], extra: [], other: [] };

  for (const field of fields) {
    if (!field?.key) continue;
    if (SKIP_TYPES.has(field.type)) continue;

    const label = cleanLabel(field.label);
    if (!label || SKIP_LABEL_RE.test(label)) continue;
    // Only answers the publisher actually GAVE. A field that is merely empty by
    // default is not an answer, and must never be written into the sentence.
    if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;

    const raw = values[field.key];
    const role = roleOf(label);

    if (field.type === 'toggle') {
      if (raw === true) {
        parts[role === 'other' ? 'other' : role].push(label);
      } else if (raw === false && /^יש /.test(label)) {
        // "יש מעלית" answered NO is real information: the worker needs to know
        // there is none. A plain negative is only phrased when the label can
        // carry it — otherwise nothing is said rather than something wrong.
        parts.other.push(label.replace(/^יש /, 'אין '));
      }
      continue;
    }

    const value = valueText(raw);
    if (!value) continue;

    if (role === 'what') parts.what.push(value);
    else parts[role].push(clauseFor(role, value, label));
  }

  const categoryNoun = cleanLabel(categoryLabel);
  const whatText = joinHe(parts.what);

  // The head names the service, and — when the publisher said what it is for —
  // what it is for. "אני צריך צביעה של קירות", "אני צריך הובלה של ספה".
  let head = categoryNoun ? `אני צריך ${categoryNoun}` : 'אני צריך עזרה';
  if (whatText) head += ` של ${whatText}`;

  // Everything else follows as clauses, in the order a reader expects to meet
  // them: what is wrong, then where, then what kind, then how much, then when,
  // then what else is included, then anything that had no role of its own.
  // Every clause goes into ONE list and is joined once. Joining group by group
  // produced two "ו" in a row whenever a group itself held a list
  // ("… ואין מעלית וספה גדולה"): one "ו" joined the items inside the group, the
  // other joined the groups. One list, one join.
  const clauses = joinHe([
    ...parts.problem,
    ...parts.where,
    ...parts.floor,
    ...parts.kind,
    ...parts.amount,
    ...parts.when,
    ...parts.extra,
    ...parts.other,
  ]);

  // A sentence that only names the service says nothing the publisher could not
  // already see, and it would pre-fill a field they then have to clear. With no
  // real detail, the field is left to them.
  if (!whatText && !clauses) return '';

  const sentence = clauses ? `${head}, ${clauses}.` : `${head}.`;
  return sentence.replace(/\s+/g, ' ').replace(/\s+\./g, '.');
}

export default buildTaskDescription;