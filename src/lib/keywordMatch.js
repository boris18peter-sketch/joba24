/**
 * keywordMatch — "does this text actually SAY this word?"
 *
 * ── WHY A SUBSTRING TEST IS THE WRONG ANSWER ────────────────────────────────
 * Every category in the app carries a list of words it recognises, and those
 * words were matched with `text.includes(word)`. In Hebrew that is a trap, because
 * a word is built by gluing prefixes onto a three-letter root and the same letters
 * begin a dozen unrelated words:
 *
 *     "הרכבת שולחן אוכל"   (assembling a dining table)
 *     → contains "רכב"    (a vehicle)  → "this looks like 🚗 רכב"
 *
 * The publisher picked הנדימן, wrote the most ordinary handyman job there is, and
 * the form told them it looked like a car. Matching a WORD has to mean matching a
 * word.
 *
 * ── WHAT "THE SAME WORD" MEANS IN HEBREW ────────────────────────────────────
 * Two words are the same when one is the other with a prefix letter in front
 * (ה/ו/ב/כ/ל/מ/ש) — "הרכבה" and "מהרכבה" — and, generously, when they share a
 * long stem and differ only in a short ending ("הרכבה" / "הרכבת"). "רכב" shares
 * only two letters with "הרכבת", so it no longer matches it.
 *
 * ── AND WHY THAT GENEROSITY IS ONLY ALLOWED ONE WAY ─────────────────────────
 * `fuzzy` is passed per call, on purpose:
 *   · the word the publisher CHOSE gets the generous reading, so a text that
 *     plausibly belongs to the chosen service is never accused of belonging
 *     somewhere else;
 *   · a DIFFERENT category is only ever named on an exact word, so the form can
 *     never tell a publisher their job looks like something it is not.
 */

/** Hebrew letters that are glued in front of a word rather than part of it. */
const PREFIX_LETTERS = new Set(['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש']);

/** Words of a text, lowercased, punctuation and emoji dropped. */
export function tokensOf(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * The word without the prefix letters glued to its front.
 *
 * TWO, not one: Hebrew stacks them — "מהברז" is מ + ה + ברז — and stopping at
 * one letter left the commonest forms ("מהברז", "שבבית") unmatched. A strip only
 * happens while at least three letters remain, so a real word is never eaten.
 */
function withoutPrefix(token) {
  let word = token;
  for (let step = 0; step < 2; step += 1) {
    if (word.length < 4 || !PREFIX_LETTERS.has(word[0])) break;
    word = word.slice(1);
  }
  return word;
}

function commonPrefixLength(a, b) {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1;
  return index;
}

/** One word against one keyword word. */
function wordMatches(token, keyword, fuzzy) {
  if (token === keyword) return true;
  if (withoutPrefix(token) === keyword) return true;
  if (withoutPrefix(token) === withoutPrefix(keyword)) return true;
  if (!fuzzy) return false;
  // Same stem, different ending: "הרכבה" / "הרכבת", "תיקון" / "תיקונים".
  const shared = commonPrefixLength(token, keyword);
  return shared >= 4 && token.length - shared <= 2 && keyword.length - shared <= 2;
}

/**
 * Is any of these keywords present in the text, as words?
 *
 * @param fuzzy  allow the stem-and-ending reading (see the file comment)
 */
export function textMentions(text, keywords = [], { fuzzy = true } = {}) {
  const words = tokensOf(text);
  if (!words.length) return false;

  for (const raw of keywords) {
    const phrase = tokensOf(raw);
    if (!phrase.length) continue;
    // A multi-word keyword ("לוח חשמל") must appear as consecutive words.
    for (let start = 0; start + phrase.length <= words.length; start += 1) {
      let all = true;
      for (let offset = 0; offset < phrase.length; offset += 1) {
        if (!wordMatches(words[start + offset], phrase[offset], fuzzy)) {
          all = false;
          break;
        }
      }
      if (all) return true;
    }
  }
  return false;
}

/** How many of these keywords the text contains, as words. */
export function countKeywordHits(text, keywords = [], { fuzzy = false } = {}) {
  let hits = 0;
  for (const keyword of keywords) {
    if (textMentions(text, [keyword], { fuzzy })) hits += 1;
  }
  return hits;
}