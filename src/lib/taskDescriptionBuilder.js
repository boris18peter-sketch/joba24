/**
 * taskDescriptionBuilder.js — turns the answers a publisher already gave in the
 * category form into ONE natural Hebrew sentence.
 *
 * ── THE PROBLEM THIS REPLACES ───────────────────────────────────────────────
 * The first version read the form's answers and joined them into
 * "אני צריך <category>, <answer>, <answer> ו<answer>". It was a transcript of the
 * taps, and it produced sentences nobody would write:
 *
 *   "אני צריך נזילה, במטבח וכמה ימים הבעיה קיימת."   ← needs a leak; a field
 *                                                     LABEL leaked into the text
 *   "אני צריך תקליטנים, טכנו, 2 שעות ויום הולדת."     ← a list of taps
 *   "אני צריך נגרות של הרכבת ריהוט מקופסה, פריט אחד פריטים."
 *                                                     ← "פריטים" duplicated
 *
 * Three separate faults, each fixed at its own layer:
 *
 *   1. NO SINGLE TEMPLATE. The sentence is chosen by what the job IS — a fault
 *      to fix, a role to book, a job to be done (frames.js). A leak is something
 *      you HAVE; a DJ is someone you BOOK.
 *   2. ROLES, NOT ORDER. Every field is understood by its meaning — the stable
 *      KEY first, its label only as a fallback — so a value enters the sentence
 *      where it belongs and in the right form ("2 שעות" → "למשך שעתיים",
 *      "פריט אחד" → "פריט ריהוט אחד", "מטבח" → "במטבח") (phrasing.js).
 *   3. ONLY WHAT WAS ACTUALLY CHOSEN. A field's LABEL, its placeholder, and a
 *      question that is currently hidden are never read. A toggle counts only
 *      when it holds a real true/false.
 *
 * ── WHY THIS IS NOT AI ──────────────────────────────────────────────────────
 * The information is already in the form. Sending it to a model to have it
 * written back as a sentence would cost a round trip, cost money, and could
 * invent a detail the publisher never chose. This is a local, synchronous
 * composition over data already in memory: no network, no server write, no state
 * of its own.
 *
 * ── WHEN IT SAYS NOTHING ────────────────────────────────────────────────────
 * A category with no frame and no recognisable question returns ''. The field is
 * then the publisher's to write, which is the right outcome — an empty field
 * beats a sentence that reads as broken.
 */

import { isFieldVisible } from '@/lib/brand/globalCategories';
import { isRealAnswer, roleOfField } from './taskDescription/phrasing';
import { assembleParts, composeSentence, resolveFrame } from './taskDescription/frames';

/**
 * @param categoryKey    the stable category key (GlobalCategory.category_key) —
 *                       the frame is chosen by this, never by the label text.
 * @param categoryLabel  the display label, used only as the fault's own noun
 *                       ("💧 נזילה" → "נזילה").
 * @param fields         the category's dynamic questions, as the form renders them.
 * @param values         the answers, exactly as they are stored on the task.
 * @returns a natural Hebrew sentence, or '' when there is nothing to say.
 */
export function buildTaskDescription({ categoryKey, categoryLabel, fields, values }) {
  if (!Array.isArray(fields) || !fields.length || !values) return '';

  const answers = [];
  for (const field of fields) {
    // A question that is currently HIDDEN cannot have been answered for this
    // task: its value is left over from a choice the publisher has since
    // changed, and printing it would state something they did not choose.
    if (!isFieldVisible(field, values)) continue;
    const raw = values[field.key];
    // The one gate that keeps a label, a placeholder or an untouched field out
    // of the sentence.
    if (!isRealAnswer(field, raw)) continue;
    answers.push({ key: field.key, role: roleOfField(field), label: field.label || '', raw });
  }

  if (!answers.length) return '';

  const frame = resolveFrame(categoryKey, answers, categoryLabel);
  if (frame.kind === 'none') return '';

  const parts = assembleParts(answers, categoryLabel, frame);
  return composeSentence(parts, frame);
}

export default buildTaskDescription;