/**
 * ratingConfig — WHICH tags the reviewer is offered, and in whose words.
 *
 * ── Why the taxonomy decides, not a flat list ──────────────────────────────
 * The tag set used to be chosen from a flat table of 26 legacy category keys.
 * The catalogue has since grown into a taxonomy of roots and services
 * (elec_panel, djs, event_setup, waiters…), so every category that was not one
 * of those 26 fell through to the plumber's tags: a DJ was asked whether they
 * "arrived on time" and never whether the party actually worked.
 *
 * A category's family is therefore resolved by walking it UP the GlobalCategory
 * catalogue to the nearest ancestor the table knows. A legacy key still
 * resolves exactly as it always did, so nothing already stored changes.
 *
 * The stored `key` is the Review field the tag writes to (arrivedOnTime,
 * professional, goodCommunication, fairPricing, wouldHireAgain) and NEVER
 * changes — only the wording does, so an existing review keeps its meaning.
 */

/** Category key (legacy or taxonomy root) → workflow family. */
export const RATING_WORKFLOW = {
  // Legacy flat keys — kept verbatim so an existing task is unaffected.
  plumbing: 'onsite_service',
  electricity: 'onsite_service',
  handyman: 'onsite_service',
  cleaning: 'onsite_service',
  carpentry: 'onsite_service',
  ac: 'onsite_service',
  locksmith: 'onsite_service',
  painting: 'onsite_service',
  gardening: 'onsite_service',
  home_maintenance: 'onsite_service',
  it_support: 'onsite_service',
  personal_help: 'onsite_service',
  car: 'onsite_service',
  other: 'onsite_service',
  delivery: 'delivery',
  transportation: 'delivery',
  shopping: 'delivery',
  babysitting: 'care',
  elderly_care: 'care',
  pets: 'care',
  tutoring: 'session',
  fitness: 'session',
  photography: 'creative',
  events: 'creative',
  moving: 'moving',
  heavy_lifting: 'moving',

  // Taxonomy roots — a service hanging off one of these inherits its family.
  parent_home: 'onsite_service',
  parent_cleaning: 'onsite_service',
  parent_personal: 'onsite_service',
  parent_digital: 'onsite_service',
  parent_transport: 'delivery',
  parent_care: 'care',
  parent_learning: 'session',
  parent_events: 'creative',
  parent_moving: 'moving',
};

const DEFAULT_WORKFLOW = 'onsite_service';

/**
 * The workflow family of a category.
 *
 * `map` is the GlobalCategory catalogue (useGlobalCategories().map). Without it
 * only the legacy keys resolve — the previous behaviour exactly — so a caller
 * that has no catalogue yet can never break a task that used to work.
 */
export function resolveRatingWorkflow(category, map) {
  if (!category) return DEFAULT_WORKFLOW;
  if (RATING_WORKFLOW[category]) return RATING_WORKFLOW[category];
  if (!map) return DEFAULT_WORKFLOW;

  // Walk up to the nearest ancestor the table knows — the most specific family
  // available. Guarded, so a malformed parent chain can never spin.
  let node = map[category];
  for (let i = 0; i < 10 && node?.parent_key; i++) {
    if (RATING_WORKFLOW[node.parent_key]) return RATING_WORKFLOW[node.parent_key];
    node = map[node.parent_key];
  }
  return DEFAULT_WORKFLOW;
}

/** "Professional" is the one tag whose wording genuinely differs per family. */
const PRO_KEY = {
  delivery: 'rc_chip_pro_delivery',
  care: 'rc_chip_pro_care',
  session: 'rc_chip_pro_session',
  creative: 'rc_chip_pro_creative',
  moving: 'rc_chip_pro_moving',
};

/** A delivery's "on time" is about the drop-off, not about arriving. */
const ONTIME_KEY = { delivery: 'rc_chip_ontime_delivery' };

/**
 * The tags shown to the reviewer, as { key, labelKey } pairs.
 * `isOwner` is the publisher rating the worker; otherwise the worker rates the
 * publisher — a different question, so a different set.
 */
export function ratingChips(workflow, isOwner) {
  if (isOwner) {
    return [
      { key: 'arrivedOnTime', labelKey: ONTIME_KEY[workflow] || 'rc_chip_ontime' },
      { key: 'professional', labelKey: PRO_KEY[workflow] || 'rc_chip_pro' },
      { key: 'goodCommunication', labelKey: 'rc_chip_comm' },
      { key: 'fairPricing', labelKey: 'rc_chip_price' },
      { key: 'wouldHireAgain', labelKey: 'rc_chip_again' },
    ];
  }
  return [
    { key: 'arrivedOnTime', labelKey: 'rc_chip_ontime_w' },
    { key: 'goodCommunication', labelKey: 'rc_chip_comm_w' },
    { key: 'fairPricing', labelKey: 'rc_chip_price_w' },
    { key: 'wouldHireAgain', labelKey: 'rc_chip_again_w' },
  ];
}