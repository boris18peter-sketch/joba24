import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { base44 } from '@/api/base44Client';
import { Loader2, CreditCard, Lock, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const stripeCache = {};

function CheckoutForm({ task, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => { onSuccess?.(); onClose?.(); }, 2000);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <CheckCircle2 size={52} color="#16a34a" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 20, fontWeight: 900, color: '#166534', marginBottom: 8 }}>התשלום עבר בהצלחה! 🎉</div>
        <div style={{ fontSize: 14, color: '#15803d' }}>הכסף מוחזק בנאמנות עד סיום המשימה</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px' }}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          marginTop: 20, width: '100%', height: 52, borderRadius: 16,
          background: loading ? '#93c5fd' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
          border: 'none', color: 'white', fontWeight: 900, fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <><Lock size={16} /> שלם ₪{task.price}</>}
      </button>
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Lock size={11} /> מאובטח על ידי Stripe
      </div>
    </form>
  );
}

export default function StripePaymentSheet({ task, onClose, onSuccess }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions.invoke('stripeCreatePayment', { taskId: task.id })
      .then(res => {
        const data = res.data;
        setClientSecret(data.clientSecret);
        setInfo(data);
        if (data.publishableKey) {
          if (!stripeCache[data.publishableKey]) {
            stripeCache[data.publishableKey] = loadStripe(data.publishableKey);
          }
          setStripePromise(stripeCache[data.publishableKey]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [task.id]);

  return (
    <div dir="rtl" className="mobile-sheet-overlay">
      <div className="mobile-sheet" style={{ width: '100%', maxWidth: 480 }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} color="#1a6fd4" />
            <span style={{ fontWeight: 900, fontSize: 16, color: '#0f2b6b' }}>תשלום עבור הג'ובה</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#888" />
          </button>
        </div>

        {/* Task summary */}
        <div style={{ margin: '0 20px 16px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontWeight: 800, color: '#0f2b6b', fontSize: 14, marginBottom: 6 }}>{task.title}</div>
          {info && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                <span>סכום לתשלום</span><span style={{ fontWeight: 700 }}>₪{info.amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                <span>עמלת שירות</span><span style={{ fontWeight: 700 }}>₪{info.platformFee?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#16a34a', borderTop: '1px solid #bfdbfe', paddingTop: 6, marginTop: 2 }}>
                <span style={{ fontWeight: 700 }}>העובד מקבל</span>
                <span style={{ fontWeight: 900 }}>₪{info.workerReceives?.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Loader2 size={28} className="animate-spin" style={{ color: '#1a6fd4', margin: '0 auto' }} />
          </div>
        )}
        {error && (
          <div style={{ margin: '0 20px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
            שגיאה: {error}
          </div>
        )}
        {clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#1a6fd4', borderRadius: '12px', fontFamily: 'Inter, sans-serif' } } }}>
            <CheckoutForm task={task} onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        )}
      </div>
    </div>
  );
}