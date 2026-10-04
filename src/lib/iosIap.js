import { Capacitor, registerPlugin } from '@capacitor/core';
import { base44 } from '@/api/base44Client';

// True ONLY inside the native iOS app (Capacitor WKWebView). On the website
// and on Android the credits purchase flow stays with Tranzila — Apple's
// In-App Purchase is required only for iOS (App Store Guideline 3.1.1).
export function isIosNative() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}

// One-time packages (BuyCreditsModal ONE_TIME_PACKAGES.id) → App Store
// CONSUMABLE product ids. Must match App Store Connect EXACTLY.
export const IOS_IAP_PRODUCT_IDS = {
  ot1: 'com.joba24.jobas5',
  ot2: 'com.joba24.jobas14',
  ot3: 'com.joba24.jobas29',
  ot4: 'com.joba24.jobas60',
  ot5: 'com.joba24.jobas100',
  ot6: 'com.joba24.jobas135',
};

// Monthly subscription packages (SUBSCRIPTION_PACKAGES.id) → App Store
// AUTO-RENEWABLE SUBSCRIPTION product ids. Must match App Store Connect EXACTLY.
export const IOS_IAP_SUB_PRODUCT_IDS = {
  sub1: 'com.joba24.sub20',
  sub2: 'com.joba24.sub45',
  sub3: 'com.joba24.sub95',
  sub4: 'com.joba24.sub145',
  sub5: 'com.joba24.sub190',
};

// Package id (one-time OR subscription) → App Store product id
export const IOS_IAP_ALL = { ...IOS_IAP_PRODUCT_IDS, ...IOS_IAP_SUB_PRODUCT_IDS };

// Monthly Jobas granted by each auto-renewable subscription product
export const IOS_IAP_SUB_CREDITS = {
  'com.joba24.sub20': 20,
  'com.joba24.sub45': 45,
  'com.joba24.sub95': 95,
  'com.joba24.sub145': 145,
  'com.joba24.sub190': 190,
};

const IosIap = registerPlugin('IosIap');

// Localized prices straight from the App Store:
// [{ productId, displayPrice, title, description }]
export async function getIosProducts() {
  const ids = Object.values(IOS_IAP_ALL);
  let lastErr = null;
  // Retry once: a transient StoreKit/network failure used to leave the product
  // map empty, which made the purchase sheet silently do nothing.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await IosIap.getProducts({ productIds: ids });
      const products = res?.products || [];
      if (products.length > 0 || attempt === 1) return products;
    } catch (err) {
      lastErr = err;
      console.error(`[iosIap] getProducts attempt ${attempt + 1} failed:`, err);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  if (lastErr) throw lastErr;
  return [];
}

// Opens the StoreKit purchase sheet (works for consumables and subscriptions).
// Resolves { jws, transactionId, productId }.
export async function purchaseIosProduct(productId) {
  return await IosIap.purchase({ productId });
}

// Marks a consumable transaction as finished — call ONLY after the backend
// verified the JWS and granted the credits (otherwise StoreKit re-delivers it).
export async function finishIosTransaction(transactionId) {
  try {
    await IosIap.finish({ transactionId });
  } catch (err) {
    console.error('[iosIap] finish failed:', err);
  }
}

// Decode the JWS payload WITHOUT verification (display only — the server does
// the full signature + certificate-chain verification before granting credits).
function decodeJwsPayload(jws) {
  try {
    const payload = jws.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

// Active auto-renewable subscriptions (per the user's Apple Account):
// [{ productId, transactionId, credits, purchaseDate, expiresDate }]
export async function getIosActiveSubscriptions() {
  const res = await IosIap.getActiveSubscriptions();
  return (res?.subscriptions || []).map((s) => {
    const payload = decodeJwsPayload(s.jws) || {};
    return {
      productId: s.productId,
      transactionId: s.transactionId,
      // Kept so the entitlement can be re-sent to the backend for server-side
      // reconciliation without re-granting any Jobas.
      jws: s.jws,
      credits: IOS_IAP_SUB_CREDITS[s.productId] || 0,
      purchaseDate: payload.purchaseDate || 0,
      expiresDate: payload.expiresDate || 0,
    };
  });
}

// Recovery — consumables purchased but never finished/verified (e.g. the app
// was killed between the purchase sheet and the server verification).
export async function recoverUnfinishedIosPurchases() {
  if (!isIosNative()) return 0;
  try {
    const res = await IosIap.getUnfinished();
    const transactions = res?.transactions || [];
    for (const tx of transactions) {
      try {
        const verify = await base44.functions.invoke('verifyIosPurchase', { jws: tx.jws });
        if (verify.data?.success) {
          await finishIosTransaction(tx.transactionId);
        }
      } catch (err) {
        console.error('[iosIap] recovery verify failed:', err);
      }
    }
    return transactions.length;
  } catch {
    return 0;
  }
}

// Credits Apple subscription renewals not granted yet. Every renewal is a new
// transaction with a new transactionId — the backend stores each one and
// grants the monthly Jobas exactly once per renewal. No-op on web/Android.
// ── Phase 2 — lifecycle recovery ─────────────────────────────────────────────
// Recovery used to run ONLY when BuyCreditsModal mounted, so a purchase that
// completed while the app was closed stayed unreconciled until the user
// reopened the buy sheet. These run on authenticated startup and on app resume.

let lastRecoveryAt = 0;
const RECOVERY_THROTTLE_MS = 30_000; // never hammer StoreKit or the backend

export async function recoverIosState() {
  if (!isIosNative()) return 0;
  if (Date.now() - lastRecoveryAt < RECOVERY_THROTTLE_MS) return 0;
  lastRecoveryAt = Date.now();
  const unfinished = await recoverUnfinishedIosPurchases();
  const renewals = await recoverIosSubscriptionCredits();
  await syncIosSubscriptionEntitlements();
  return unfinished + renewals;
}

// Register the durable StoreKit observer. Renewals and Ask-to-Buy approvals
// arrive here — without it they are never processed at all.
export async function startIosTransactionObserver(onTransaction) {
  if (!isIosNative()) return () => {};
  try {
    await IosIap.startObserving();
  } catch (err) {
    console.error('[iosIap] startObserving failed:', err);
  }
  try {
    const handle = await IosIap.addListener('transactionUpdate', async (data) => {
      try {
        if (data?.jws) {
          // The backend is idempotent by Apple transaction id, so re-sending an
          // already-processed transaction grants nothing.
          await base44.functions.invoke('verifyIosPurchase', { jws: data.jws });
        }
      } catch (err) {
        console.error('[iosIap] transactionUpdate verify failed:', err);
      }
      if (typeof onTransaction === 'function') onTransaction(data);
    });
    return () => handle.remove();
  } catch (err) {
    console.error('[iosIap] transactionUpdate listener failed:', err);
    return () => {};
  }
}

// Pushes the device's active subscription state to the backend so the server
// holds a normalized entitlement record instead of relying on a local boolean.
// verifyIosPurchase refreshes entitlement state on duplicates and grants
// nothing extra, so this can never create duplicate monthly Jobas.
export async function syncIosSubscriptionEntitlements() {
  if (!isIosNative()) return 0;
  try {
    const subs = await getIosActiveSubscriptions();
    for (const s of subs) {
      if (!s.jws) continue;
      try {
        await base44.functions.invoke('verifyIosPurchase', { jws: s.jws });
      } catch (err) {
        console.error('[iosIap] entitlement sync failed for', s.productId, err);
      }
    }
    return subs.length;
  } catch (err) {
    console.error('[iosIap] syncIosSubscriptionEntitlements failed:', err);
    return 0;
  }
}

export async function recoverIosSubscriptionCredits() {
  if (!isIosNative()) return 0;
  try {
    const res = await IosIap.getSubscriptionHistory();
    const transactions = res?.transactions || [];
    for (const tx of transactions) {
      try {
        await base44.functions.invoke('verifyIosPurchase', { jws: tx.jws });
      } catch (err) {
        console.error('[iosIap] subscription recovery failed:', err);
      }
    }
    return transactions.length;
  } catch {
    return 0;
  }
}