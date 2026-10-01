/**
 * Brand marketplace settings (Brand Manager).
 *
 * A Brand may override a SMALL, explicitly listed subset of the platform
 * JobaSettings pricing keys via `BrandConfig.marketplace`. Everything else —
 * identity, KYC, credits, reputation — stays global and is deliberately NOT
 * overridable here.
 *
 * This is the only place that merges those overrides, so a Brand's own pricing
 * is applied by the SERVER on the money paths (apply / boost / story / loyalty).
 * A value stored in BrandConfig that is not in BRAND_OVERRIDABLE_KEYS is ignored.
 */

import { getJobaSettings } from './jobaSettings.ts';

export const BRAND_OVERRIDABLE_KEYS = [
  'application_fee_percent',
  'application_fee_min',
  'story_cost',
  'boost_cost',
  'loyalty_reward_percent',
  'loyalty_reward_min',
] as const;

export type BrandOverridableKey = typeof BRAND_OVERRIDABLE_KEYS[number];

/**
 * Platform JobaSettings, with the Brand's own overrides applied on top.
 * Falls back to the platform settings for an unknown / missing Brand.
 */
export async function getBrandMarketplaceSettings(base44: any, brandId?: string | null) {
  const global = await getJobaSettings(base44);
  if (!brandId) return global;

  try {
    const cfgs = await base44.asServiceRole.entities.BrandConfig.filter({ brand_id: brandId });
    const marketplace = cfgs?.[0]?.marketplace;
    if (!marketplace || typeof marketplace !== 'object') return global;

    const merged: any = { ...global };
    for (const key of BRAND_OVERRIDABLE_KEYS) {
      const value = Number((marketplace as any)[key]);
      if (Number.isFinite(value) && value >= 0) merged[key] = value;
    }
    return merged;
  } catch (e: any) {
    console.error('getBrandMarketplaceSettings error:', e?.message);
    return global;
  }
}