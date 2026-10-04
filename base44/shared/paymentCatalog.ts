/**
 * paymentCatalog — AUTHORITATIVE server-side product catalog (Phase 1).
 *
 * The client is NEVER the source of truth for what a purchase costs or how many
 * Jobas it grants. The client may only send a `package_id`; the server resolves
 * price / credits / type from this table and ignores any client-supplied `sum`
 * or `credits`.
 *
 * Must stay in sync with the frontend package list
 * (src/components/BuyCreditsModal.jsx) and with the Apple product ids
 * (src/lib/iosIap.js + App Store Connect).
 */

export type PackageType = 'one_time' | 'subscription';

export interface PackageDef {
  id: string;
  price: number;
  credits: number;
  type: PackageType;
}

export const PAYMENT_CATALOG: Record<string, PackageDef> = {
  // One-time Joba packages
  ot1: { id: 'ot1', price: 9.9, credits: 5, type: 'one_time' },
  ot2: { id: 'ot2', price: 24.9, credits: 14, type: 'one_time' },
  ot3: { id: 'ot3', price: 49.9, credits: 29, type: 'one_time' },
  ot4: { id: 'ot4', price: 99.9, credits: 60, type: 'one_time' },
  ot5: { id: 'ot5', price: 149.9, credits: 100, type: 'one_time' },
  ot6: { id: 'ot6', price: 199.9, credits: 135, type: 'one_time' },

  // Monthly auto-renewable subscriptions
  sub1: { id: 'sub1', price: 24.9, credits: 20, type: 'subscription' },
  sub2: { id: 'sub2', price: 49.9, credits: 45, type: 'subscription' },
  sub3: { id: 'sub3', price: 99.9, credits: 95, type: 'subscription' },
  sub4: { id: 'sub4', price: 149.9, credits: 145, type: 'subscription' },
  sub5: { id: 'sub5', price: 199.9, credits: 190, type: 'subscription' },
};

/** Resolve a package id to its authoritative definition, or null if unknown. */
export function resolvePackage(packageId: unknown): PackageDef | null {
  if (!packageId) return null;
  return PAYMENT_CATALOG[String(packageId).trim()] ?? null;
}