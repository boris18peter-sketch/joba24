import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifySignedJws } from '../../shared/appleVerify.ts';
import {
  processAppleTransaction,
  applySubscriptionStateOnly,
  resolveUserIdFromOriginalTransaction,
  GRANTING_NOTIFICATION_TYPES,
} from '../../shared/appleEntitlement.ts';
import { resolveAppleProduct } from '../../shared/appleProducts.ts';

/**
 * appleServerNotifications — App Store Server Notifications V2 endpoint.
 *
 * Apple POSTs a signed payload here for subscription lifecycle events. This
 * endpoint is PUBLIC (Apple has no Joba24 session), so it authenticates the
 * CALLER by verifying Apple's own signature chain instead of a user token.
 *
 * Guarantees:
 *   • The notification and its nested transaction are fully verified on-chain.
 *   • A paid period grants its Jobas through the SAME authoritative pipeline as
 *     the device path, anchored on the Apple transaction id → a repeated
 *     notification for the same renewal grants +0.
 *   • Refund / revocation record the event and update entitlement state but
 *     NEVER deduct previously granted Jobas (credit clawback is a separate,
 *     deliberate policy decision).
 *   • Always answers 200 for a well-formed notification so Apple does not retry
 *     forever; malformed or unverifiable payloads answer 400.
 *
 * Input: { signedPayload }  (Apple's responseBodyV2 JWS)
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  let payload;
  try {
    const body = await req.json();
    const signedPayload = body?.signedPayload;
    if (!signedPayload || typeof signedPayload !== 'string') {
      return Response.json({ error: 'Missing signedPayload' }, { status: 400 });
    }
    // 1. Verify Apple's signature over the notification itself.
    payload = await verifySignedJws(signedPayload);
  } catch (error) {
    console.error('[appleServerNotifications] notification verification failed:', error?.message || error);
    return Response.json({ error: 'Invalid notification' }, { status: 400 });
  }

  const notificationType = String(payload?.notificationType || '');
  const subtype = String(payload?.subtype || '');
  const notificationUUID = String(payload?.notificationUUID || '');
  const data = payload?.data || {};
  const environment = data?.environment === 'Production' ? 'Production' : 'Sandbox';

  const log = (stage, extra = {}) => {
    console.log(JSON.stringify({
      fn: 'appleServerNotifications', stage, notification_type: notificationType,
      subtype: subtype || null, notification_uuid: notificationUUID,
      environment, at: new Date().toISOString(), ...extra,
    }));
  };

  log('received');

  try {
    // 2. Decode the nested signed transaction (present for purchase/renewal/
    //    refund/revocation events) and the signed renewal info.
    let tx = null;
    if (data?.signedTransactionInfo) {
      try {
        tx = await verifySignedJws(data.signedTransactionInfo);
      } catch (error) {
        console.error('[appleServerNotifications] transaction verification failed:', error?.message || error);
      }
    }
    let renewal = null;
    if (data?.signedRenewalInfo) {
      try {
        renewal = await verifySignedJws(data.signedRenewalInfo);
      } catch (error) {
        console.error('[appleServerNotifications] renewal verification failed:', error?.message || error);
      }
    }

    const originalTransactionId = String(
      tx?.originalTransactionId || renewal?.originalTransactionId || '',
    );
    const productId = String(tx?.productId || renewal?.productId || '');
    const transactionId = String(tx?.transactionId || '');
    const def = resolveAppleProduct(productId);
    const periodStart = tx?.purchaseDate ? new Date(tx.purchaseDate).toISOString() : null;
    const periodEnd = tx?.expiresDate ? new Date(tx.expiresDate).toISOString() : null;
    const autoRenewStatus = typeof renewal?.autoRenewStatus === 'number'
      ? renewal.autoRenewStatus === 1
      : null;

    // 3. Resolve the Joba24 user from the subscription identity.
    const userId = await resolveUserIdFromOriginalTransaction(base44, originalTransactionId);

    if (!userId) {
      // Unlinked: the subscription is not (yet) associated with any Joba24 user.
      // Record it so it can be reconciled, but never invent a grant.
      log('unlinked_subscription', { product_id: productId, original_transaction_id: originalTransactionId });
      if (productId) {
        await base44.asServiceRole.entities.IosPurchase.create({
          user_id: 'unknown',
          product_id: productId,
          credits: 0,
          status: 'failed_product_mapping',
          verification_stage: 'unlinked_subscription',
          error_category: 'no_user_for_original_transaction',
          original_transaction_id: originalTransactionId,
          environment,
          product_type: def?.type || 'subscription',
          first_seen_source: 'notification',
          last_source: 'notification',
          notification_type: notificationType,
          credits_intended: 0,
          credits_granted: 0,
          last_verified_at: new Date().toISOString(),
          attempt_count: 1,
        }).catch(() => {});
      }
      return Response.json({ ok: true, handled: false, reason: 'unlinked' });
    }

    const base = {
      userId,
      productId,
      originalTransactionId,
      environment,
      creditsPerPeriod: def?.credits || 0,
      periodStart,
      periodEnd,
      notificationType,
    };

    // 4. Paid-period events → the SAME authoritative pipeline (grants once per
    //    Apple transaction; a repeated notification for the same renewal = +0).
    if (GRANTING_NOTIFICATION_TYPES.has(notificationType)) {
      if (!tx) {
        log('granting_type_without_transaction', { product_id: productId });
        return Response.json({ ok: true, handled: false, reason: 'no_transaction' });
      }
      const result = await processAppleTransaction(base44, {
        userId,
        tx,
        environment,
        source: 'notification',
        notificationType,
      });
      log('processed_granting_event', {
        transaction_id: transactionId, credits_granted: result.credits_granted,
        duplicate: result.duplicate, stage: result.stage,
      });
      return Response.json({ ok: true, handled: true, credits_granted: result.credits_granted, duplicate: result.duplicate });
    }

    // 5. State-only events → entitlement state changes, NO credit movement.
    let status = null;
    if (notificationType === 'DID_FAIL_TO_RENEW') {
      status = subtype === 'GRACE_PERIOD' ? 'grace_period' : 'billing_issue';
    } else if (notificationType === 'GRACE_PERIOD_EXPIRED') {
      status = 'expired';
    } else if (notificationType === 'EXPIRED') {
      status = 'expired';
    } else if (notificationType === 'DID_CHANGE_RENEWAL_STATUS') {
      status = subtype === 'AUTO_RENEW_DISABLED' ? 'cancelled_active' : 'active';
    } else if (notificationType === 'REFUND') {
      status = 'refunded';
    } else if (notificationType === 'REVOKE') {
      status = 'revoked';
    } else if (notificationType === 'DID_CHANGE_RENEWAL_PREF') {
      status = 'active'; // plan change — no credit movement
    }

    if (!status) {
      log('ignored_notification_type');
      return Response.json({ ok: true, handled: false, reason: 'ignored_type' });
    }

    await applySubscriptionStateOnly(base44, {
      ...base,
      latestTransactionId: transactionId || null,
      status,
      autoRenewStatus: status === 'cancelled_active' ? false
        : status === 'active' ? true
          : autoRenewStatus,
    });
    log('applied_state_only', { status });

    return Response.json({ ok: true, handled: true, status });
  } catch (error) {
    // Never let an internal error make Apple retry indefinitely with a 5xx on
    // an event we already understood; log loudly and acknowledge.
    console.error('[appleServerNotifications] processing error:', error?.message || error);
    log('processing_error', { error: String(error?.message || 'unknown').slice(0, 140) });
    return Response.json({ ok: true, handled: false, reason: 'internal_error' });
  }
});