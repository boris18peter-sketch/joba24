import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifySignedJws } from '../../shared/appleVerify.ts';
import { processAppleTransaction } from '../../shared/appleEntitlement.ts';

/**
 * verifyIosPurchase — the DEVICE-facing Apple verification endpoint.
 *
 * This function is intentionally thin: it authenticates the caller, verifies
 * Apple's signature on-chain, and hands the verified transaction to the single
 * authoritative pipeline in base44/shared/appleEntitlement.ts. It contains NO
 * crediting logic of its own, so the purchase path, recovery, the StoreKit
 * observer, subscription sync and Restore Purchases all behave identically.
 *
 * The JWS is verified with ZERO Apple secrets (leaf → intermediate → pinned
 * Apple Root CA - G3 chain, then the ES256 signature over the payload).
 *
 * Input:   { jws, source? }   source: purchase | recovery | observer | sync | restore
 * Returns: { success, duplicate, credits_granted, new_balance, stage, ... }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jws, source } = body || {};
    if (!jws || typeof jws !== 'string') {
      return Response.json({ error: 'Missing jws' }, { status: 400 });
    }

    // Callers may only claim the device-side sources they actually are.
    const allowedSources = new Set(['purchase', 'recovery', 'observer', 'sync', 'restore']);
    const callerSource = allowedSources.has(source) ? source : 'purchase';

    // 1. Verify Apple's signature + certificate chain.
    let tx;
    try {
      tx = await verifySignedJws(jws);
    } catch (error) {
      // Record the failure so "we received it but could not verify it" is
      // distinguishable from "it never reached us".
      console.error('❌ verifyIosPurchase: JWS verification failed:', error?.message || error);
      await base44.asServiceRole.entities.IosPurchase.create({
        user_id: user.id,
        product_id: 'unknown',
        credits: 0,
        status: 'failed_verification',
        verification_stage: 'verify_jws',
        error_category: String(error?.message || 'unknown').slice(0, 140),
        first_seen_source: callerSource,
        last_source: callerSource,
        last_verified_at: new Date().toISOString(),
        attempt_count: 1,
      }).catch(() => {});
      return Response.json({ success: false, error: 'Verification failed', stage: 'verify_jws' }, { status: 400 });
    }

    // 2. Everything else is the shared pipeline.
    const result = await processAppleTransaction(base44, {
      userId: user.id,
      tx,
      environment: tx.environment,
      source: callerSource,
    });

    return Response.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('❌ verifyIosPurchase error:', error?.message || error);
    return Response.json({ success: false, error: 'Unexpected error', stage: 'unhandled' }, { status: 400 });
  }
});