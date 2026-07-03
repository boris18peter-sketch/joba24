/**
 * Vertical Engine — Specialized Vertical Configurations Registry
 * ───────────────────────────────────────────────────────────────────────────
 * Layer 2 of the 3-layer config merge.
 *
 * Each file in this directory exports a specialized config object for one
 * category. The registry maps category IDs to their specialized configs.
 *
 * To add a new specialized vertical:
 *   1. Create {categoryId}.js exporting {CATEGORY_ID}_VERTICAL
 *   2. Import it here and add to SPECIALIZED_VERTICALS
 *
 * If a category has no specialized file, it falls through to generic defaults.
 */

import { PLUMBING_VERTICAL } from './plumbing';

// Registry: category ID → specialized config
export const SPECIALIZED_VERTICALS = {
  plumbing: PLUMBING_VERTICAL,
};

/**
 * Get the specialized config for a category, or null if none exists.
 * (The engine falls through to generic defaults when this returns null.)
 */
export function getSpecializedVerticalConfig(category) {
  return SPECIALIZED_VERTICALS[category] || null;
}

/**
 * Check if a category has a specialized config.
 */
export function hasSpecializedVertical(category) {
  return category in SPECIALIZED_VERTICALS;
}

/**
 * List all category IDs that have specialized configs.
 */
export function getSpecializedVerticalIds() {
  return Object.keys(SPECIALIZED_VERTICALS);
}