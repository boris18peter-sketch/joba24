/**
 * frames.js — the SENTENCE layer.
 *
 * ── WHY A FRAME AND NOT A TEMPLATE ──────────────────────────────────────────
 * "אני צריך" + the category + the answers is a transcript of the form, and it
 * produces sentences no person would write: *"אני צריך נזילה"* (nobody needs a
 * leak), *"אני צריך תקליטנים, טכנו, 2 שעות ויום הולדת"* (a list of taps).
 *
 * A leak is something you HAVE and want fixed. A DJ is someone you BOOK for an
 * occasion. Furniture is something you need HELP WITH. Those are three different
 * sentences about three different kinds of job, so the sentence is chosen by
 * what the job IS — and each frame then pulls only the answers that belong in
 * it, in the order that frame reads naturally.
 *
 * ── ADDING A CATEGORY ───────────────────────────────────────────────────────
 * One line in CATEGORY_FRAME. A category with no line is not broken: it is
 * resolved by what its own form asks (see resolveFrame) and, failing that, it is
 * left empty for the publisher to write — never filled with a bad sentence.
 */

import {
  asPlace,
  aboutPronoun,
  audienceClause,
  brandTail,
  cleanLabel,
  countClause,
  durationClause,
  equipmentClause,
  firstOption,
  floorClause,
  genderOfCategory,
  joinHe,
  problemClause,
  roleOfField,
  stripParens,
  styleClause,
  valueText,
  toggleClause,
} from './phrasing';

// The keys that name a JOB TO BE DONE (a need), as opposed to a fault.
export const NEED_KEYS = [
  'work_type', 'service_needed', 'paint_type', 'move_type', 'install_type',
  'setup_type', 'lighting_scope', 'content_type', 'decoration_style',
  'production_scope',
];

// The keys that name an EXISTING FAULT. Phrased as a need these read wrong
// ("אני צריך נזילה"), which is the single worst output of the old approach.
export const FAULT_KEYS = ['issue_type'];

/**
 * A category label that names a TRADE rather than a job ("אינסטלציה",
 * "חשמלאות"). "יש לי אינסטלציה" is not a sentence, so these fall through to the
 * trade frame — "מחפש אינסטלטור".
 */
const TRADE_LABEL_RE = /^(אינסטלציה|חשמלאות|נגרות|הובלה|צביעה|ניקיון|גינון|מזגנים|מנעולן|הנדימן|תחזוקת בית|עזרה פיזית|שיפוצים|מחשבים|בעלי חיים|כושר וספורט)$/;

/** The professional a trade is looking for. Used when no fault was named. */
export const TRADE_ROLE = {
  plumbing: 'אינסטלטור',
  electricity: 'חשמלאי',
  carpentry: 'נגר',
  painting: 'צבעי',
  moving: 'מוביל',
  cleaning: 'עובד ניקיון',
  ac: 'טכנאי מזגנים',
  locksmith: 'מנעולן',
  gardening: 'גנן',
  handyman: 'הנדימן',
  home_maintenance: 'איש תחזוקה',
  heavy_lifting: 'עובד כח אדם',
  pets: 'דוגסיטר',
  babysitting: 'בייביסיטר',
  elderly_care: 'מטפל',
  tutoring: 'מורה פרטי',
  fitness: 'מאמן כושר',
  it_support: 'טכנאי מחשבים',
  car: 'מוסכניק',
};

/**
 * ONE LINE PER CATEGORY.
 *
 *   repair     — a fault that exists and needs a professional.
 *   event      — a role to book for an occasion.
 *   need       — a job to be done ("עזרה ב…", "צביעה של…").
 *   carpentry  — flat-pack assembly reads as its own sentence.
 *   assist     — a standing service with a fixed opening line.
 */
export const CATEGORY_FRAME = {
  // ── A fault to fix ──
  // `noun` overrides the category label where the label names the FIXTURE or
  // the JOB rather than the fault: "יש לי שקע / מפסק" is not a sentence, "יש לי
  // בעיה בשקע" is.
  plumbing_leak: { kind: 'repair', gender: 'f' },
  plumbing_clog: { kind: 'repair', gender: 'f' },
  plumbing_faucet: { kind: 'repair', gender: 'm', noun: 'ברז שצריך החלפה' },
  plumbing_toilet: { kind: 'repair', gender: 'f', noun: 'בעיה באסלה' },
  plumbing_pipe: { kind: 'repair', gender: 'f' },
  plumbing: { kind: 'repair', gender: 'f' },
  elec_outage: { kind: 'repair', gender: 'f' },
  elec_short: { kind: 'repair', gender: 'm' },
  elec_outlet: { kind: 'repair', gender: 'm', noun: 'בעיה בשקע' },
  elec_lighting: { kind: 'repair', gender: 'f', noun: 'בעיה בתאורה' },
  elec_panel: { kind: 'repair', gender: 'm', noun: 'בעיה בלוח החשמל' },
  elec_install: { kind: 'need', noun: 'התקנה של' },
  electricity: { kind: 'repair', gender: 'm' },
  ac: { kind: 'repair', gender: 'm' },
  locksmith: { kind: 'repair', gender: 'm' },
  handyman: { kind: 'repair', gender: 'm' },
  home_maintenance: { kind: 'repair', gender: 'm' },
  gardening: { kind: 'repair', gender: 'm' },

  // ── A role to book ──
  djs: { kind: 'event', role: 'תקליטן' },
  waiters: { kind: 'event', role: 'מלצר' },
  bartenders: { kind: 'event', role: 'ברמן' },
  event_producers: { kind: 'event', role: 'מפיק אירועים' },
  event_decorations: { kind: 'event', role: 'מעצב אירועים' },
  event_setup: { kind: 'event', role: 'צוות הקמה ופירוק' },
  photography: { kind: 'event', role: 'צלם' },
  events: { kind: 'event', role: '' },

  // ── A job to be done ──
  painting: { kind: 'need', noun: 'צביעה של' },
  carpentry: { kind: 'carpentry' },
  moving: { kind: 'need', noun: 'הובלה של' },
  delivery: { kind: 'assist', open: 'אני צריך משלוח' },
  transportation: { kind: 'assist', open: 'אני צריך הסעה' },
  shopping: { kind: 'assist', open: 'אני צריך עזרה בקניות' },
  heavy_lifting: { kind: 'assist', open: 'אני צריך עזרה פיזית' },
  cleaning: { kind: 'assist', open: 'מחפש עזרה בניקיון' },
  personal_help: { kind: 'assist', open: 'מחפש עזרה אישית' },
  pets: { kind: 'assist', open: 'מחפש עזרה בטיפול בבעלי חיים' },
  babysitting: { kind: 'assist', open: 'מחפש בייביסיטר' },
  elderly_care: { kind: 'assist', open: 'מחפש סיוע לקשיש' },
  tutoring: { kind: 'assist', open: 'מחפש מורה פרטי' },
  fitness: { kind: 'assist', open: 'מחפש מאמן כושר' },
  it_support: { kind: 'assist', open: 'מחפש טכנאי מחשבים' },
  car: { kind: 'assist', open: 'מחפש טיפול ברכב' },
};

/**
 * The frame for a category we have no line for.
 *
 * It is decided by what the form itself asks, which is information we already
 * have: a form with a "what's the problem?" question is a repair job, and a form
 * with a "what needs doing?" question is a job to be done. A form that asks
 * neither is left to the publisher rather than filled with a sentence that says
 * nothing.
 */
export function resolveFrame(categoryKey, answers, categoryLabel) {
  const known = CATEGORY_FRAME[categoryKey];
  if (known) return { ...known, key: categoryKey };
  if (answers.some((a) => FAULT_KEYS.includes(a.key))) {
    return { key: categoryKey, kind: 'repair', gender: genderOfCategory(categoryKey, categoryLabel) };
  }
  if (answers.some((a) => NEED_KEYS.includes(a.key))) {
    return { key: categoryKey, kind: 'need', noun: '' };
  }
  return { key: categoryKey, kind: 'none' };
}

// ════════════════════════════════════════════════════════════════════════════
// FROM ANSWERS TO SLOTS
// ════════════════════════════════════════════════════════════════════════════

/** The most clauses a sentence may end with, so it never becomes a word list. */
const MAX_TAIL = 3;

/**
 * Sort the answered fields into the slots a frame reads. Each answer is used by
 * its ROLE, never by the order it happened to appear in the form — that is what
 * lets "2 שעות" become "למשך שעתיים" and "מטבח" become part of the fault.
 */
export function assembleParts(answers, categoryLabel, frame) {
  const parts = {
    subject: '',
    fault: '',
    problem: '',
    place: '',
    style: '',
    audience: '',
    equipment: '',
    brand: '',
    count: null,
    duration: null,
    floors: [],
    extras: [],
    subjectFromFault: false,
  };

  for (const a of answers) {
    const value = valueText(a.raw);
    switch (a.role) {
      case 'subject':
        if (!parts.subject) parts.subject = stripParens(value);
        break;
      case 'fault':
        if (!parts.fault) parts.fault = stripParens(value);
        break;
      case 'problem':
        if (!parts.problem) parts.problem = problemClause(a.key, a.raw);
        break;
      case 'place':
        if (!parts.place) parts.place = asPlace(value);
        break;
      case 'style':
        if (!parts.style) parts.style = styleClause(a.key, a.raw);
        break;
      case 'audience':
        if (!parts.audience) parts.audience = audienceClause(a.raw);
        break;
      case 'equipment':
      case 'vehicle':
        if (!parts.equipment) parts.equipment = equipmentClause(a.key, a.raw);
        break;
      case 'brand':
        if (!parts.brand) parts.brand = brandTail(a.raw);
        break;
      case 'count':
        if (!parts.count) parts.count = { key: a.key, value: a.raw, label: a.label };
        break;
      case 'duration':
        if (!parts.duration) parts.duration = { key: a.key, value: a.raw };
        break;
      case 'floor_from':
      case 'floor_to': {
        const f = floorClause(a.key, a.raw);
        if (f) parts.floors.push(f);
        break;
      }
      case 'toggle': {
        const t = toggleClause(a.label, a.raw);
        if (t) parts.extras.push(t);
        break;
      }
      case 'extra':
      case 'other':
      default:
        // A question we have no role for still contributes — with its own title
        // in front, so the reader knows what the answer is about.
        if (value && a.label) parts.extras.push(`${cleanLabel(a.label)}: ${value}`);
        else if (value) parts.extras.push(value);
        break;
    }
  }

  // The description's own subject: a named fault first, then the category itself
  // ("נזילה", "סתימה") — which is what the publisher picked and what the worker
  // is being asked to deal with.
  if (!parts.subject) {
    parts.subject = parts.fault;
    // A fault the publisher typed is a phrase whose grammatical gender we cannot
    // know ("החלפת ברז", "תקלה כללית"). The category's own gender describes the
    // CATEGORY, so it must not be borrowed for a phrase that replaced it.
    if (parts.subject) parts.subjectFromFault = true;
  }
  if (!parts.subject) parts.subject = cleanLabel(categoryLabel);

  parts.tail = [parts.equipment, ...parts.floors, ...parts.extras]
    .filter(Boolean)
    .slice(0, MAX_TAIL);

  // A trade is not a fault: "יש לי אינסטלציה" is not a sentence.
  parts.subjectIsTrade = TRADE_LABEL_RE.test(parts.subject);

  return parts;
}

// ════════════════════════════════════════════════════════════════════════════
// THE SENTENCES
// ════════════════════════════════════════════════════════════════════════════

/**
 * "יש לי נזילה במטבח ואני מחפש איש מקצוע שיטפל בה."
 *
 * The fault leads, because that is what the worker has to picture first; where it
 * is and how long it has lasted follow it. The closing names the thing the
 * publisher actually wants, which a list of taps never did.
 */
function composeRepair(parts, frame) {
  if (!parts.subject || parts.subjectIsTrade) return composeTrade(parts, frame);

  // A problem phrased as a phrase ("מהברז", "בקיר") attaches to the fault; one
  // phrased as a statement ("השקע לא עובד") is its own clause.
  const problemIsClause = !!parts.problem && !/^(מה|ב)/.test(parts.problem);
  const countText = parts.count
    ? countClause(parts.count.key, parts.count.value, '', parts.count.label)
    : '';
  // A fault the publisher named replaces the category's own noun; otherwise the
  // frame's noun describes it better than the label does ("בעיה בשקע").
  const subject = parts.subjectFromFault || !frame.noun ? parts.subject : frame.noun;
  // "2 שקעים" and "בעיה בשקע" are the same thing twice. When the count already
  // names it, the count IS the subject — no repeating the category's name.
  const countIsSubject = !!countText && sameThing(subject, countText);
  // The pronoun follows whatever became the subject. With a count in play the
  // number is unknown too, so "בזה" is the one form that is always right.
  const gender = parts.subjectFromFault || countText ? '' : frame.gender;

  let s = `יש לי ${countIsSubject ? countText : subject}`;
  if (parts.problem && !problemIsClause) s += ` ${parts.problem}`;
  if (parts.place) s += ` ${parts.place}`;
  if (parts.duration) {
    const d = durationClause(parts.duration.key, parts.duration.value, gender);
    if (d) s += d.relative ? ` ש${d.text}` : ` ${d.text}`;
  }
  const tail = [
    ...(countIsSubject || !countText ? [] : [countText]),
    ...(problemIsClause ? [parts.problem] : []),
    ...parts.tail,
  ].filter(Boolean).slice(0, MAX_TAIL);
  if (tail.length) s += `, ${joinHe(tail)}`;
  const closing = `ואני מחפש איש מקצוע שיטפל ${aboutPronoun(gender)}.`;
  // A short sentence joins with "ו"; once the fault has a duration or a tail,
  // a comma is what a person would write.
  return parts.duration || tail.length ? `${s}, ${closing}` : `${s} ${closing}`;
}

/**
 * Are these two phrases about the same thing? "שקע / מפסק" and "2 שקעים" are;
 * "נזילה" and "2 שקעים" are not. Used only to stop the sentence naming the same
 * item twice — never to drop information.
 */
function sameThing(a, b) {
  const words = (s) => String(s)
    .replace(/[^\u05d0-\u05ea\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    // A leading preposition is not part of the word ("בשקע" → "שקע").
    .map((w) => w.replace(/^[בהלמשכ]/, ''))
    .filter(Boolean);
  const stem = (w) => w.replace(/(ים|ות|ה|י)$/, '');
  const left = words(a).map(stem).filter((w) => w.length >= 3);
  const right = words(b).map(stem).filter((w) => w.length >= 3);
  return left.some((x) => right.some((y) => x === y || x.startsWith(y) || y.startsWith(x)));
}

/**
 * "מחפש תקליטן ליום הולדת, לסגנון מוזיקת טכנו, למשך שעתיים."
 *
 * Every phrase after the role is a parallel "ל…" phrase, which is why commas are
 * right here and would be wrong in a list of unrelated taps.
 */
function composeEvent(parts, frame) {
  const role = frame.role || (parts.subjectIsTrade ? '' : parts.subject) || '';
  let s = role ? `מחפש ${role}` : 'מחפש בעל מקצוע';
  const phrases = [];
  // What is being booked FOR is the first parallel phrase ("מחפש צלם לצילום
  // מוצרים") — unless it merely repeats the role, which it often does
  // ("צוות הקמה ופירוק").
  if (frame.role && parts.subject && !parts.subjectIsTrade) {
    const what = firstOption(String(parts.subject).split(',')[0].trim());
    if (what && !sameThing(role, what)) phrases.push(`ל${what}`);
  }
  if (parts.audience) phrases.push(parts.audience);
  if (parts.style) phrases.push(parts.style);
  if (parts.count) {
    const prep = parts.count.key === 'guests_count' ? 'ל־' : '';
    const c = countClause(parts.count.key, parts.count.value, prep, parts.count.label);
    if (c) phrases.push(c);
  }
  if (parts.duration) {
    const d = durationClause(parts.duration.key, parts.duration.value, '');
    if (d) phrases.push(d.text);
  }
  if (phrases.length) s += ` ${phrases.join(', ')}`;
  if (parts.tail.length) s += `, ${joinHe(parts.tail)}`;
  return `${s}.`;
}

/**
 * "אני צריך צביעה של קירות פנים ב־3 חדרים."
 * "אני צריך הובלה של רהיט בודד, קומה 3 במוצא ואין מעלית במוצא."
 */
function composeNeed(parts, frame) {
  if (!parts.subject || parts.subjectIsTrade) return '';
  const noun = frame.noun || '';
  // "עזרה ב" ends in a preposition that is attached to the next word, so the
  // subject follows with no space: "עזרה בפירוק רהיטים", never "עזרה ב פירוק
  // רהיטים" — and equally never "הובלה שלרהיט", where "של" is a whole word.
  const lastWord = noun.trim().split(/\s+/).pop() || '';
  const glue = /^(ב|ל|מ|ה|כ)$/.test(lastWord) ? '' : ' ';
  let s = noun ? `אני צריך ${noun}${glue}${parts.subject}` : `אני צריך ${parts.subject}`;
  if (parts.place) s += ` ${parts.place}`;
  if (parts.count) {
    const c = countClause(parts.count.key, parts.count.value, 'ב־', parts.count.label);
    if (c) s += ` ${c}`;
  }
  if (parts.tail.length) s += `, ${joinHe(parts.tail)}`;
  return `${s}.`;
}

/**
 * "אני צריך עזרה בהרכבת פריט ריהוט אחד מקופסה, כמו רהיט של IKEA."
 *
 * Flat-pack assembly has a count whose noun is the thing itself, so it is the
 * one place a count is allowed into the middle of the sentence — and the reason
 * "פריט אחד פריטים" can no longer be produced.
 */
function composeCarpentry(parts) {
  const subject = parts.subject || '';
  if (/הרכבת ר(יהוט|היטים) מקופסה/.test(subject)) {
    const count = parts.count ? countClause(parts.count.key, parts.count.value, '', parts.count.label) : '';
    let s = count
      ? `אני צריך עזרה בהרכבת ${count} מקופסה`
      : 'אני צריך עזרה בהרכבת רהיט מקופסה';
    if (parts.brand) s += parts.brand;
    if (parts.tail.length) s += `, ${joinHe(parts.tail)}`;
    return `${s}.`;
  }
  return composeNeed(parts, { noun: 'עזרה ב' });
}

/** A standing service with one fixed opening line and the details after it. */
function composeAssist(parts, frame) {
  let s = frame.open || '';
  if (!s) return '';
  if (parts.place) s += ` ${parts.place}`;
  if (parts.duration) {
    const d = durationClause(parts.duration.key, parts.duration.value, '');
    if (d) s += `, ${d.text}`;
  }
  if (parts.tail.length) s += `, ${joinHe(parts.tail)}`;
  return `${s}.`;
}

/** A trade with no fault named: "מחפש אינסטלטור במטבח, הבעיה נמשכת כמה ימים." */
function composeTrade(parts, frame) {
  const role = frame.role || TRADE_ROLE[frame.key] || '';
  if (!role) return '';
  let s = `מחפש ${role}`;
  if (parts.place) s += ` ${parts.place}`;
  const tail = [];
  if (parts.duration) {
    // No subject was named, so the duration names the problem itself — which is
    // the gender-free form and therefore never a wrong ending.
    const d = durationClause(parts.duration.key, parts.duration.value, '');
    if (d) tail.push(d.text);
  }
  tail.push(...parts.tail);
  const kept = tail.filter(Boolean);
  if (kept.length) s += `, ${joinHe(kept)}`;
  return `${s}.`;
}

const COMPOSERS = {
  repair: composeRepair,
  event: composeEvent,
  need: composeNeed,
  carpentry: composeCarpentry,
  assist: composeAssist,
  trade: composeTrade,
};

/** Build the sentence for one frame. '' means "leave this to the publisher". */
export function composeSentence(parts, frame) {
  const composer = COMPOSERS[frame.kind];
  if (!composer) return '';
  const sentence = composer(parts, frame);
  // One space between words, no space before a full stop.
  return String(sentence).replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

// Re-exported so the builder has a single import for the whole layer.
export { roleOfField };