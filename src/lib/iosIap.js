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

// Package id (BuyCreditsModal ONE_TIME_PACKAGES.id) → App Store Connect
// consumable product id. These must match the products created in
// App Store Connect EXACTLY.
export const IOS_IAP_PRODUCT_IDS = {
  ot1: 'com.joba24.jobas5',
  ot2: 'com.joba24.jobas14',
  ot3: 'com.joba24.jobas29',
  ot4: 'com.joba24.jobas60',
  ot5: 'com.joba24.jobas100',
  ot6: 'com.joba24.jobas135',
};

const IosIap = registerPlugin('IosIap');

// Localized prices straight from the App Store:
// [{ productId, displayPrice, title, description }]
export async function getIosProducts() {
  const res = await IosIap.getProducts({ productIds: Object.values(IOS_IAP_PRODUCT_IDS) });
  return res?.products || [];
}

// Opens the StoreKit purchase sheet. Resolves { jws, transactionId, productId }.
export async function purchaseIosProduct(productId) {
  return await IosIap.purchase({ productId });
}

// Marks the transaction as finished — call ONLY after the backend verified
// the JWS and granted the credits (otherwise StoreKit re-delivers it).
export async function finishIosTransaction(transactionId) {
  try {
    await IosIap.finish({ transactionId });
  } catch (err) {
    console.error('[iosIap] finish failed:', err);
  }
}

// Recovery — verifies purchased-but-unfinished transactions from a previous
// session (e.g. the app was killed between the purchase sheet and the server
// verification). Called when the purchase modal opens on iOS.
export async function recoverUnfinishedIosPurchases() {
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