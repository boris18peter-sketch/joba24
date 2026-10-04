/**
 * appleProducts — AUTHORITATIVE Apple product catalog (Phase 2).
 *
 * The server decides what an Apple product grants. The client only ever sends
 * a signed Apple transaction; it never tells the server how many Jobas to grant.
 * Product ids must match App Store Connect EXACTLY.
 *
 * Kept provider-explicit on purpose: Apple product ids are NOT the same as the
 * Tranzila package ids in base44/shared/paymentCatalog.ts.
 */

export interface AppleProductDef {
  productId: string;
  credits: number;
  type: 'consumable' | 'subscription';
}

export const APPLE_PRODUCTS: Record<string, AppleProductDef> = {
  // Consumables — purchasable repeatedly, each purchase grants once.
  'com.joba24.jobas5': { productId: 'com.joba24.jobas5', credits: 5, type: 'consumable' },
  'com.joba24.jobas14': { productId: 'com.joba24.jobas14', credits: 14, type: 'consumable' },
  'com.joba24.jobas29': { productId: 'com.joba24.jobas29', credits: 29, type: 'consumable' },
  'com.joba24.jobas60': { productId: 'com.joba24.jobas60', credits: 60, type: 'consumable' },
  'com.joba24.jobas100': { productId: 'com.joba24.jobas100', credits: 100, type: 'consumable' },
  'com.joba24.jobas135': { productId: 'com.joba24.jobas135', credits: 135, type: 'consumable' },

  // Auto-renewable subscriptions — each paid period grants once.
  'com.joba24.sub20': { productId: 'com.joba24.sub20', credits: 20, type: 'subscription' },
  'com.joba24.sub45': { productId: 'com.joba24.sub45', credits: 45, type: 'subscription' },
  'com.joba24.sub95': { productId: 'com.joba24.sub95', credits: 95, type: 'subscription' },
  'com.joba24.sub145': { productId: 'com.joba24.sub145', credits: 145, type: 'subscription' },
  'com.joba24.sub190': { productId: 'com.joba24.sub190', credits: 190, type: 'subscription' },
};

/** Jobas granted per purchase / per subscription period. */
export const IAP_CONSUMABLES: Record<string, number> = Object.fromEntries(
  Object.entries(APPLE_PRODUCTS).filter(([, p]) => p.type === 'consumable').map(([id, p]) => [id, p.credits]),
);

export const IAP_SUBSCRIPTIONS: Record<string, number> = Object.fromEntries(
  Object.entries(APPLE_PRODUCTS).filter(([, p]) => p.type === 'subscription').map(([id, p]) => [id, p.credits]),
);

/** Resolve an Apple product id to its authoritative definition, or null. */
export function resolveAppleProduct(productId: unknown): AppleProductDef | null {
  if (!productId) return null;
  return APPLE_PRODUCTS[String(productId).trim()] ?? null;
}

/** Jobas granted by a product id (0 when unknown). */
export function appleCredits(productId: unknown): number {
  return resolveAppleProduct(productId)?.credits ?? 0;
}