import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * TranzilaIframe — Full-screen modal that loads the Tranzila payment iframe.
 * Polls the payment status via checkTranzilaPayment until completed or failed.
 *
 * Props:
 *   thtk        — Tranzila handshake token
 *   supplier    — Tranzila terminal name
 *   sum         — Payment amount
 *   paymentId   — TranzilaPayment record ID (for polling)
 *   onClose     — Called when user closes the modal
 *   onSuccess   — Called when payment is confirmed completed
 */
export default function TranzilaIframe({ thtk, supplier, sum, paymentId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const notifyUrl = `${window.location.origin}/api/tranzilaNotify`;
  const successUrl = `${window.location.origin}/payment-success`;
  const failUrl = `${window.location.origin}/payment-failed`;

  const tranzilaUrl =
    `https://direct.tranzila.com/iframe.php` +
    `?supplier=${encodeURIComponent(supplier)}` +
    `&thtk=${encodeURIComponent(thtk)}` +
    `&sum=${sum}` +
    `&currency=1` +
    `&notify_url=${encodeURIComponent(notifyUrl)}` +
    `&success_url=${encodeURIComponent(successUrl)}` +
    `&fail_url=${encodeURIComponent(failUrl)}` +
    `&pdesc=${encodeURIComponent('קרדיטים Joba24')}`;

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

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId, onSuccess, onClose]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'var(--surface-1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--surface-2)',
          flexShrink: 0,
          paddingTop: 'max(10px, env(safe-area-inset-top))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="#1a6fd4" />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>
            תשלום מאובטח · Tranzila
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--surface-3)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} color="var(--text-3)" />
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            top: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-1)',
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" color="#1a6fd4" />
            <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-2)', fontWeight: 600 }}>
              טוען טופס תשלום...
            </div>
          </div>
        </div>
      )}

      {/* Tranzila iframe */}
      <iframe
        src={tranzilaUrl}
        onLoad={() => setLoading(false)}
        style={{ width: '100%', flex: 1, border: 'none' }}
        title="Tranzila Payment"
        allow="payment"
      />
    </div>,
    document.body
  );
}