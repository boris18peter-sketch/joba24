/**
 * appleEntitlement — THE single authoritative Apple processing pipeline.
 *
 * Every path converges here:
 *   • device purchase          (verifyIosPurchase, source: 'purchase')
 *   • device recovery          (verifyIosPurchase, source: 'recovery')
 *   • Transaction.updates      (verifyIosPurchase, source: 'observer')
 *   • subscription sync        (verifyIosPurchase, source: 'sync')
 *   • Restore Purchases        (verifyIosPurchase, source: 'restore')
 *   • App Store Server Notifications V2 (appleServerNotifications, source: 'notification')
 *
 * There is NO separate crediting logic for any of them.
 *
 * ── Ordering (crash-safe, at-most-once) ─────────────────────────────────────
 * The credit LEDGER row is written BEFORE the balance changes, so a crash can
 * never produce "Jobas added but a retry grants them again" (the dangerous
 * direction). A crash between the ledger write and the balance update leaves a
 * 'claimed' marker that the next pass detects and heals.
 *
 * Two TRULY CONCURRENT requests for the same transaction are serialized by an
 * atomic Compare-And-Swap claim on that transaction's audit row (updateMany →
 * `updated === 1`). Only the winner may reach the credit path, so a double grant
 * is impossible even under true concurrency.
 *
 * Base44 has no multi-record transaction and no unique index, so EXACTLY-ONCE
 * is not a single-transaction guarantee. The guarantees actually provided are:
 *   • at-most-once for every sequential retry / replay / recovery / notification
 *   • at-most-once for two truly concurrent requests (the CAS claim)
 *   • self-healing for an interrupted grant ('claimed' marker + claim lease)
 */

import { resolveAppleProduct } from './appleProducts.ts';

// App Store Server Notification V2 types that represent a PAID period and are
// therefore eligible to grant the period's Jobas exactly once.
export const GRANTING_NOTIFICATION_TYPES = new Set([
  'SUBSCRIBED',
  'DID_RENEW',
  'OFFER_REDEEMED',
]);

// ── helpers ──────────────────────────────────────────────────────────────────

function normalizeEnvironment(env) {
  return env === 'Production' ? 'Production' : 'Sandbox';
}

function isoOrNull(value) {
  if (!value && value !== 0) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

// A live grant completes in seconds. A claim older than this was abandoned by a
// process that died before writing the ledger, and may be reclaimed.
const CLAIM_LEASE_MS = 120_000;

function toMs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** The later of two ISO timestamps — period fields only ever move FORWARD. */
function laterIso(a, b) {
  const ta = toMs(a);
  const tb = toMs(b);
  if (ta === null) return b || null;
  if (tb === null) return a;
  return ta >= tb ? a : b;
}

/**
 * The lifecycle state a verified transaction implies ON ITS OWN.
 * A transaction whose paid period already ended can never mark a subscription
 * 'active' — this is what stops a historical Restore from resurrecting one.
 */
function deriveSubscriptionStatus(periodEnd) {
  const end = toMs(periodEnd);
  if (end !== null && end <= Date.now()) return 'expired';
  return 'active';
}

async function getUserCredits(base44, userId) {
  try {
    const u = await base44.asServiceRole.entities.User.get(userId);
    return Number(u?.worker_credits ?? 0);
  } catch {
    try {
      const rows = await base44.asServiceRole.entities.User.filter({ id: userId });
      return Number(rows?.[0]?.worker_credits ?? 0);
    } catch {
      return 0;
    }
  }
}

/**
 * Observability — records every Apple processing attempt.
 *
 * `first_seen_source` is the key diagnostic: a value other than 'purchase'
 * means the immediate purchase response never reached the backend (the app was
 * killed, the network dropped) and the transaction was recovered afterwards.
 * A transaction that never reaches the backend AT ALL leaves no row here — that
 * is exactly what makes "never reached us" distinguishable from "we rejected it".
 */
export async function recordAppleAttempt(base44, {
  userId,
  productId = 'unknown',
  transactionId = null,
  originalTransactionId = null,
  environment = null,
  productType = null,
  status,
  verificationStage,
  errorCategory = null,
  creditsIntended = 0,
  creditsGranted = 0,
  purchaseDate = null,
  expirationDate = null,
  periodStart = null,
  periodEnd = null,
  source,
  notificationType = null,
  existingRow = null,
}) {
  const nowIso = new Date().toISOString();
  const payload = {
    user_id: userId || 'unknown',
    product_id: productId,
    transaction_id: transactionId || undefined,
    original_transaction_id: originalTransactionId || undefined,
    environment,
    product_type: productType,
    status,
    verification_stage: verificationStage,
    error_category: errorCategory,
    credits: creditsGranted,
    credits_granted: creditsGranted,
    credits_intended: creditsIntended,
    purchase_date: purchaseDate,
    expiration_date: expirationDate,
    period_start: periodStart,
    period_end: periodEnd,
    last_verified_at: nowIso,
    last_source: source,
    notification_type: notificationType,
  };
  // Strip undefined so we never overwrite an existing value with nothing.
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }

  try {
    if (existingRow) {
      await base44.asServiceRole.entities.IosPurchase.update(existingRow.id, {
        ...payload,
        attempt_count: Number(existingRow.attempt_count || 1) + 1,
      });
      return existingRow.id;
    }
    const created = await base44.asServiceRole.entities.IosPurchase.create({
      ...payload,
      attempt_count: 1,
      first_seen_source: source,
    });
    return created?.id ?? null;
  } catch (err) {
    // Observability must never break the payment path.
    console.error('[appleEntitlement] recordAppleAttempt failed:', err?.message || err);
    return null;
  }
}

/**
 * Normalized server-side subscription entitlement (the Joba24 projection of
 * Apple's authoritative state). One row per Apple originalTransactionId.
 */
export async function upsertAppleSubscription(base44, {
  userId,
  productId,
  originalTransactionId,
  latestTransactionId = null,
  environment,
  status,
  autoRenewStatus = null,
  periodStart = null,
  periodEnd = null,
  creditsPerPeriod = 0,
  latestProcessingStatus = 'pending',
  notificationType = null,
  // Does THIS write own the lifecycle state? A state-authoritative event (a
  // revocation, or an App Store notification) does. A duplicate / reconciliation
  // refresh of an already-processed transaction does NOT — it may only refine
  // the record, never flip a cancelled, expired, refunded or revoked
  // subscription back to active + auto-renewing.
  authoritative = false,
}) {
  if (!originalTransactionId) return null;
  const nowIso = new Date().toISOString();

  let existing = null;
  try {
    const rows = await base44.asServiceRole.entities.AppleSubscription.filter(
      { original_transaction_id: originalTransactionId },
      '-created_date',
      1,
    );
    existing = rows?.[0] || null;
  } catch (err) {
    console.error('[appleEntitlement] subscription lookup failed:', err?.message || err);
  }

  // An existing binding is permanent: a device signed in as another Joba24
  // account must never re-point a subscription that already belongs to someone.
  const boundUserId = existing?.user_id && existing.user_id !== 'unknown'
    ? existing.user_id
    : userId;

  // ── B: time-sensitive fields are MONOTONIC ────────────────────────────────
  // A historical transaction replayed by Restore / reconciliation carries an
  // OLDER period than the one already stored. It must never roll period_start,
  // period_end or latest_transaction_id backwards.
  const incomingEnd = toMs(periodEnd);
  const existingEnd = toMs(existing?.period_end);
  const isStalePeriod = incomingEnd !== null && existingEnd !== null && incomingEnd < existingEnd;

  const nextPeriodStart = laterIso(periodStart, existing?.period_start);
  const nextPeriodEnd = laterIso(periodEnd, existing?.period_end);
  const nextLatestTransactionId = isStalePeriod
    ? (existing?.latest_transaction_id ?? null)
    : (latestTransactionId || existing?.latest_transaction_id || null);

  // ── A: lifecycle state ────────────────────────────────────────────────────
  // Only a state-authoritative event may WRITE the state. Everything else keeps
  // what is already stored (falling back to the passed value only when this
  // subscription has no state yet).
  const nextStatus = authoritative ? status : (existing?.status || status);
  const nextAutoRenew = authoritative
    ? (autoRenewStatus !== null ? autoRenewStatus : (existing?.auto_renew_status ?? null))
    : (existing?.auto_renew_status ?? null);

  const patch = {
    user_id: boundUserId,
    product_id: productId,
    original_transaction_id: originalTransactionId,
    latest_transaction_id: nextLatestTransactionId,
    environment,
    status: nextStatus,
    auto_renew_status: nextAutoRenew,
    period_start: nextPeriodStart,
    period_end: nextPeriodEnd,
    credits_per_period: creditsPerPeriod || existing?.credits_per_period || 0,
    latest_processing_status: latestProcessingStatus,
    last_notification_type: notificationType || existing?.last_notification_type || null,
    last_verified_at: nowIso,
  };

  try {
    if (existing) {
      await base44.asServiceRole.entities.AppleSubscription.update(existing.id, patch);
      return existing.id;
    }
    const created = await base44.asServiceRole.entities.AppleSubscription.create(patch);
    return created?.id ?? null;
  } catch (err) {
    console.error('[appleEntitlement] subscription upsert failed:', err?.message || err);
    return null;
  }
}

/** Resolve the Joba24 user from an Apple originalTransactionId. */
export async function resolveUserIdFromOriginalTransaction(base44, originalTransactionId) {
  if (!originalTransactionId) return null;
  try {
    const subs = await base44.asServiceRole.entities.AppleSubscription.filter(
      { original_transaction_id: originalTransactionId },
      '-created_date',
      1,
    );
    if (subs?.[0]?.user_id) return subs[0].user_id;
  } catch { /* fall through */ }
  try {
    const purchases = await base44.asServiceRole.entities.IosPurchase.filter(
      { original_transaction_id: originalTransactionId },
      '-created_date',
      1,
    );
    if (purchases?.[0]?.user_id && purchases[0].user_id !== 'unknown') return purchases[0].user_id;
  } catch { /* fall through */ }
  return null;
}

// ── THE pipeline ─────────────────────────────────────────────────────────────

/**
 * Processes one verified Apple transaction end to end.
 *
 * `tx` must already be a VERIFIED, decoded Apple transaction payload.
 * Returns a result describing exactly what happened.
 */
export async function processAppleTransaction(base44, {
  userId,
  tx,
  environment: envInput,
  source = 'purchase',
  notificationType = null,
}) {
  const productId = String(tx?.productId || '');
  const transactionId = String(tx?.transactionId || '');
  const originalTransactionId = String(tx?.originalTransactionId || '');
  const environment = normalizeEnvironment(envInput ?? tx?.environment);
  const purchaseDate = isoOrNull(tx?.purchaseDate);
  const periodStart = isoOrNull(tx?.purchaseDate);
  const periodEnd = isoOrNull(tx?.expiresDate);

  const base = {
    userId,
    productId,
    transactionId,
    originalTransactionId,
    environment,
    source,
    notificationType,
    purchaseDate,
    periodStart,
    periodEnd,
  };

  // 1. Authoritative product mapping (server catalog only — never the client).
  const def = resolveAppleProduct(productId);
  if (!def) {
    await recordAppleAttempt(base44, {
      ...base, productType: null, status: 'failed_product_mapping',
      verificationStage: 'product_mapping', errorCategory: 'unknown_product',
    });
    return { success: false, duplicate: false, credits_granted: 0, new_balance: null, product_id: productId, is_subscription: false, stage: 'product_mapping', error: 'Unknown product' };
  }
  const isSubscription = def.type === 'subscription';

  if (!transactionId) {
    await recordAppleAttempt(base44, {
      ...base, productType: def.type, status: 'failed_verification',
      verificationStage: 'transaction_identity', errorCategory: 'missing_transaction_id',
    });
    return { success: false, duplicate: false, credits_granted: 0, new_balance: null, product_id: productId, is_subscription: isSubscription, stage: 'transaction_identity', error: 'Missing transactionId' };
  }

  // 2. Product-type consistency NOTE — never a gate.
  //    The AUTHORITATIVE type is the server catalog (step 1). Apple's own `type`
  //    field is a signed cross-check only: a formatting/string difference must
  //    NEVER reject a verified, already-paid Apple transaction whose product id
  //    the server catalog already knows. Recorded, logged, and ignored.
  const expectedType = isSubscription ? 'Auto-Renewable Subscription' : 'Consumable';
  if (tx.type && tx.type !== expectedType) {
    console.warn(JSON.stringify({
      fn: 'appleEntitlement', stage: 'product_type_note',
      product_id: productId, apple_type: tx.type,
      catalog_type: def.type, expected: expectedType, source,
    }));
  }

  // 2b. Account binding. An Apple subscription belongs to the Joba24 account
  //     that first verified it. A transaction delivered from a device signed in
  //     as a DIFFERENT account must never re-point or credit that subscription.
  if (isSubscription && originalTransactionId) {
    const boundUserId = await resolveUserIdFromOriginalTransaction(base44, originalTransactionId);
    if (boundUserId && boundUserId !== userId) {
      await recordAppleAttempt(base44, {
        ...base, productType: def.type, status: 'failed_entitlement',
        verificationStage: 'wrong_account',
        errorCategory: 'subscription_bound_to_other_user',
        creditsIntended: 0, creditsGranted: 0,
      });
      return { success: false, duplicate: false, credits_granted: 0, new_balance: null, product_id: productId, is_subscription: true, stage: 'wrong_account', error: 'Subscription belongs to another account' };
    }
  }

  // 3. Revocation / refund — record and update state. NEVER claw back Jobas.
  if (tx.revocationDate) {
    await recordAppleAttempt(base44, {
      ...base, productType: def.type, status: 'revoked', verificationStage: 'revoked_no_grant',
      creditsIntended: 0, creditsGranted: 0, expirationDate: periodEnd,
    });
    if (isSubscription) {
      await upsertAppleSubscription(base44, {
        userId, productId, originalTransactionId, latestTransactionId: transactionId,
        environment, status: 'revoked', periodStart, periodEnd,
        creditsPerPeriod: def.credits, latestProcessingStatus: 'state_only', notificationType,
        authoritative: true,
      });
    }
    return { success: true, duplicate: false, credits_granted: 0, new_balance: await getUserCredits(base44, userId), product_id: productId, is_subscription: isSubscription, stage: 'revoked_no_grant' };
  }

  // 4. Already fully processed? → duplicate, grant nothing.
  let existingRows = [];
  try {
    existingRows = await base44.asServiceRole.entities.IosPurchase.filter({ transaction_id: transactionId }, '-created_date', 5);
  } catch { /* treat as none */ }
  const completedRow = existingRows.find((r) => r.verification_stage === 'entitlement_granted' || Number(r.credits_granted || 0) > 0);
  const claimedRow = existingRows.find((r) => r.verification_stage === 'claimed');

  if (completedRow) {
    await recordAppleAttempt(base44, {
      ...base, productType: def.type, status: completedRow.status || 'verified',
      verificationStage: 'duplicate_no_grant', creditsIntended: def.credits,
      creditsGranted: Number(completedRow.credits_granted || 0),
      existingRow: completedRow,
    });
    if (isSubscription) {
      await upsertAppleSubscription(base44, {
        userId, productId, originalTransactionId, latestTransactionId: transactionId,
        environment, status: deriveSubscriptionStatus(periodEnd),
        periodStart, periodEnd, creditsPerPeriod: def.credits,
        latestProcessingStatus: 'processed', notificationType,
      });
    }
    return { success: true, duplicate: true, credits_granted: 0, new_balance: await getUserCredits(base44, userId), product_id: productId, is_subscription: isSubscription, stage: 'duplicate_no_grant' };
  }

  // 5. The credit LEDGER is the durable record of the grant. Its presence means
  //    the entitlement was already awarded, regardless of what the IosPurchase
  //    row says (that row can be lost if the process died).
  const ledgerKey = `apple:${transactionId}`;
  let ledgerRow = null;
  try {
    const rows = await base44.asServiceRole.entities.CreditTransaction.filter({ payment_id: ledgerKey }, '-created_date', 1);
    ledgerRow = rows?.[0] || null;
  } catch { /* treat as none */ }

  if (ledgerRow) {
    // Recoverable path: the grant was recorded but the sequence was interrupted.
    // Heal the balance toward the recorded post-grant state (never adds credits
    // twice — it only restores a state the ledger already proves).
    const recordedAfter = Number(ledgerRow.balance_after ?? 0);
    const current = await getUserCredits(base44, userId);
    if (claimedRow && recordedAfter > current) {
      try {
        await base44.asServiceRole.entities.User.update(userId, { worker_credits: recordedAfter });
      } catch (err) {
        console.error('[appleEntitlement] balance heal failed:', err?.message || err);
      }
    }
    await recordAppleAttempt(base44, {
      ...base, productType: def.type, status: 'verified',
      verificationStage: 'entitlement_granted',
      creditsIntended: Number(ledgerRow.amount || def.credits),
      creditsGranted: Number(ledgerRow.amount || 0),
      existingRow: claimedRow || null,
    });
    if (isSubscription) {
      await upsertAppleSubscription(base44, {
        userId, productId, originalTransactionId, latestTransactionId: transactionId,
        environment, status: deriveSubscriptionStatus(periodEnd),
        periodStart, periodEnd, creditsPerPeriod: def.credits,
        latestProcessingStatus: 'processed', notificationType,
      });
    }
    return { success: true, duplicate: true, credits_granted: 0, new_balance: await getUserCredits(base44, userId), product_id: productId, is_subscription: isSubscription, stage: 'entitlement_granted' };
  }

  // 6. Fresh grant. ORDER MATTERS (see the module header):
  //    atomic claim → ledger → balance → confirm. A crash at any point leaves
  //    recoverable evidence, and can never cause a second grant.
  //
  //    C — ATOMIC CLAIM (Compare-And-Swap). The claim is a conditional
  //    `updateMany` on this transaction's canonical audit row. The database
  //    serializes concurrent updates, so of two requests for the SAME
  //    transaction exactly one sees `updated === 1` — and only that one may
  //    continue to the credit path. The other sees 0 and stops.
  const quantity = isSubscription ? 1 : Math.max(1, Number(tx.quantity) || 1);
  const credits = def.credits * quantity;

  if (!claimedRow) {
    await recordAppleAttempt(base44, {
      ...base, productType: def.type, status: 'verified',
      verificationStage: 'claimed', creditsIntended: credits, creditsGranted: 0,
    });
  }

  // Both requests must CAS the SAME row, so always resolve the OLDEST row for
  // this transaction — a request that reads after creating its own row sees
  // every earlier row, so all of them converge on the earliest one.
  let canonicalRow = claimedRow;
  try {
    const rows = await base44.asServiceRole.entities.IosPurchase.filter(
      { transaction_id: transactionId }, 'created_date', 1,
    );
    if (rows?.[0]) canonicalRow = rows[0];
  } catch { /* fall back to the row we already know about */ }

  const claimToken = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  const claimAt = new Date().toISOString();
  const staleClaimBefore = new Date(Date.now() - CLAIM_LEASE_MS).toISOString();

  let claimUpdated = 0;
  if (canonicalRow?.id) {
    try {
      const claim = await base44.asServiceRole.entities.IosPurchase.updateMany(
        {
          id: canonicalRow.id,
          $or: [
            { claim_state: { $ne: 'granted' } },
            // Lease: a claim whose owner died before writing the ledger is
            // reclaimed. Reaching this point already proved NO ledger row
            // exists, so reclaiming can never grant twice.
            { claim_at: { $lt: staleClaimBefore } },
          ],
        },
        {
          $set: {
            claim_state: 'granted',
            claim_token: claimToken,
            claim_owner: userId,
            claim_at: claimAt,
          },
        },
      );
      claimUpdated = Number(claim?.updated ?? 0);
    } catch (err) {
      console.error('[appleEntitlement] claim CAS failed:', err?.message || err);
    }
  }

  if (claimUpdated !== 1) {
    // Another request owns this transaction — grant NOTHING. Recorded as a NEW
    // row so the winner's row (its claim + grant evidence) is never overwritten.
    await recordAppleAttempt(base44, {
      ...base, productType: def.type, status: 'verified',
      verificationStage: 'duplicate_no_grant', creditsIntended: credits, creditsGranted: 0,
    });
    return { success: true, duplicate: true, credits_granted: 0, new_balance: await getUserCredits(base44, userId), product_id: productId, is_subscription: isSubscription, stage: 'duplicate_no_grant' };
  }

  const currentBalance = await getUserCredits(base44, userId);
  const newBalance = currentBalance + credits;

  try {
    await base44.asServiceRole.entities.CreditTransaction.create({
      user_id: userId,
      amount: credits,
      type: 'Purchase',
      balance_after: newBalance,
      note: isSubscription
        ? `מנוי חודשי — ${credits} ג'ובות לחודש · Apple IAP (${environment})`
        : `טעינת ${credits} ג'ובות — Apple In-App Purchase (${environment})`,
      payment_id: ledgerKey,
      provider_index: transactionId,
    });

    await base44.asServiceRole.entities.User.update(userId, { worker_credits: newBalance });
  } catch (err) {
    // Nothing was granted — release the claim so a retry can recover it now
    // rather than waiting for the lease to expire.
    if (canonicalRow?.id) {
      try {
        await base44.asServiceRole.entities.IosPurchase.updateMany(
          { id: canonicalRow.id, claim_token: claimToken },
          { $set: { claim_state: 'unclaimed' } },
        );
      } catch { /* the lease will reclaim it */ }
    }
    await recordAppleAttempt(base44, {
      ...base, productType: def.type, status: 'failed_entitlement',
      verificationStage: 'failed_entitlement',
      errorCategory: String(err?.message || 'entitlement_failed').slice(0, 140),
      creditsIntended: credits, creditsGranted: 0,
      existingRow: canonicalRow || null,
    });
    return { success: false, duplicate: false, credits_granted: 0, new_balance: currentBalance, product_id: productId, is_subscription: isSubscription, stage: 'failed_entitlement', error: 'Entitlement failed' };
  }

  // 7. Confirm the transaction record (this row is what makes the grant auditable).
  await recordAppleAttempt(base44, {
    ...base, productType: def.type, status: 'verified',
    verificationStage: 'entitlement_granted',
    creditsIntended: credits, creditsGranted: credits,
    expirationDate: periodEnd,
    existingRow: canonicalRow || null,
  });

  // 8. Normalized subscription entitlement. This IS a paid period we just
  //    credited, so the state is authoritative — but the status is DERIVED from
  //    the period, so a historical transaction can never mark an ended
  //    subscription active.
  if (isSubscription) {
    await upsertAppleSubscription(base44, {
      userId, productId, originalTransactionId, latestTransactionId: transactionId,
      environment, status: deriveSubscriptionStatus(periodEnd), autoRenewStatus: true,
      periodStart, periodEnd, creditsPerPeriod: def.credits,
      latestProcessingStatus: 'processed', notificationType,
      authoritative: true,
    });
  }

  console.log(JSON.stringify({
    fn: 'appleEntitlement', stage: 'entitlement_granted', user_id: userId,
    product_id: productId, transaction_id: transactionId,
    original_transaction_id: originalTransactionId, environment, source,
    notification_type: notificationType, credits, new_balance: newBalance,
  }));

  return { success: true, duplicate: false, credits_granted: credits, new_balance: newBalance, product_id: productId, is_subscription: isSubscription, stage: 'entitlement_granted' };
}

/**
 * Applies a subscription STATE-ONLY change (billing issue, auto-renew disabled,
 * expiration, refund, revocation) without granting any Jobas.
 */
export async function applySubscriptionStateOnly(base44, {
  userId,
  productId,
  originalTransactionId,
  latestTransactionId = null,
  environment,
  status,
  autoRenewStatus = null,
  periodStart = null,
  periodEnd = null,
  creditsPerPeriod = 0,
  notificationType = null,
}) {
  await recordAppleAttempt(base44, {
    userId, productId, transactionId: latestTransactionId || null,
    originalTransactionId, environment,
    productType: 'subscription', status,
    verificationStage: `state_only:${status}`,
    creditsIntended: 0, creditsGranted: 0,
    periodStart, periodEnd, source: 'notification', notificationType,
  });

  return await upsertAppleSubscription(base44, {
    userId, productId, originalTransactionId, latestTransactionId,
    environment, status, autoRenewStatus, periodStart, periodEnd,
    creditsPerPeriod, latestProcessingStatus: 'state_only', notificationType,
    authoritative: true,
  });
}