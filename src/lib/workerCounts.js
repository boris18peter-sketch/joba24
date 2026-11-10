import { rootOf } from '@/lib/brand/categoryTree';

/**
 * ── ONE SOURCE OF TRUTH FOR "HOW MANY PROFESSIONALS OFFER THIS CATEGORY" ────
 *
 * Every count in the app is answered here, from ONE input: the public worker
 * pool (useWorkerPool). The category tiles in the feed, the count inside the
 * publish form, the boost sheet and the search overlay all call these functions,
 * so they can never disagree with each other — which they did: the tiles
 * compared a professional's categories with a leaf service by EXACT key and
 * showed 2 for plumbing, while the form read the pre-aggregated record and
 * showed 39. Two different numbers for the same trade, both "live".
 *
 * ── AND WHY IT IS COUNTED PER PARENT CATEGORY ──────────────────────────────
 * A professional says what they DO ("אינסטלציה"), not which exact job they would
 * take ("בעיית אינסטלציה אחרת"). So every category a person listed is resolved
 * to its canonical ROOT and the person is counted once for that root. Picking a
 * sub-service in the publish form therefore cannot change the number: it is the
 * same trade either way, and a count that drops when a publisher narrows the
 * service reads as "nobody does this" when the opposite is true.
 */

/** The canonical root key of any category key (itself when it is already a root). */
export function rootKeyFor(key, map) {
  if (!key) return '';
  const row = map?.[key];
  if (!row) return key;
  return rootOf(row, map)?.category_key || key;
}

/** Every distinct root category a professional offers. */
export function workerRootKeys(worker, map) {
  const roots = new Set();
  for (const key of worker?.preferred_categories || []) {
    const root = rootKeyFor(key, map);
    if (root) roots.add(root);
  }
  return roots;
}

/** Same lenient city comparison the pool scanner has always used. */
export function cityMatches(worker, city) {
  const wanted = String(city || '').split(',')[0].trim().toLowerCase();
  if (!wanted) return true;
  const home = String(worker?.city || '').toLowerCase();
  const cities = (worker?.preferred_cities || []).map((c) => String(c).toLowerCase());
  if (home && (home.includes(wanted) || wanted.includes(home))) return true;
  return cities.some((c) => !!c && (c.includes(wanted) || wanted.includes(c)));
}

/**
 * How many professionals are available for a category — and, when a city is
 * given, in that city. A person is counted ONCE per root, however many services
 * beneath it they listed.
 */
export function countWorkers(pool, map, { category, city } = {}) {
  const root = category ? rootKeyFor(category, map) : '';
  let count = 0;
  for (const worker of pool || []) {
    const roots = workerRootKeys(worker, map);
    if (!roots.size) continue;
    if (root && !roots.has(root)) continue;
    if (!cityMatches(worker, city)) continue;
    count += 1;
  }
  return count;
}

/** The same count, for every root category at once — one pass over the pool. */
export function countsByRoot(pool, map) {
  const counts = {};
  for (const worker of pool || []) {
    for (const root of workerRootKeys(worker, map)) counts[root] = (counts[root] || 0) + 1;
  }
  return counts;
}

/** A catch-all category ("אחר", "בעיית X אחרת") is always listed last. */
export function isOtherKey(key) {
  return key === 'other' || /_other$/.test(key || '');
}