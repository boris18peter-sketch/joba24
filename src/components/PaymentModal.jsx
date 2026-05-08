import { useState } from 'react';
import { Lock, CreditCard, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

export default function PaymentModal({ taskPrice, onSuccess, onClose }) {
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const fee = Math.round(taskPrice * 0.03);

  const validate = () => {
    const digits = card.number.replace(/\s/g, '');
    if (digits.length < 16) return 'מספר כרטיס לא תקין';
    if (!card.name.trim()) return 'נא להזין שם בעל הכרטיס';
    const [m, y] = card.expiry.split('/');
    if (!m || !y || isNaN(m) || isNaN(y) || Number(m) < 1 || Number(m) > 12) return 'תאריך תפוגה לא תקין';
    if (card.cvv.replace(/\D/g, '').length < 3) return 'CVV לא תקין';
    return null;
  };

  const handlePay = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    // Simulate payment processing (MVP — replace with real gateway)
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setDone(true);
    setTimeout(() => onSuccess(), 1800);
  };

  if (done) {
    return (
      <div style={overlay}>
        <div style={sheet}>
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={36} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f2b6b', marginBottom: 8 }}>✅ התשלום הופקד בהצלחה</h2>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>המשימה שלך עכשיו פעילה<br />ועובדים יוכלו לראות ולהגיש בקשה</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={sheet}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Lock size={18} color="#1a6fd4" />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0f2b6b', margin: 0 }}>תשלום מאובטח</h2>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>הכסף יוחזק עד לאישור השלמת המשימה</p>
          </div>
        </div>

        {/* Amount summary */}
        <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', borderRadius: 16, padding: '14px 18px', marginBottom: 20, color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.75 }}>תשלום עבור המשימה</span>
            <span style={{ fontSize: 24, fontWeight: 900 }}>₪{taskPrice}</span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
            עמלת ביטול: ₪{fee} (3%) · הכסף משוחרר רק לאחר אישורך
          </div>
        </div>

        {/* Card form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>מספר כרטיס</label>
            <div style={{ position: 'relative' }}>
              <CreditCard size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={card.number}
                onChange={e => setCard(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                style={{ ...inputStyle, paddingRight: 36, letterSpacing: 2, fontWeight: 700 }}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>שם בעל הכרטיס</label>
            <input
              placeholder="Israel Israeli"
              value={card.name}
              onChange={e => setCard(p => ({ ...p, name: e.target.value }))}
              style={{ ...inputStyle }}
              dir="ltr"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>תוקף</label>
              <input
                inputMode="numeric"
                placeholder="MM/YY"
                value={card.expiry}
                onChange={e => setCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: 2 }}
                dir="ltr"
              />
            </div>
            <div>
              <label style={labelStyle}>CVV</label>
              <input
                inputMode="numeric"
                placeholder="•••"
                value={card.cvv}
                onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: 4 }}
                dir="ltr"
                type="password"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Trust text */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'flex-start', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px' }}>
          <ShieldCheck size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11.5, color: '#15803d', margin: 0, lineHeight: 1.6 }}>
            🔒 התשלום מוחזק בצורה מאובטחת וישוחרר רק לאחר שתאשר את השלמת המשימה. במידה ותבטל את המשימה הסכום המלא יוחזר לחשבונך לאחר עמלה של 3%.
          </p>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading}
          style={{ marginTop: 18, width: '100%', height: 54, borderRadius: 16, fontSize: 16, fontWeight: 900, color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', boxShadow: '0 6px 20px rgba(26,111,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? <><Loader2 size={20} className="animate-spin" /> מעבד תשלום...</> : <><Lock size={16} /> שלם ₪{taskPrice} ופרסם</>}
        </button>

        <button onClick={onClose} style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: '#999', fontSize: 13, cursor: 'pointer', padding: 8 }}>
          ביטול
        </button>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(10,20,50,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};
const sheet = {
  background: 'white', borderRadius: '24px 24px 0 0',
  padding: '24px 20px 40px', width: '100%', maxWidth: 480,
  maxHeight: '95vh', overflowY: 'auto',
};
const labelStyle = { fontSize: 12, fontWeight: 700, color: '#0f2b6b', display: 'block', marginBottom: 6 };
const inputStyle = {
  width: '100%', height: 48, borderRadius: 12, border: '1.5px solid #dce8f5',
  background: '#f4f7fb', padding: '0 14px', fontSize: 15, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};