import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isIosNative, startIosTransactionObserver, recoverIosState } from '@/lib/iosIap';
import { useAuth } from '@/lib/AuthContext';

/**
 * IosIapRecovery — runs the Apple transaction lifecycle for the WHOLE app.
 *
 * Previously all recovery lived inside BuyCreditsModal, so a purchase that Apple
 * charged for while the app was closed was never reconciled until the user
 * happened to reopen the buy sheet. This mounts once for the authenticated app
 * and reconciles on:
 *   - authenticated app startup
 *   - app returning to the foreground
 *   - every StoreKit transaction delivered outside a purchase call
 *     (renewals, Ask-to-Buy approvals) via the durable observer
 *
 * A successful Apple charge must eventually grant its entitlement even if the
 * app was killed, the network dropped, or the immediate response was lost.
 */
export default function IosIapRecovery() {
  const { user } = useAuth();

  useEffect(() => {
    // Never reconcile before a Joba24 user is authenticated: a StoreKit
    // transaction recovered while signed out must stay queued in StoreKit
    // (unfinished) and be credited only once a user session exists — the
    // backend derives the account from the session, never from the client.
    if (!isIosNative() || !user?.id) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      recoverIosState().catch((err) => console.error('[IosIapRecovery] recovery failed:', err));
    };

    // Durable StoreKit observer — new transactions trigger a reconciliation.
    let removeListener = () => {};
    startIosTransactionObserver(() => run()).then((remove) => {
      if (typeof remove === 'function') removeListener = remove;
    });

    // Startup reconciliation.
    run();

    // Foreground reconciliation.
    const sub = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) run();
    });

    return () => {
      cancelled = true;
      removeListener();
      sub.then((s) => s.remove()).catch(() => {});
    };
  }, [user?.id]);

  return null;
}