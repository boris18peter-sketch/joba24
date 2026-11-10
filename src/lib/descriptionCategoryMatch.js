/**
 * descriptionCategoryMatch — which OFFERED service does this text describe?
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The publish form asks for the service FIRST and the description after it, but
 * people write the other way round: they describe the job in their own words and
 * pick a service from a list that may not use the same word. When the two
 * disagreed the form only drew a small orange line under the field, and the
 * publish then failed on the server with no explanation — the publisher was left
 * with "it doesn't publish and I don't know why".
 *
 * The service is therefore allowed to FOLLOW the description. Every keyword is
 * already in the app (each category owns its own list, and a service inherits
 * its parent's), so this is a local decision with no request and no AI call.
 *
 * It NEVER guesses against the publisher: it only answers when the selected
 * service has no keyword in the text at all and another OFFERED service does.
 * A tie is broken toward the broader category, because "אינסטלציה" is right when
 * the text says "מטפטף" — the exact job can stay the publisher's to refine.
 */
import { ancestorsOf } from '@/lib/brand/categoryTree';

/** How many of a service's own keywords the text contains. */
export function keywordScore(text, keywords = []) {
  const combined = String(text || '').toLowerCase();
  if (!combined.trim()) return 0;
  let hits = 0;
  for (const keyword of keywords) {
    const needle = String(keyword || '').trim().toLowerCase();
    if (!needle) continue;
    if (combined.includes(needle)) hits += 1;
  }
  return hits;
}

/**
 * The offered service this text describes, or null.
 *
 * @param text        title + description, as the publisher wrote it
 * @param services    the OFFERED service keys (the Brand's own catalogue)
 * @param keywordsFor (key) => string[] — a service's keywords, parent-inclusive
 * @param map         the global category map, used only to break a tie
 * @param currentKey  the service already selected; returned unchanged when it
 *                    matches, so a matching choice is never traded for another
 */
export function bestServiceForText({ text, services, keywordsFor, map, currentKey }) {
  const combined = String(text || '');
  if (combined.trim().length < 12) return null;

  const scores = (services || []).map((key) => ({
    key,
    score: keywordScore(combined, keywordsFor(key)),
    depth: ancestorsOf(map?.[key], map || {}).length,
  }));

  const current = scores.find((entry) => entry.key === currentKey);
  if (current && current.score > 0) return currentKey;

  const best = scores
    .filter((entry) => entry.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.depth - b.depth))[0];

  return best ? best.key : null;
}