/**
 * liveActivityContent — detect when a CATEGORY'S WORDING changed, so a running
 * Live Activity can be re-worded without touching the task.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Every visible string on the Lock Screen comes from a GlobalCategory row (its
 * own or an ancestor's), resolved through the same contract the app's banner
 * uses. That content is editable, but editing it changes nothing about the
 * Task: no field moves, so `updated_date` does not move, so the revision a
 * dispatch carries does not move. A revision-only pipeline therefore cannot
 * notice a re-worded step at all — the card keeps the old words for ever.
 *
 * This module turns the RESOLVED presentation of a category into a fingerprint.
 * Two runs with the same fingerprint would render identically; a different one
 * means at least one visible string changed.
 *
 * ── WHAT IS IN THE FINGERPRINT ─────────────────────────────────────────────
 * Only what the contract can put on the card:
 *   • the resolved flow (steps, their labels and icons, the CTA labels, proof)
 *   • the category label the card prints under the title
 *   • the category icon key
 * Deliberately NOT in it: descriptions, examples, form fields, fees, ordering,
 * anything else a category row carries — editing those must never cost a push.
 *
 * ── INHERITANCE IS THE WHOLE POINT ────────────────────────────────────────
 * The fingerprint is computed from `resolveStatusFlow`, i.e. from the MERGED
 * generic → root → service flow. A child service that declares no flow of its
 * own therefore inherits its root's, and re-wording the ROOT changes every
 * child's fingerprint automatically. Nothing has to enumerate children.
 *
 * ── CODE DEPLOYMENTS: THE VERSION CONSTANT ────────────────────────────────
 * A deploy can change the contract's own output (a new phase name, a re-worded
 * generic fallback) without any row changing, so no entity event fires. Bumping
 * PRESENTATION_VERSION is part of the fingerprint, so the next scan sees every
 * category as changed and refreshes every running card. That is the versioned
 * reconciliation mechanism: one number, reviewed in the diff, no timers needed
 * for correctness — the periodic scan is only an optimisation.
 */

import { resolveStatusFlow, categoryLabelFor } from './liveActivityFlow.ts';

/**
 * Bump when the CONTRACT's visible output changes in code (not when a category
 * row is edited). Every category is then treated as changed once.
 */
export const PRESENTATION_VERSION = 2;

/** Steps whose CTA can appear on a card, in canonical order. */
const CTA_KEYS = ['on_the_way', 'arrived', 'done'];

/**
 * A stable, order-independent 32-bit FNV-1a hash. Change detection only — it is
 * never used for authentication, so a fast non-cryptographic hash is right: it
 * is synchronous (no Web Crypto), identical in Deno and in a test runner, and
 * the collision risk over a handful of category strings is irrelevant because a
 * collision can only ever cause a MISSED refresh, never a wrong one.
 */
export function hashContent(input) {
  const str = String(input ?? '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * The canonical string of everything this category can show. Exported so a test
 * (and a human debugging a false positive) can read exactly what was compared,
 * instead of a hash of an unknown payload.
 */
export function categoryContentKey(categoryKey, categories, version = PRESENTATION_VERSION) {
  const flow = resolveStatusFlow(categoryKey, categories);
  const row = (Array.isArray(categories) ? categories : []).find((c) => c && c.category_key === categoryKey) || null;
  return JSON.stringify({
    v: version,
    key: categoryKey,
    label: categoryLabelFor(categoryKey, categories),
    icon: row?.icon || '',
    steps: flow.steps.map((s) => [s.key, s.label, s.owner_label, s.icon]),
    cta: CTA_KEYS.map((k) => [k, flow.cta[k].label, flow.cta[k].emoji, flow.cta[k].confirm_title, flow.cta[k].confirm_sub]),
    proof: [flow.proof.label, flow.proof.sub],
  });
}

export function categoryFingerprint(categoryKey, categories, version = PRESENTATION_VERSION) {
  return hashContent(categoryContentKey(categoryKey, categories, version));
}

/** fingerprint for every category row that has a key. */
export function fingerprintCategories(categories, version = PRESENTATION_VERSION) {
  const out = {};
  for (const row of Array.isArray(categories) ? categories : []) {
    if (!row || !row.category_key) continue;
    out[row.category_key] = categoryFingerprint(row.category_key, categories, version);
  }
  return out;
}

/**
 * Compare what is stored with what the rows now say.
 *
 * `baseline` is a key seen for the FIRST time: it is recorded, but never
 * dispatched — the system has no evidence a card is showing the old wording, and
 * treating a new category as a change would fire a refresh on every deploy that
 * adds one.
 */
export function detectContentChanges({ previous = [], current = {} } = {}) {
  const stored = new Map();
  for (const row of Array.isArray(previous) ? previous : []) {
    if (row && row.category_key) stored.set(row.category_key, row);
  }

  const baseline = [];
  const changed = [];
  const unchanged = [];

  for (const [key, fingerprint] of Object.entries(current)) {
    const row = stored.get(key);
    if (!row) {
      baseline.push(key);
      continue;
    }
    if (String(row.fingerprint || '') !== String(fingerprint)) changed.push(key);
    else unchanged.push(key);
  }

  // A category removed from the catalogue cannot be showing a card any more.
  const removed = [...stored.keys()].filter((key) => !(key in current));

  return { baseline, changed, unchanged, removed };
}

/**
 * Every category that could be DISPLAYING a changed flow: the changed keys
 * themselves plus all their descendants, because a child inherits its ancestor's
 * wording. Depth-bounded like the resolver, so a malformed parent cycle cannot
 * loop here either.
 */
export function affectedCategoryKeys(changedKeys, categories) {
  const keys = Array.isArray(changedKeys) ? changedKeys.filter(Boolean) : [];
  if (!keys.length) return [];
  const all = Array.isArray(categories) ? categories : [];

  const affected = new Set(keys);
  let frontier = [...keys];
  for (let depth = 0; depth < 6 && frontier.length; depth += 1) {
    const next = [];
    for (const row of all) {
      if (!row || !row.category_key || affected.has(row.category_key)) continue;
      if (row.parent_key && frontier.includes(row.parent_key)) {
        affected.add(row.category_key);
        next.push(row.category_key);
      }
    }
    frontier = next;
  }
  return [...affected];
}

/** How long to wait before retrying a category whose dispatch failed. */
export function retryDelayMs(attempts) {
  const n = Number.isFinite(Number(attempts)) ? Math.max(1, Math.floor(Number(attempts))) : 1;
  return Math.min(n, 6) * 2 * 60 * 1000;
}

/** Give up after this many failed attempts, and say so instead of spinning. */
export const MAX_CONTENT_REFRESH_ATTEMPTS = 5;

/**
 * Should this pending version row be attempted now?
 * A row that is not pending, or is backing off, is skipped — this is the rate
 * limit between a repeated failure and the next APNs call, not a timer loop.
 */
export function isDue(row, now = Date.now()) {
  if (!row || !row.pending) return false;
  if (Number(row.attempts) >= MAX_CONTENT_REFRESH_ATTEMPTS) return false;
  const due = Date.parse(row.next_attempt_at || '');
  return !Number.isFinite(due) || due <= now;
}

/**
 * What to store after a refresh pass for one category.
 *
 * A pass that produced no failure is done, whatever it did: it either refreshed
 * the cards, found nothing worth pushing (an identical picture is a duplicate),
 * or found nobody to push to. Only a real failure keeps the change open, and it
 * is retried on a backoff, at most MAX_CONTENT_REFRESH_ATTEMPTS times — after
 * that the row stays visible with `gave_up` instead of retrying for ever.
 */
export function nextVersionState({ attempts = 0, failures = 0, result = '', error = '', now = Date.now() } = {}) {
  const at = new Date(now).toISOString();
  if (failures > 0) {
    const used = Math.max(0, Math.floor(Number(attempts) || 0)) + 1;
    const gaveUp = used >= MAX_CONTENT_REFRESH_ATTEMPTS;
    return {
      pending: !gaveUp,
      attempts: used,
      next_attempt_at: gaveUp ? null : new Date(now + retryDelayMs(used)).toISOString(),
      last_dispatch_at: at,
      last_result: gaveUp ? 'gave_up' : 'retry_scheduled',
      last_error: error || 'dispatch_failed',
    };
  }
  return {
    pending: false,
    attempts: 0,
    next_attempt_at: null,
    last_dispatch_at: at,
    last_result: result || 'refreshed',
    last_error: '',
  };
}