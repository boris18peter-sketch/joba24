import { useState } from 'react';
import { ArrowRight, CreditCard, Shield, Lock, RefreshCw, Smartphone, Check } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';

const PAYMENT_METHODS = [
  { id: 'card', label: 'כרטיס אשראי', icon: 'card' },
  { id: 'bit', label: 'Bit', icon: 'bit' },
  { id: 'paypal', label: 'PayPal', icon: 'paypal' },
  { id: 'apple', label: 'Apple Pay', icon: 'apple' },
  { id: 'google', label: 'Google Pay', icon: 'google' },
  { id: 'phone', label: 'חיוב סלולרי', icon: 'phone' },
];

function MethodIcon({ type }) {
  switch (type) {
    case 'card':
      return <CreditCard size={16} />;
    case 'bit':
      return <span style={{ fontSize: 14, fontWeight: 900, color: '#0055a5', letterSpacing: 0.5 }}>Bit</span>;
    case 'paypal':
      return <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-2)', letterSpacing: 0.3 }}>Pay<span style={{ color: '#003087' }}>Pal</span></span>;
    case 'apple':
      return <span style={{ fontSize: 14, fontWeight: 800 }}> Apple Pay</span>;
    case 'google':
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'conic-gradient(from 0deg, #4285f4, #34a853, #fbbc05, #ea4335, #4285f4)', display: 'inline-block', flexShrink: 0 }} />
          G Pay
        </span>
      );
    case 'phone':
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}>
          <Smartphone size={15} /> סלולרי
        </span>
      );
    default:
      return null;
  }
}

export default function PaymentConfirm({ pkg, isSubscription, onBack, onConfirm, loading }) {
  const [payMethod, setPayMethod] = useState('card');

  return (
    <div style={{ padding: '8px 20px 0' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
          padding: 0, marginBottom: 16,
        }}
      >
        <ArrowRight size={15} /> חזרה לחבילות
      </button>

      {/* Summary card */}
      <div style={{
        background: 'var(--surface-3)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 18px',
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
        }}>
          {isSubscription ? 'המנוי שנבחר' : 'החבילה שנבחרה'}
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, color: 'var(--brand-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          marginBottom: 6,
        }}>
          {pkg.credits}
          <CreditIcon size={24} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          {isSubscription ? 'קרדיטים שיתווספו מדי חודש' : 'קרדיטים שיתווספו לארנק'}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)', borderRadius: 99,
          padding: '6px 18px',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>מחיר סופי</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>
            ₪{pkg.price.toFixed(2)}
          </span>
          {isSubscription && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/חודש</span>
          )}
        </div>
      </div>

      {/* Subscription explanation */}
      {isSubscription && (
        <div style={{
          background: 'var(--brand-primary-light)',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--r-md)',
          padding: '14px 16px',
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: 'var(--brand-primary)',
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <RefreshCw size={14} /> איך עובד המנוי החודשי?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>•</span>
              <span>עכשיו תחויב <strong style={{ color: 'var(--text-1)' }}>₪{pkg.price.toFixed(2)}</strong> עבור החודש הנוכחי והקרדיטים יתווספו מיד</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>•</span>
              <span>בכל חודש תחויב אוטומטית <strong style={{ color: 'var(--text-1)' }}>₪{pkg.price.toFixed(2)}</strong> והקרדיטים יתווספו לארנק</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>•</span>
              <span>ניתן לבטל את המנוי בכל עת מהגדרות החשבון</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment methods — clickable selection */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
        בחר אמצעי תשלום
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8, marginBottom: 12,
      }}>
        {PAYMENT_METHODS.map((method) => {
          const selected = payMethod === method.id;
          return (
            <button
              key={method.id}
              onClick={() => setPayMethod(method.id)}
              style={{
                height: 52, borderRadius: 'var(--r-md)',
                border: selected
                  ? '2px solid var(--brand-primary)'
                  : '1.5px solid var(--border-1)',
                background: selected ? 'var(--brand-primary-light)' : 'var(--surface-2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 12, fontWeight: 700,
                color: selected ? 'var(--brand-primary)' : 'var(--text-2)',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              <MethodIcon type={method.icon} />
              {selected && (
                <span style={{
                  position: 'absolute', top: 4, left: 4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--brand-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={10} color="white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', fontWeight: 600,
        marginBottom: 20, textAlign: 'center',
      }}>
        תועבר/י לעמוד התשלום המאובטח של Tranzila להשלמת הרכישה
      </div>

      {/* Confirm button */}
      <button
        onClick={() => onConfirm(payMethod)}
        disabled={loading}
        style={{
          width: '100%', height: 54, borderRadius: 'var(--r-md)',
          background: loading
            ? 'var(--border-1)'
            : 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))',
          color: 'white', fontWeight: 900, fontSize: 15,
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: loading ? 'none' : '0 4px 20px rgba(26,111,212,0.3)',
          marginBottom: 12,
        }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Shield size={17} />
            המשך לתשלום · ₪{pkg.price.toFixed(2)}
          </>
        )}
      </button>

      {/* Trust line */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontSize: 11, color: 'var(--text-3)', marginBottom: 8,
      }}>
        <Lock size={11} />
        רכישה מאובטחת SSL · ניתן לבטל מנוי בכל עת
      </div>

      <div style={{
        fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}>
        בלחיצה על כפתור התשלום אתה מאשר את תנאי השימוש ומדיניות הפרטיות של Joba24
      </div>
    </div>
  );
}