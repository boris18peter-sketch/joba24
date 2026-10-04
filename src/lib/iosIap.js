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
        const verify = await base44.functions.invoke('verifyIosPurchase', { jws: tx.jws, source: 'recovery' });
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
          const verify = await base44.functions.invoke('verifyIosPurchase', { jws: data.jws, source: 'observer' });
          // A consumable that is never finished is re-delivered by StoreKit
          // forever. Finish it only AFTER the backend confirmed processing.
          // Auto-renewable subscriptions are never finished (Apple does not
          // require it, and doing so can interfere with the subscription).
          const isConsumable = Object.values(IOS_IAP_PRODUCT_IDS).includes(data.productId);
          if (isConsumable && verify.data?.success) {
            await finishIosTransaction(data.transactionId);
          }
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

// Pushes the device's currently VERIFIED entitlement to the backend so the
// server holds a normalized subscription record instead of relying on a local
// boolean. This is a RECONCILIATION, not a grant: the backend refreshes the
// entitlement state for the subscription and only credits a period whose Apple
// transaction has never been seen. A previously processed period → +0 Jobas.
export async function syncIosSubscriptionEntitlements() {
  if (!isIosNative()) return 0;
  try {
    const subs = await getIosActiveSubscriptions();
    for (const s of subs) {
      if (!s.jws) continue;
      try {
        await base44.functions.invoke('verifyIosPurchase', { jws: s.jws, source: 'sync' });
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

/**
 * שחזור רכישות — Apple "Restore Purchases".
 *
 * Subscriptions: reconciles the CURRENT entitlement (the backend refreshes the
 * normalized subscription state and credits only an unseen paid period).
 *
 * Consumables: only transactions StoreKit itself reports as verifiably
 * UNFINISHED are re-sent — those are the ones whose entitlement may genuinely
 * have been lost. Historical, already-finished consumables are NEVER re-granted
 * just because the button was pressed.
 */
export async function restoreIosPurchases() {
  if (!isIosNative()) return { subscriptions: 0, recovered: 0 };

  let subscriptions = 0;
  let recovered = 0;

  // Subscriptions — reconcile current entitlements + full renewal history.
  try {
    const active = await getIosActiveSubscriptions();
    for (const s of active) {
      if (!s.jws) continue;
      try {
        await base44.functions.invoke('verifyIosPurchase', { jws: s.jws, source: 'restore' });
        subscriptions++;
      } catch (err) {
        console.error('[iosIap] restore subscription failed:', err);
      }
    }
    const history = await IosIap.getSubscriptionHistory();
    for (const tx of (history?.transactions || [])) {
      try {
        await base44.functions.invoke('verifyIosPurchase', { jws: tx.jws, source: 'restore' });
      } catch (err) {
        console.error('[iosIap] restore subscription history failed:', err);
      }
    }
  } catch (err) {
    console.error('[iosIap] restore subscriptions failed:', err);
  }

  // Consumables — ONLY verifiably unfinished transactions.
  try {
    const res = await IosIap.getUnfinished();
    for (const tx of (res?.transactions || [])) {
      try {
        const verify = await base44.functions.invoke('verifyIosPurchase', { jws: tx.jws, source: 'restore' });
        if (verify.data?.success) {
          await finishIosTransaction(tx.transactionId);
          recovered++;
        }
      } catch (err) {
        console.error('[iosIap] restore consumable failed:', err);
      }
    }
  } catch (err) {
    console.error('[iosIap] restore consumables failed:', err);
  }

  return { subscriptions, recovered };
}

// Apple's supported subscription-management experience. Joba24 never implements
// its own cancellation — the user is handed to Apple.
export async function openIosManageSubscriptions() {
  const url = 'https://apps.apple.com/account/subscriptions';
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return true;
  } catch {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch {
      return false;
    }
  }
}

// The backend's normalized subscription entitlement for the current user.
// Apple remains authoritative; this is Joba24's server-side projection, so it is
// correct across reinstalls and devices.
export async function getServerSubscriptionState() {
  try {
    const rows = await base44.entities.AppleSubscription.list('-last_verified_at', 1);
    return rows?.[0] || null;
  } catch (err) {
    console.error('[iosIap] getServerSubscriptionState failed:', err);
    return null;
  }
}

export async function recoverIosSubscriptionCredits() {
  if (!isIosNative()) return 0;
  try {
    const res = await IosIap.getSubscriptionHistory();
    const transactions = res?.transactions || [];
    for (const tx of transactions) {
      try {
        await base44.functions.invoke('verifyIosPurchase', { jws: tx.jws, source: 'sync' });
      } catch (err) {
        console.error('[iosIap] subscription recovery failed:', err);
      }
    }
    return transactions.length;
  } catch {
    return 0;
  }
}