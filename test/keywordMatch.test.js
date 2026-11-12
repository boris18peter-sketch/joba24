import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textMentions, countKeywordHits, tokensOf } from '../src/lib/keywordMatch.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(ROOT, path), 'utf8');

/**
 * "does this text actually SAY this word?"
 *
 * ── THE REPORT THIS LOCKS DOWN ──────────────────────────────────────────────
 * A publisher chose הנדימן (handyman), wrote "הרכבת שולחן אוכל" (assembling a
 * dining table), and the form announced "הכותרת והתיאור נראים כמו 🚗 רכב" — a car
 * job. The word for a vehicle is "רכב"; the word they wrote is "הרכבת". The first
 * four letters of the one sit inside the other, which is all `includes()` ever
 * checked.
 *
 * Matching a word has to mean matching a word: a whole token, optionally with
 * one Hebrew prefix letter glued to its front, and — only when the generous
 * reading is allowed — the same stem with a different short ending.
 */

describe('Hebrew keyword matching', () => {
  const say = (key, vars) => `${key}${vars ? ':' + JSON.stringify(vars) : ''}`;

  it('never reads a word out of the middle of another word', () => {
    expect(textMentions('הרכבת שולחן אוכל', ['רכב'])).toBe(false);
    expect(textMentions('הרכבת שולחן אוכל', ['רכב'], { fuzzy: true })).toBe(false);
    // The same token WITH a real vehicle in it still matches.
    expect(textMentions('הרכב שלי לא מתניע', ['רכב'])).toBe(true);
    expect(textMentions('תקלת רכב בכביש', ['רכב'])).toBe(true);
  });

  it('accepts a glued prefix letter, which is how Hebrew builds words', () => {
    expect(textMentions('צריך אינסטלטור דחוף', ['אינסטלטור'])).toBe(true);
    expect(textMentions('נזילה מהברז במטבח', ['ברז'])).toBe(true);
    expect(textMentions('החלפת מנעול בדלת', ['מנעול'])).toBe(true);
    expect(textMentions('לצבוע את הקיר', ['קיר'])).toBe(true);
  });

  it('allows a stem with a different ending only when asked to', () => {
    // "הרכבה" (assembly) and "הרכבת" (assembling) — the same job, written twice.
    expect(textMentions('הרכבת שולחן אוכל', ['הרכבה'], { fuzzy: true })).toBe(true);
    // A DIFFERENT trade is never named on a stem: an accusation must be certain.
    expect(textMentions('הרכבת שולחן אוכל', ['הרכבה'], { fuzzy: false })).toBe(false);
  });

  it('matches a multi-word keyword only as consecutive words', () => {
    expect(textMentions('צריך לתקן לוח חשמל בכניסה', ['לוח חשמל'])).toBe(true);
    expect(textMentions('לוח עץ ליד החשמל', ['לוח חשמל'])).toBe(false);
  });

  it('drops punctuation and emoji instead of breaking the word', () => {
    expect(tokensOf('הרכבת שולחן, אוכל!')).toEqual(['הרכבת', 'שולחן', 'אוכל']);
    expect(textMentions('נזילה 💧 מהברז', ['ברז'])).toBe(true);
  });

  it('counts hits per keyword, not per occurrence', () => {
    expect(countKeywordHits('ברז מטפטף, ברז נוסף', ['ברז'])).toBe(1);
    expect(countKeywordHits('ברז וצנרת', ['ברז', 'צנרת', 'דוד'])).toBe(2);
  });

  it('scores a service by words, so a handyman job never scores as a car job', () => {
    const carWords = ['רכב', 'מוסך', 'מכונאי'];
    expect(countKeywordHits('הרכבת שולחן אוכל', carWords)).toBe(0);
    expect(countKeywordHits('הרכב שלי לא מתניע', carWords)).toBe(1);
  });

  // ── AND THE TWO CALLERS MUST USE IT ───────────────────────────────────────
  // Read as source, because both live inside modules that pull in the SDK: what
  // matters is that neither of them still reads half a word with `includes()`.
  it('is the only way the form decides a text looks like another trade', () => {
    const checks = read('src/lib/taskTextChecks.js');
    expect(checks).toContain('textMentions(combined, keywords, { fuzzy: true })');
    expect(checks).toContain('textMentions(combined, otherKeywords, { fuzzy: false })');
    expect(checks).not.toContain('combined.includes(');

    const match = read('src/lib/descriptionCategoryMatch.js');
    expect(match).toContain('countKeywordHits(text, keywords, { fuzzy })');
    expect(match).not.toContain('combined.includes(needle)');
  });
});