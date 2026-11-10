/**
 * taskTextChecks — the two text checks the publish form runs before it lets a
 * task go out: "is this text actually words?" and "does it describe the service
 * that was chosen?".
 *
 * Both used to live inside the 2,500-line publish page. They are pure functions
 * with no React state, so they belong in one readable place — and living there
 * hid a real defect: the gibberish check declared `const t = text.trim()`, which
 * SHADOWED the translation function it then called. Any description that tripped
 * one of its rules threw instead of returning a message, so the publish handler
 * died with no toast, no banner and no scroll — exactly the "I press publish and
 * nothing happens" the publisher reported, and impossible to see from the form.
 * The translator is passed in explicitly here, so it cannot be shadowed again.
 *
 * Every keyword comes from the category catalogue itself (a service inherits its
 * parent's list), so nothing is hardcoded and a new category needs no code.
 */
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { getCategoryKeywords } from '@/lib/taskFlowConfig';

/**
 * Text that is not words at all — random key mashing, a wall of one repeated
 * character, or Hebrew pressed without any vowel letter.
 *
 * @returns a ready-to-show sentence, or null when the text is fine.
 */
export function checkGibberish(text, fieldLabel, translate) {
  const say = typeof translate === 'function' ? translate : (key) => key;
  const label = fieldLabel || say('ct_field_text');
  if (!text || text.trim().length < 4) return null;

  const value = text.trim();
  if (value.length < 5) return null;

  const hebrewLetters = value.replace(/[^א-ת]/g, '');
  const words = value.split(/\s+/).filter((w) => w.length > 0);

  if (words.length > 0) {
    // Hebrew words are usually 2–8 characters; gibberish is often single letters
    // separated by spaces.
    const tinyWords = words.filter((w) => {
      const letters = w.replace(/[^א-ת]/g, '');
      return letters.length > 0 && letters.length <= 1;
    }).length;
    const tinyRatio = tinyWords / words.length;
    if (tinyRatio > 0.65 && words.length >= 3) {
      return say('ct_gibberish_invalid', { field: label });
    }
  }

  // Five or more of the same character in a row ("חחחחח", "-----", "!!!!!").
  if (/(.)\1{4,}/.test(value)) {
    return say('ct_gibberish_repeat', { field: label });
  }

  // All-consonant Hebrew with no vowel helper (e.g. "לבגבמצ").
  if (hebrewLetters.length >= 4) {
    const vowelCount = (hebrewLetters.match(/[אויהא]/g) || []).length;
    const ratio = vowelCount / hebrewLetters.length;
    if (ratio < 0.05 && hebrewLetters.length > 6) {
      return say('ct_gibberish_random', { field: label });
    }
  }

  return null;
}

/**
 * Does the title + description describe the service that was chosen?
 *
 * @returns a ready-to-show sentence naming both the category the text looks like
 *          and the one that was selected, or null when they agree.
 */
export function checkCategoryDescriptionMatch({ category, description, title = '', translate } = {}) {
  const say = typeof translate === 'function' ? translate : (key) => key;
  if (!category || category === 'other') return null;

  const keywords = getCategoryKeywords(category) || [];
  if (!keywords.length) return null;

  const combined = `${title} ${description}`.toLowerCase();
  if (combined.trim().length < 15) return null;

  const hasMatch = keywords.some((keyword) => combined.includes(String(keyword).toLowerCase()));
  if (hasMatch) return null;

  // The text may clearly belong to a DIFFERENT trade — naming it is what turns
  // the message into something the publisher can act on.
  for (const other of CATEGORIES) {
    if (other.value === category || other.value === 'other') continue;
    const otherKeywords = getCategoryKeywords(other.value) || [];
    if (otherKeywords.some((keyword) => combined.includes(String(keyword).toLowerCase()))) {
      return say('ct_cat_mismatch_detected', {
        detected: getCategoryLabel(other.value, say),
        selected: getCategoryLabel(category, say),
      });
    }
  }

  return say('ct_cat_mismatch_generic', { selected: getCategoryLabel(category, say) });
}