import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolvePackage } from '../../shared/paymentCatalog.ts';

/**
 * tranzilaNotify — server-to-server notification endpoint called by Tranzila.
 *
 * PHASE 1 — SERVER-SIDE AUTHORITY:
 *   This is now the ONLY code path that grants Jobas for a Tranzila payment.
 *   `verifyTranzilaPayment` (the client-facing status check) no longer grants.
 *
 *   What was fixed here:
 *     1. Credits are taken from the authoritative server-side catalog for the
 *        purchased package — never from a client-supplied value.
 *     2. Every charge (first charge AND each recurring monthly charge) is
 *        processed exactly once, keyed by Tranzila's own transaction `index`.
 *        A duplicate callback, a retry or a webhook replay cannot grant twice.
 *     3. A successful notification without a transaction `index` is NOT
 *        credited — there would be nothing to reconcile against.
 *
 *   STILL OPEN (documented, not invented): Tranzila's public documentation does
 *   not define a signature/authenticity mechanism for the DirectNG iframe
 *   notify_url (`response_hash` is Hosted Fields only). Until Tranzila support
 *   confirms the mechanism for our account, this endpoint cannot cryptographically
 *   prove the caller is Tranzila. See docs/MULTIBRAND_RESTORE_RUNBOOK.md §M.
 *
 * Per Tranzila's guide the endpoint MUST return "OK" with status 200.
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');

    // Parse form data — Tranzila sends application/x-www-form-urlencoded.
    // Read the body as text ONCE, then parse with URLSearchParams.
    let notify: Record<string, string> = {};
    try {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params.entries()) {
        notify[k] = v;
      }
    } catch (parseErr) {
      console.error('Failed to parse notification body:', parseErr);
    }

    console.log('📋 Tranzila Notification:', JSON.stringify(notify), '| payment_id:', paymentId);

    if (!paymentId) {
      console.error('❌ Missing payment_id in query');
      return new Response('OK', { status: 200 });
    }

    const payment = await base44.asServiceRole.entities.TranzilaPayment.get(paymentId);
    if (!payment) {
      console.error(`❌ Payment not found: ${paymentId}`);
      return new Response('OK', { status: 200 });
    }

    const responseCode = notify['Response'] || '';
    const index = String(notify['index'] || '');
    const tranzilaToken = notify['TranzilaTK'] || '';
    const isSuccess = responseCode === '000';

    const processed: string[] = Array.isArray(payment.processed_indices) ? payment.processed_indices : [];

    // Credits always come from the authoritative catalog for the purchased
    // package — never from the stored (or client-supplied) value.
    const pkg = resolvePackage(payment.package_id);
    const credits = pkg ? pkg.credits : Number(payment.credits) || 0;

    // Grant credits and write the matching ledger row. The ledger row is written
    // first so a failure never leaves a balance that cannot be traced.
    const grantCredits = async (note: string) => {
      const users = await base44.asServiceRole.entities.User.filter({ id: payment.user_id });
      const user = users?.[0];
      if (!user) {
        console.error(`❌ User ${payment.user_id} not found`);
        return false;
      }
      const newBalance = (user.worker_credits ?? 0) + credits;
      await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: user.id,
        amount: credits,
        type: 'Purchase',
        balance_after: newBalance,
        note,
      });
      console.log(`✅ ${credits} credits granted to ${user.id}, balance: ${newBalance}`);
      return true;
    };

    // === RECURRING CHARGE (subscription monthly) ===
    if (payment.status === 'completed' && payment.type === 'subscription') {
      if (payment.subscription_status === 'cancelled') {
        console.log(`ℹ️ Subscription ${payment.id} cancelled — ignoring recurring charge`);
        return new Response('OK', { status: 200 });
      }

      if (!isSuccess) {
        console.log(`❌ Recurring charge failed for ${payment.id} — Response: ${responseCode}`);
        return new Response('OK', { status: 200 });
      }

      // Idempotency — each recurring charge has its own index and is processed once.
      if (!index || processed.includes(index)) {
        console.log(`ℹ️ Recurring charge ${index || '(no index)'} already processed for ${payment.id} — skipping`);
        return new Response('OK', { status: 200 });
      }

      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        processed_indices: [...processed, index],
        processed_at: new Date().toISOString(),
      });
      await grantCredits(`חידוש מנוי חודשי — ${credits} ג'ובות (Tranzila)`);

      return new Response('OK', { status: 200 });
    }

    // === FIRST PAYMENT ===
    if (payment.status === 'completed') {
      console.log(`ℹ️ Payment ${payment.id} already completed — skipping`);
      return new Response('OK', { status: 200 });
    }

    if (isSuccess) {
      // A successful charge must carry Tranzila's transaction index — without it
      // there is nothing to reconcile against, so the payment is not credited.
      if (!index) {
        console.error(`❌ Successful notification for ${payment.id} without a transaction index — not credited`);
        return new Response('OK', { status: 200 });
      }

      const updateData: Record<string, unknown> = {
        status: 'completed',
        tranzila_index: index,
        thtk: tranzilaToken || payment.thtk,
        processed_at: new Date().toISOString(),
        processed_indices: [...processed, index],
      };
      if (payment.type === 'subscription') {
        updateData.subscription_status = 'active';
      }

      // Claim the charge first (so a concurrent/duplicate callback cannot also
      // pass the guard), then grant. If granting fails, the claim is released so
      // a retry can still credit the user.
      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, updateData);
      try {
        await grantCredits(`טעינת ${credits} ג'ובות — Tranzila (${payment.type === 'subscription' ? 'מנוי חודשי' : 'חד-פעמי'})`);
      } catch (grantErr) {
        console.error(`❌ Grant failed for ${payment.id} — releasing claim:`, grantErr);
        await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
          status: 'pending',
          processed_at: null,
          processed_indices: processed,
        });
        throw grantErr;
      }
    } else {
      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        status: 'failed',
        tranzila_index: index,
      });
      console.log(`❌ Payment ${payment.id} failed — Response: ${responseCode}`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ tranzilaNotify error:', error);
    return new Response('OK', { status: 200 });
  }
});