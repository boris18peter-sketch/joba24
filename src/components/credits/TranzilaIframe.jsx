import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

/**
 * TranzilaIframe — Full-screen payment modal using Tranzila's iFrame.
 *
 * CREDIT-GRANTING MECHANISM:
 *   1. PRIMARY: Tranzila redirects the iframe to /tranzila-callback.html after payment.
 *      That page reads the transaction result params and postMessages them to us.
 *      We then call verifyTranzilaPayment to grant credits.
 *   2. FALLBACK: We also poll checkTranzilaPayment every 3s in case the webhook
 *      (notify_url) fires and updates the payment status server-side.
 *
 * Props:
 *   supplier      — Tranzila terminal name (joba24)
 *   sum           — Payment amount
 *   paymentId     — TranzilaPayment record ID
 *   isSubscription — Whether this is a recurring subscription
 *   pkg           — Package object { credits, price, id }
 *   onClose       — Called when user closes
 *   onSuccess     — Called when payment confirmed completed
 */
export default function TranzilaIframe({ supplier, sum, paymentId, isSubscription, pkg, onClose, onSuccess }) {
  const formRef = useRef(null);
  const pollRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const processedRef = useRef(false);

  // App origin — used for both notify_url (webhook) and u71 (redirect)
  const appOrigin = appParams.appBaseUrl || window.location.origin;

  // Notify URL — Tranzila POSTs transaction result here (server-to-server).
  // Kept as a fallback in case it works.
  const notifyUrl = `${appOrigin}/functions/tranzilaNotify?payment_id=${paymentId}`;

  // Redirect URL — Tranzila redirects the iframe here after payment (browser).
  // This is the PRIMARY mechanism. Uses our static callback page.
  const redirectUrl = `${appOrigin}/tranzila-callback.html?payment_id=${paymentId}`;

  // Submit the hidden form INTO the iframe once mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formRef.current) {
        formRef.current.submit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // PRIMARY: Listen for postMessage from tranzila-callback.html
  useEffect(() => {
    const handleMessage = async (event) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin && event.origin !== appOrigin) return;

      const data = event.data;
      if (!data || data.source !== 'tranzila-callback') return;
      if (processedRef.current) return;
      processedRef.current = true;

      const params = data.params || {};
      const responseCode = params['Response'] || '';
      const index = params['index'] || '';
      const token = params['TranzilaTK'] || '';

      try {
        const res = await base44.functions.invoke('verifyTranzilaPayment', {
          payment_id: paymentId,
          response_code: responseCode,
          index,
          token,
        });

        if (res.data?.success) {
          if (pollRef.current) clearInterval(pollRef.current);
          onSuccess();
        } else {
          if (pollRef.current) clearInterval(pollRef.current);
          onClose();
        }
      } catch (err) {
        console.error('verifyTranzilaPayment failed:', err);
        // Don't close — let the user try again or close manually
        processedRef.current = false;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [paymentId, onSuccess, onClose, appOrigin]);

  // FALLBACK: Poll payment status every 3 seconds (in case webhook fires)
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await base44.functions.invoke('checkTranzilaPayment', { payment_id: paymentId });
        const status = res.data?.status;
        if (status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (!processedRef.current) {
            processedRef.current = true;
            onSuccess();
          }
        } else if (status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (!processedRef.current) {
            processedRef.current = true;
            onClose();
          }
        }
      } catch {
        // ignore polling errors — will retry
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [paymentId, onSuccess, onClose]);

  const iframeUrl = `https://directng.tranzila.com/${encodeURIComponent(supplier)}/iframenew.php`;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'var(--surface-1)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--border-1)',
        background: 'var(--surface-2)', flexShrink: 0,
        paddingTop: 'max(10px, env(safe-area-inset-top))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="#1a6fd4" />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>
            תשלום מאובטח · Tranzila
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 10, background: 'var(--surface-3)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <X size={18} color="var(--text-3)" />
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, top: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-1)', zIndex: 1,
        }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" color="#1a6fd4" />
            <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-2)', fontWeight: 600 }}>
              טוען טופס תשלום...
            </div>
          </div>
        </div>
      )}

      {/*
        Hidden form that POSTs directly into the iframe.
        action = https://direct.tranzila.com/[supplier]/iframenew.php
        target = the iframe name.
      */}
      <form
        ref={formRef}
        action={iframeUrl}
        method="POST"
        target="tranzila-frame"
        style={{ display: 'none' }}
        autoComplete="off"
      >
        {/* Core payment fields */}
        <input type="hidden" name="sum" value={sum} />
        <input type="hidden" name="currency" value="1" />
        <input type="hidden" name="cred_type" value="1" />
        <input type="hidden" name="tranmode" value="A" />
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="pdesc" value={`קרדיטים Joba24${pkg ? ` — ${pkg.credits} קרדיטים` : ''}`} />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="accessibility" value="2" />

        {/* Notify URL — Tranzila POSTs transaction result here (server-to-server fallback) */}
        <input type="hidden" name="notify_url" value={notifyUrl} />

        {/* Redirect URLs — PRIMARY mechanism.
            Tranzila redirects the iframe to our callback page after payment.
            The callback page reads params and postMessages them to us. */}
        <input type="hidden" name="u71" value={redirectUrl} />
        <input type="hidden" name="u72" value={redirectUrl} />

        {/* Subscription: recurring monthly charge */}
        {isSubscription && (
          <>
            <input type="hidden" name="recur_transaction" value="4_approved" />
            <input type="hidden" name="recur_sum" value={sum} />
          </>
        )}
      </form>

      {/* The actual Tranzila iframe */}
      <iframe
        name="tranzila-frame"
        id="tranzila-frame"
        onLoad={() => setLoading(false)}
        allow="payment *"
        allowPaymentRequest={true}
        style={{ width: '100%', flex: 1, border: 'none' }}
        title="Tranzila Payment"
      />
    </div>,
    document.body
  );
}