import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * TranzilaIframe — Full-screen payment modal using Tranzila's iFrame.
 *
 * Per official Tranzila Base44 guide:
 * - Base URL: https://direct.tranzila.com/[supplier]/iframenew.php
 * - Method: POST (via a hidden HTML form that targets the iframe)
 * - One-time: cred_type=1, tranmode=A, new_process=1
 * - Subscription: cred_type=1, tranmode=A, new_process=1, recur_transaction=4, recur_payments, recur_sum
 *
 * Props:
 *   thtk          — Tranzila handshake token
 *   supplier      — Tranzila terminal name (Joba24)
 *   sum           — Payment amount
 *   paymentId     — TranzilaPayment record ID (for polling)
 *   isSubscription — Whether this is a recurring subscription
 *   pkg           — Package object { credits, price, id }
 *   onClose       — Called when user closes
 *   onSuccess     — Called when payment confirmed completed
 */
export default function TranzilaIframe({ thtk, supplier, sum, paymentId, isSubscription, pkg, onClose, onSuccess }) {
  const formRef = useRef(null);
  const iframeRef = useRef(null);
  const pollRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Submit the hidden form INTO the iframe once mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formRef.current) {
        formRef.current.submit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Poll payment status every 3 seconds
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await base44.functions.invoke('checkTranzilaPayment', { payment_id: paymentId });
        const status = res.data?.status;
        if (status === 'completed') {
          clearInterval(pollRef.current);
          onSuccess();
        } else if (status === 'failed') {
          clearInterval(pollRef.current);
          onClose();
        }
      } catch {
        // ignore polling errors — will retry
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [paymentId, onSuccess, onClose]);

  const iframeUrl = `https://direct.tranzila.com/${encodeURIComponent(supplier)}/iframenew.php`;

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
        Per official guide: action = https://direct.tranzila.com/[supplier]/iframenew.php
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
        {/* Required core fields */}
        <input type="hidden" name="sum" value={sum} />
        <input type="hidden" name="currency" value="1" />
        <input type="hidden" name="cred_type" value="1" />
        <input type="hidden" name="tranmode" value="A" />
        <input type="hidden" name="new_process" value="1" />
        <input type="hidden" name="thtk" value={thtk} />
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="buttonLabel" value="שלם עכשיו" />
        <input type="hidden" name="pdesc" value={`קרדיטים Joba24${pkg ? ` — ${pkg.credits} קרדיטים` : ''}`} />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="accessibility" value="2" />

        {/* Subscription-specific fields */}
        {isSubscription && (
          <>
            {/* recur_transaction=4 = monthly, not customer choice */}
            <input type="hidden" name="recur_transaction" value="4_approved" />
            {/* recur_sum = same as initial sum (monthly charge) */}
            <input type="hidden" name="recur_sum" value={sum} />
            {/* No recur_payments = unlimited until cancelled */}
          </>
        )}
      </form>

      {/* The actual Tranzila iframe */}
      <iframe
        ref={iframeRef}
        name="tranzila-frame"
        id="tranzila-frame"
        onLoad={() => setLoading(false)}
        allowPaymentRequest={true}
        style={{ width: '100%', flex: 1, border: 'none' }}
        title="Tranzila Payment"
      />
    </div>,
    document.body
  );
}