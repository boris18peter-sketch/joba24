import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolvePackage } from '../../shared/paymentCatalog.ts';

/**
 * tranzilaNotify — server-to-server notification endpoint called by Tranzila.
 *
 * PHASE 1.5 — RECOVERABLE, LEDGER-ANCHORED IDEMPOTENCY
 *
 *   The credit-ledger row (CreditTransaction) is the ONLY anchor for
 *   "this charge has been granted". It is created BEFORE the payment record is
 *   marked processed, which makes both failure directions recoverable:
 *
 *     crash AFTER the ledger row  → retry finds the row  → skips the grant (no double)
 *     crash BEFORE the ledger row → retry finds no row   → grants (paid never lost)
 *
 *   Ordering is therefore:  verify → anchor check → create ledger row
 *                           → update user balance → mark payment processed.
 *
 *   HONEST LIMITATION — NOT exactly-once:
 *   Base44 entities have no unique constraint and no multi-record transaction,
 *   so two callbacks arriving inside the same window can both pass the anchor
 *   check before either ledger row is visible. The double-check with a short
 *   settle delay narrows that window substantially but does not close it.
 *   The guarantee is AT-MOST-ONCE-ISH, not exactly-once. See
 *   docs/MULTIBRAND_RESTORE_RUNBOOK.md and the Phase 1.5 report.
 *
 *   STILL OPEN (documented, not invented): Tranzila's public documentation does
 *   not define a signature/authenticity mechanism for the DirectNG iframe
 *   notify_url (`response_hash` is Hosted Fields only). Receiving Response=000
 *   is therefore NOT by itself proof that a transaction exists at Tranzila.
 *   See §M Q2/Q3 of the runbook.
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

    // Read the body ONCE as text, then parse as form-encoded.
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
    // package — never from a stored or client-supplied value.
    const pkg = resolvePackage(payment.package_id);
    const credits = pkg ? pkg.credits : Number(payment.credits) || 0;

    // ── Ledger anchor ────────────────────────────────────────────────────────
    const findLedgerRow = async () => {
      const rows = await base44.asServiceRole.entities.CreditTransaction.filter(
        { payment_id: payment.id, provider_index: index },
        '-created_date',
        1,
      );
      return rows?.[0] ?? null;
    };

    const markProcessed = async () => {
      await base44.asServiceRole.entities.TranzilaPayment.update(payment.id, {
        status: 'completed',
        tranzila_index: index,
        thtk: tranzilaToken || payment.thtk,
        processed_at: new Date().toISOString(),
        processed_indices: processed.includes(index) ? processed : [...processed, index],
        ...(payment.type === 'subscription' ? { subscription_status: 'active' } : {}),
      });
    };

    // Grant exactly once for the charge identified by `index`.
    const grantOnce = async (note: string) => {
      if (await findLedgerRow()) {
        // Already granted — self-heal the payment flag and stop.
        await markProcessed();
        console.log(`ℹ️ Charge ${index} already granted for ${payment.id} — skipped`);
        return;
      }

      // Settle delay + re-check: narrows the concurrent-callback window.
      await new Promise((r) => setTimeout(r, 300));
      if (await findLedgerRow()) {
        await markProcessed();
        console.log(`ℹ️ Charge ${index} granted concurrently for ${payment.id} — skipped`);
        return;
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: payment.user_id });
      const user = users?.[0];
      if (!user) {
        console.error(`❌ User ${payment.user_id} not found — nothing granted`);
        return;
      }

      const newBalance = (user.worker_credits ?? 0) + credits;

      // 1. Ledger row FIRST — this is the idempotency anchor.
      await base44.asServiceRole.entities.CreditTransaction.create({
        user_id: user.id,
        amount: credits,
        type: 'Purchase',
        balance_after: newBalance,
        note,
        payment_id: payment.id,
        provider_index: index,
      });

      // 2. Balance, then 3. payment flag.
      await base44.asServiceRole.entities.User.update(user.id, { worker_credits: newBalance });
      await markProcessed();

      console.log(`✅ ${credits} credits granted to ${user.id} for charge ${index}, balance: ${newBalance}`);
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
      // Each billing period carries its own index — a renewal grants once.
      if (!index) {
        console.error(`❌ Recurring charge for ${payment.id} without a transaction index — not credited`);
        return new Response('OK', { status: 200 });
      }
      await grantOnce(`חידוש מנוי חודשי — ${credits} ג'ובות (Tranzila)`);
      return new Response('OK', { status: 200 });
    }

    // === FIRST PAYMENT ===
    if (payment.status === 'completed') {
      console.log(`ℹ️ Payment ${payment.id} already completed — skipping`);
      return new Response('OK', { status: 200 });
    }

    if (isSuccess) {
      // A successful charge must carry Tranzila's transaction index — without it
      // there is nothing to anchor idempotency on, so the payment is not credited.
      if (!index) {
        console.error(`❌ Successful notification for ${payment.id} without a transaction index — not credited`);
        return new Response('OK', { status: 200 });
      }
      await grantOnce(`טעינת ${credits} ג'ובות — Tranzila (${payment.type === 'subscription' ? 'מנוי חודשי' : 'חד-פעמי'})`);
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